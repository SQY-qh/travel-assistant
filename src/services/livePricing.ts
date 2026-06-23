import { emitTelemetry } from '@/services/telemetry'
import { apiUrl, hasApiBaseUrl } from '@/services/apiBase'
import type { LivePricingQuery, LivePricingResult, TravelPlan, TravelProfile } from '@/types/travel'

type QueryResolution =
  | { ok: true; query: LivePricingQuery; warnings: string[] }
  | { ok: false; error: string; warnings: string[] }

const normalizeCity = (value: string) => value.replace(/市|特别行政区|自治区|省/g, '').trim()

const cityCodeMap: Record<string, string> = {
  北京: 'BJS',
  上海: 'SHA',
  广州: 'CAN',
  深圳: 'SZX',
  杭州: 'HGH',
  成都: 'CTU',
  重庆: 'CKG',
  西安: 'XIY',
  珠海: 'ZUH',
  青岛: 'TAO',
  厦门: 'XMN',
  南京: 'NKG',
  苏州: 'SHA',
  武汉: 'WUH',
  长沙: 'CSX',
  沈阳: 'SHE',
  三亚: 'SYX',
  昆明: 'KMG',
  大连: 'DLC',
  天津: 'TSN',
  香港: 'HKG',
  澳门: 'MFM',
  台北: 'TPE',
  东京: 'TYO',
  大阪: 'OSA',
  京都: 'OSA',
  名古屋: 'NGO',
  首尔: 'SEL',
  釜山: 'PUS',
  新加坡: 'SIN',
  曼谷: 'BKK',
  普吉: 'HKT',
  吉隆坡: 'KUL',
  巴黎: 'PAR',
  伦敦: 'LON',
  罗马: 'ROM',
  米兰: 'MIL',
  柏林: 'BER',
  巴塞罗那: 'BCN',
  纽约: 'NYC',
  洛杉矶: 'LAX',
  旧金山: 'SFO',
  拉斯维加斯: 'LAS',
  迪拜: 'DXB',
  悉尼: 'SYD',
  墨尔本: 'MEL',
}

const estimateTravelerCount = (value: string) => {
  const match = value.match(/(\d+)\s*人/)
  if (match) return Math.max(1, Number(match[1]))
  if (value.includes('亲子')) return 3
  if (value.includes('情侣')) return 2
  if (value.includes('朋友')) return 2
  if (value.includes('父母')) return 3
  return 1
}

const pad = (value: number) => String(value).padStart(2, '0')

const toIsoDate = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

const addDays = (date: Date, days: number) => {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

const clampTripDays = (value: number) => Math.max(1, Math.min(value || 3, 14))

const extractTripDays = (dateRange: string) => {
  const match = dateRange.match(/(\d+)\s*天/)
  return clampTripDays(match ? Number(match[1]) : 3)
}

const inferStartDay = (input: string) => {
  if (input.includes('上旬') || input.includes('月初')) return 5
  if (input.includes('中旬')) return 15
  if (input.includes('下旬')) return 24
  if (input.includes('月底')) return 28
  const explicit = input.match(/(\d{1,2})[日号]/)
  if (explicit) return Math.max(1, Math.min(28, Number(explicit[1])))
  return 15
}

const resolveDateRange = (dateRange: string, plannedDays?: number) => {
  const today = new Date()
  const normalized = dateRange.replace(/\s+/g, '')
  const extractedDays = extractTripDays(normalized)
  const days = clampTripDays(plannedDays || extractedDays)
  const exactMatch = normalized.match(/(20\d{2})[-/.年](\d{1,2})[-/.月](\d{1,2})/)
  if (exactMatch) {
    const start = new Date(Number(exactMatch[1]), Number(exactMatch[2]) - 1, Number(exactMatch[3]))
    return {
      start,
      end: addDays(start, Math.max(days - 1, 0)),
      approximate: false,
    }
  }

  const monthMatch = normalized.match(/(\d{1,2})月/)
  if (monthMatch) {
    let year = today.getFullYear()
    const month = Number(monthMatch[1])
    if (month < today.getMonth() + 1) year += 1
    const start = new Date(year, month - 1, inferStartDay(normalized))
    return {
      start,
      end: addDays(start, Math.max(days - 1, 0)),
      approximate: true,
    }
  }

  const start = addDays(today, 14)
  return {
    start,
    end: addDays(start, Math.max(days - 1, 0)),
    approximate: true,
  }
}

const resolveCityCode = (value: string) => {
  const normalized = normalizeCity(value)
  if (!normalized) return null
  if (/^[A-Z]{3}$/.test(normalized.toUpperCase())) return normalized.toUpperCase()
  return cityCodeMap[normalized] ?? null
}

export function resolveLivePricingQuery(profile: TravelProfile, plan: TravelPlan): QueryResolution {
  const warnings: string[] = []
  const originCity = normalizeCity(profile.departureCity)
  const destinationCity = normalizeCity(plan.selectedRecommendation.planningCity || plan.selectedRecommendation.city || profile.destinationCity)
  const plannedDays = Math.max(1, plan.dayPlans.length || extractTripDays(profile.dateRange))

  if (!originCity || !destinationCity) {
    return { ok: false, error: '需要先明确出发地和目的地，才能查询真实航班和酒店报价。', warnings }
  }

  const originCode = resolveCityCode(originCity)
  const destinationCode = resolveCityCode(destinationCity)

  if (!originCode) warnings.push(`暂时还无法把“${originCity}”自动映射成航旅供应商使用的 IATA 代码。`)
  if (!destinationCode) warnings.push(`暂时还无法把“${destinationCity}”自动映射成航旅供应商使用的 IATA 代码。`)

  if (!originCode || !destinationCode) {
    return { ok: false, error: '城市名称还不够明确，可以补充出发地和目的地。', warnings }
  }

  const declaredDays = extractTripDays(profile.dateRange)
  if (profile.dateRange && declaredDays !== plannedDays) {
    warnings.push(`价格已按 ${plannedDays} 天行程安排。`)
  }

  const dates = resolveDateRange(profile.dateRange, plannedDays)
  const adults = estimateTravelerCount(profile.travelers)
  if (dates.approximate) {
    warnings.push('出发日期越具体，价格越贴近实际出行。')
  }

  return {
    ok: true,
    warnings,
    query: {
      originCity,
      originCode,
      destinationCity,
      destinationCode,
      departureDate: toIsoDate(dates.start),
      returnDate: toIsoDate(dates.end),
      checkInDate: toIsoDate(dates.start),
      checkOutDate: toIsoDate(addDays(dates.end, 1)),
      adults,
      roomQuantity: 1,
      tripDays: plannedDays,
      approximateDates: dates.approximate,
      querySummary: `${originCity}(${originCode}) -> ${destinationCity}(${destinationCode})，${plannedDays} 天安排：${toIsoDate(dates.start)} 出发，${toIsoDate(dates.end)} 返程，酒店住到 ${toIsoDate(addDays(dates.end, 1))}`,
    },
  }
}

export async function fetchLivePricing(query: LivePricingQuery): Promise<LivePricingResult> {
  void emitTelemetry('pricing.search.start', {
    origin: query.originCode,
    destination: query.destinationCode,
    departureDate: query.departureDate,
    returnDate: query.returnDate,
  })

  if (hasApiBaseUrl()) {
    const params = new URLSearchParams({
      originCity: query.originCity,
      originCode: query.originCode,
      destinationCity: query.destinationCity,
      destinationCode: query.destinationCode,
      cityCode: query.destinationCode,
      departureDate: query.departureDate,
      returnDate: query.returnDate,
      checkInDate: query.checkInDate,
      checkOutDate: query.checkOutDate,
      adults: String(query.adults),
      roomQuantity: String(query.roomQuantity),
      tripDays: String(query.tripDays),
      approximateDates: query.approximateDates ? '1' : '0',
      querySummary: query.querySummary,
    })

    try {
      const response = await fetch(apiUrl(`/api/pricing/search?${params.toString()}`))
      if (!response.ok) {
        throw new Error(`pricing_proxy_${response.status}`)
      }
      const data = await response.json()
      if (!data?.ok) {
        throw new Error(data?.error || 'pricing_proxy_failed')
      }
      void emitTelemetry('pricing.search.end', {
        ok: true,
        provider: data.provider,
        flights: data.flights?.length || 0,
        hotels: data.hotels?.length || 0,
        trains: data.trains?.length || 0,
      })
      return data as LivePricingResult
    } catch (error) {
      void emitTelemetry('pricing.search.end', { ok: false, error: String(error?.message || error) })
    }
  }

  const international = !['BJS', 'SHA', 'CAN', 'SZX', 'HGH', 'CTU', 'CKG', 'XIY', 'ZUH', 'TAO', 'XMN', 'NKG', 'WUH', 'CSX', 'SHE', 'SYX', 'KMG', 'DLC', 'TSN'].includes(query.destinationCode)
  const flightBase = international ? 3200 : 980
  const hotelBase = international ? 820 : 420
  const trainAvailable = !international && query.originCode !== query.destinationCode
  const outboundAt = `${query.departureDate}T09:20:00+08:00`
  const outboundArriveAt = `${query.departureDate}T12:05:00+08:00`
  const inboundAt = `${query.returnDate}T16:30:00+08:00`
  const inboundArriveAt = `${query.returnDate}T19:15:00+08:00`
  const totalFlightPrice = Math.round((flightBase + query.tripDays * 60) * Math.max(query.adults, 1))
  const hotelNights = Math.max(1, query.tripDays)

  const payload: LivePricingResult = {
    provider: 'mixed',
    configured: false,
    query,
    fetchedAt: new Date().toISOString(),
    warnings: [
      '价格先按常见区间展示，适合用来判断预算是否够用。',
      ...(query.approximateDates ? ['日期来自自然语言推断，提供精确日期可让预算更贴近实际。'] : []),
    ],
    flights: [
      {
        id: 'static-flight-1',
        source: 'budget-range',
        airlineCodes: ['CA'],
        validatingAirlineCodes: ['航班'],
        totalPrice: totalFlightPrice,
        currency: 'CNY',
        bookableSeats: Math.max(2, query.adults + 2),
        itineraries: [
          [
            {
              carrierCode: 'CA',
              flightNumber: `${query.originCode}-${query.destinationCode}`,
              departureIata: query.originCode,
              arrivalIata: query.destinationCode,
              departureAt: outboundAt,
              arrivalAt: outboundArriveAt,
              duration: 'PT2H45M',
            },
          ],
          [
            {
              carrierCode: 'CA',
              flightNumber: `${query.destinationCode}-${query.originCode}`,
              departureIata: query.destinationCode,
              arrivalIata: query.originCode,
              departureAt: inboundAt,
              arrivalAt: inboundArriveAt,
              duration: 'PT2H45M',
            },
          ],
        ],
      },
    ],
    hotels: [
      {
        id: 'static-hotel-1',
        hotelId: 'static-hotel-comfort',
        hotelName: `${query.destinationCity}舒适精选酒店`,
        cityCode: query.destinationCode,
        address: `${query.destinationCity}核心商圈或交通便利区域`,
        roomType: '舒适大床/双床房',
        boardType: '不含早',
        refundable: true,
        totalPrice: Math.round(hotelBase * hotelNights * query.roomQuantity),
        currency: 'CNY',
        source: 'budget-range',
      },
      {
        id: 'static-hotel-2',
        hotelId: 'static-hotel-boutique',
        hotelName: `${query.destinationCity}设计感精品住宿`,
        cityCode: query.destinationCode,
        address: `${query.destinationCity}热门街区附近`,
        roomType: '精品房型',
        boardType: '部分含早',
        refundable: true,
        totalPrice: Math.round(hotelBase * 1.35 * hotelNights * query.roomQuantity),
        currency: 'CNY',
        source: 'budget-range',
      },
    ],
    trains: trainAvailable
      ? [
          {
            id: 'static-train-1',
            source: 'budget-range',
            trainNumber: 'G 字头高铁',
            departureStation: `${query.originCity}站`,
            arrivalStation: `${query.destinationCity}站`,
            departureAt: `${query.departureDate}T08:00:00+08:00`,
            arrivalAt: `${query.departureDate}T13:30:00+08:00`,
            duration: '约5小时30分钟',
            seatType: '二等座',
            availability: '座席充足时更合适',
            totalPrice: Math.round(360 * Math.max(query.adults, 1)),
            currency: 'CNY',
            notes: '二等座价格区间',
          },
        ]
      : [],
  }

  void emitTelemetry('pricing.search.end', {
    ok: true,
    flights: payload.flights.length,
    hotels: payload.hotels.length,
  })

  return payload
}
