import { searchAmapPoi, geocodeAddress, type AmapPoi } from '@/services/amapWebService'
import { emitTelemetry } from '@/services/telemetry'
import type { DayPlan, DaySpot, TravelPlan, TravelProfile } from '@/types/travel'

const genericKeywords = ['酒店办理入住', '市中心漫步', '晚餐', '特色餐饮', '夜景区', '主题街区', '特色体验', '休闲餐酒吧', '在地社区', '咖啡馆', '公园或海滨步道', '备选景点', '购物区', '酒店休整', '周边目的地', '在地午餐', '返回市区', '最后采买', '返程交通', '行程复盘']

const isGenericSpot = (spot: DaySpot, destination: string) =>
  typeof spot.lng !== 'number' ||
  typeof spot.lat !== 'number' ||
  genericKeywords.some((keyword) => spot.name.includes(keyword)) ||
  spot.name.startsWith(destination)

const dedupePoi = (pois: AmapPoi[]) => {
  const seen = new Set<string>()
  return pois.filter((poi) => {
    const key = `${poi.name}-${poi.address}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const toRadians = (value: number) => (value * Math.PI) / 180

const distanceKm = (left: [number, number], right: [number, number]) => {
  const earthRadiusKm = 6371
  const dLat = toRadians(right[1] - left[1])
  const dLng = toRadians(right[0] - left[0])
  const lat1 = toRadians(left[1])
  const lat2 = toRadians(right[1])
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2)
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const inferPlanningCity = async (destination: string, profile: TravelProfile) => {
  const samplingKeywords = [
    `${destination} ${profile.destinationIntent || profile.travelStyle[0] || '热门景点'}`,
    `${destination} 热门景点`,
    `${destination} ${profile.accommodationPreference || '酒店'}`,
  ]
  const cityScore = new Map<string, number>()

  for (const keywords of samplingKeywords) {
    const pois = await searchAmapPoi({ keywords, city: destination, limit: 6 })
    pois.forEach((poi, index) => {
      const city = (poi.cityname || poi.adname || '').trim()
      if (!city) return
      const weight = Math.max(1, 8 - index)
      cityScore.set(city, (cityScore.get(city) || 0) + weight)
    })
  }

  const best = Array.from(cityScore.entries()).sort((a, b) => b[1] - a[1])[0]?.[0]
  return best || destination
}

const chooseTypes = (spot: DaySpot) => {
  if (spot.type === '景点') return '110000'
  if (spot.type === '餐饮') return '050000'
  if (spot.type === '酒店') return '100000'
  return '150700|150701|150702'
}

const buildKeywords = (destination: string, spot: DaySpot, profile: TravelProfile, dayPlan: DayPlan) => {
  if (spot.type === '酒店') return `${destination} ${profile.accommodationPreference || '酒店'}`
  if (spot.type === '餐饮') return `${destination} ${profile.travelStyle.includes('美食') ? '特色餐厅' : '热门餐厅'}`
  if (spot.type === '交通') {
    if (profile.transportPreference.includes('飞机')) return `${destination} 机场`
    if (profile.transportPreference.includes('高铁')) return `${destination} 高铁站`
    return `${destination} 交通枢纽`
  }
  const interest = profile.destinationIntent || profile.travelStyle[0] || dayPlan.title || '热门景点'
  return `${destination} ${interest}`
}

const replaceSpot = (spot: DaySpot, poi: AmapPoi): DaySpot => {
  const [lng, lat] = poi.location || []
  return {
    ...spot,
    name: poi.name || spot.name,
    address: poi.address || spot.address,
    note: poi.address ? `${spot.note} 建议优先前往 ${poi.address} 一带。` : spot.note,
    lng: typeof lng === 'number' ? lng : spot.lng,
    lat: typeof lat === 'number' ? lat : spot.lat,
  }
}

const chooseBestPoi = (options: {
  pois: AmapPoi[]
  usedPoiIds: Set<string>
  previousPoint?: [number, number] | null
  destinationCenter?: [number, number] | null
  maxRadiusKm: number
}) => {
  const candidates = options.pois.filter((poi) => poi.location && !options.usedPoiIds.has(poi.id))
  const nearby = candidates.filter((poi) => {
    if (!options.destinationCenter || !poi.location) return true
    return distanceKm(poi.location, options.destinationCenter) <= options.maxRadiusKm
  })
  const pool = nearby.length > 0 ? nearby : candidates
  if (pool.length === 0) return null

  const anchor = options.previousPoint ?? options.destinationCenter ?? null
  if (!anchor) return pool[0]

  return [...pool].sort((left, right) => {
    const leftDistance = left.location ? distanceKm(left.location, anchor) : Number.POSITIVE_INFINITY
    const rightDistance = right.location ? distanceKm(right.location, anchor) : Number.POSITIVE_INFINITY
    return leftDistance - rightDistance
  })[0]
}

const updateRouteSummary = (dayPlan: DayPlan) => {
  const names = dayPlan.spots.slice(0, 4).map((spot) => spot.name)
  return names.join(' -> ')
}

export async function enrichPlanWithAmap(plan: TravelPlan, profile: TravelProfile): Promise<TravelPlan> {
  const destination = plan.selectedRecommendation.city.trim()
  if (!destination) return plan

  const planningCity = await inferPlanningCity(destination, profile)
  const destinationCenter = await geocodeAddress(planningCity || destination)
  const maxRadiusKm = planningCity && planningCity !== destination ? 45 : 28
  const enrichedDayPlans: DayPlan[] = []
  const dayUsedPoiIds = new Set<string>()

  for (const dayPlan of plan.dayPlans) {
    const updatedSpots: DaySpot[] = []
    for (const spot of dayPlan.spots) {
      if (!isGenericSpot(spot, destination)) {
        updatedSpots.push(spot)
        continue
      }

      const pois = dedupePoi(
        await searchAmapPoi({
          keywords: buildKeywords(planningCity || destination, spot, profile, dayPlan),
          city: planningCity || destination,
          types: chooseTypes(spot),
          limit: 5,
        }),
      )

      const previousPoint =
        [...updatedSpots]
          .reverse()
          .find((item) => typeof item.lng === 'number' && typeof item.lat === 'number') ?? null
      const picked = chooseBestPoi({
        pois,
        usedPoiIds: dayUsedPoiIds,
        previousPoint: previousPoint ? [previousPoint.lng!, previousPoint.lat!] : null,
        destinationCenter,
        maxRadiusKm,
      })
      if (picked) {
        dayUsedPoiIds.add(picked.id)
        updatedSpots.push(replaceSpot(spot, picked))
      } else if ((spot.type === '景点' || spot.type === '交通') && destinationCenter) {
        updatedSpots.push({ ...spot, lng: destinationCenter[0], lat: destinationCenter[1], address: planningCity || destination })
      } else {
        updatedSpots.push(spot)
      }
    }
    enrichedDayPlans.push({ ...dayPlan, spots: updatedSpots, routeSummary: updateRouteSummary({ ...dayPlan, spots: updatedSpots }) })
  }

  const firstPoint =
    enrichedDayPlans
      .flatMap((dayPlan) => dayPlan.spots)
      .find((spot) => typeof spot.lng === 'number' && typeof spot.lat === 'number') ?? null

  const nextPlan: TravelPlan = {
    ...plan,
    dayPlans: enrichedDayPlans,
    selectedRecommendation: {
      ...plan.selectedRecommendation,
      planningCity,
      mapCenter: firstPoint ? [firstPoint.lng!, firstPoint.lat!] : destinationCenter ?? plan.selectedRecommendation.mapCenter,
    },
    notes: plan.notes,
  }

  void emitTelemetry('amap.poi.enrich.end', {
    destination,
    planningCity,
    ok: true,
    points: enrichedDayPlans.flatMap((dayPlan) => dayPlan.spots).filter((spot) => typeof spot.lng === 'number' && typeof spot.lat === 'number').length,
  })

  return nextPlan
}
