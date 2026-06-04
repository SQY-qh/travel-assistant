import { emitTelemetry } from '@/services/telemetry'
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
    return { ok: false, error: '当前城市代码解析失败，需补充更标准的城市名或手动扩展代码映射表。', warnings }
  }

  const declaredDays = extractTripDays(profile.dateRange)
  if (profile.dateRange && declaredDays !== plannedDays) {
    warnings.push(`当前报价已优先按已生成行程的 ${plannedDays} 天安排计算，而不是仅按原始文本中的天数。`)
  }

  const dates = resolveDateRange(profile.dateRange, plannedDays)
  const adults = estimateTravelerCount(profile.travelers)
  if (dates.approximate) {
    warnings.push('当前真实报价使用了从自然语言自动推导的日期，若你提供精确到日的出发日期，报价会更准确。')
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
      querySummary: `${originCity}(${originCode}) -> ${destinationCity}(${destinationCode})，按当前 ${plannedDays} 天行程计算：出发 ${toIsoDate(dates.start)}，返程 ${toIsoDate(dates.end)}，酒店 ${toIsoDate(dates.start)} 入住 / ${toIsoDate(addDays(dates.end, 1))} 离店`,
    },
  }
}

export async function fetchLivePricing(query: LivePricingQuery): Promise<LivePricingResult> {
  const search = new URLSearchParams({
    originCode: query.originCode,
    destinationCode: query.destinationCode,
    departureDate: query.departureDate,
    returnDate: query.returnDate,
    cityCode: query.destinationCode,
    checkInDate: query.checkInDate,
    checkOutDate: query.checkOutDate,
    adults: String(query.adults),
    roomQuantity: String(query.roomQuantity),
    tripDays: String(query.tripDays),
    originCity: query.originCity,
    destinationCity: query.destinationCity,
    approximateDates: query.approximateDates ? '1' : '0',
    querySummary: query.querySummary,
  })

  void emitTelemetry('pricing.search.start', {
    origin: query.originCode,
    destination: query.destinationCode,
    departureDate: query.departureDate,
    returnDate: query.returnDate,
  })

  const response = await fetch(`/api/pricing/search?${search.toString()}`)
  const payload = await response.json()
  if (!response.ok || payload?.ok === false) {
    const error = String(payload?.error || payload?.message || 'pricing_search_failed')
    void emitTelemetry('pricing.search.end', { ok: false, error })
    throw new Error(error)
  }

  void emitTelemetry('pricing.search.end', {
    ok: true,
    flights: Array.isArray(payload?.flights) ? payload.flights.length : 0,
    hotels: Array.isArray(payload?.hotels) ? payload.hotels.length : 0,
  })

  return payload as LivePricingResult
}
