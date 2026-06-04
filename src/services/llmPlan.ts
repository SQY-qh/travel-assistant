import { chatCompletion, hasGPTConfig } from '@/services/providers/gptProvider'
import type { DayPlan, TravelPlan, TravelProfile } from '@/types/travel'

const normalizeCity = (value: string) => value.replace(/市|特别行政区|自治区|省/g, '').trim()
const clampTripDays = (value: number) => Math.max(2, Math.min(value || 3, 14))

const extractRequestedDays = (profile: TravelProfile) => {
  const match = (profile.dateRange || '').match(/(\d+)\s*天/)
  return clampTripDays(match ? Number(match[1]) : 3)
}

const createFallbackDay = (city: string, day: number): DayPlan => {
  const themes = [
    ['抵达适应日', `先用轻松节奏进入 ${city} 行程`, [`${city} 入住与周边熟悉`, `${city} 在地午餐`, `${city} 夜间漫步`]],
    ['经典地标日', `安排 ${city} 核心地标与城市名片`, [`${city} 城市地标`, `${city} 特色餐厅`, `${city} 夜景打卡`]],
    ['深度体验日', `把 ${city} 玩得更深入一些`, [`${city} 主题街区`, `${city} 在地体验`, `${city} 咖啡或茶馆`]],
    ['松弛慢逛日', `留出更多自由探索时间`, [`${city} 社区漫游`, `${city} 公园或海滨`, `${city} 自由活动`]],
    ['机动补充日', '给天气和临时调整留出弹性', [`${city} 备选景点`, `${city} 购物或休整`, `${city} 晚餐收尾`]],
    ['周边延展日', `可加入 ${city} 周边半日线`, [`${city} 周边目的地`, `${city} 当地午餐`, `${city} 返回市区`]],
    ['返程收尾日', '整理行李并完成返程', [`${city} 早餐与收拾`, `${city} 最后采买`, `${city} 返程交通`]],
  ] as const
  const theme = themes[(day - 1) % themes.length]
  return {
    day,
    title: theme[0],
    routeSummary: theme[1],
    spots: [
      { time: '09:30', name: theme[2][0], type: day === 1 ? '酒店' : '景点', note: `按 ${city} 当天节奏安排，上午适合从轻量项目开始。` },
      { time: '13:30', name: theme[2][1], type: '餐饮', note: '午后安排保持松弛，方便根据天气和体力微调。' },
      { time: '18:30', name: theme[2][2], type: day >= 6 ? '交通' : '景点', note: '傍晚留出收尾时间，避免把行程排得过满。' },
    ],
  }
}

export const alignPlanDayCount = (plan: TravelPlan, profile: TravelProfile): TravelPlan => {
  const desiredDays = extractRequestedDays(profile)
  const baseCity = normalizeCity(plan.selectedRecommendation?.planningCity || plan.selectedRecommendation?.city || profile.destinationCity || '目的地')
  const normalizedDays = Array.isArray(plan.dayPlans) ? plan.dayPlans.slice(0, desiredDays) : []

  while (normalizedDays.length < desiredDays) {
    normalizedDays.push(createFallbackDay(baseCity, normalizedDays.length + 1))
  }

  const renumbered = normalizedDays.map((dayPlan, index) => ({
    ...dayPlan,
    day: index + 1,
  }))

  return {
    ...plan,
    dayPlans: renumbered,
    notes: Array.isArray(plan.notes) ? plan.notes : [],
  }
}

const safeJsonParse = (value: string) => {
  try {
    return JSON.parse(value)
  } catch {
    const start = value.indexOf('{')
    const end = value.lastIndexOf('}')
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(value.slice(start, end + 1))
      } catch {
        return null
      }
    }
    return null
  }
}

const isStringArray = (value: unknown): value is string[] => Array.isArray(value) && value.every((item) => typeof item === 'string')

const isPlanShape = (value: any): value is TravelPlan => {
  if (!value || typeof value !== 'object') return false
  if (!Array.isArray(value.recommendations) || value.recommendations.length < 1) return false
  if (!value.selectedRecommendation || typeof value.selectedRecommendation !== 'object') return false
  if (!Array.isArray(value.dayPlans) || value.dayPlans.length < 1) return false
  if (!value.budget || typeof value.budget !== 'object') return false
  if (!Array.isArray(value.policyCards)) return false
  if (!Array.isArray(value.monitors)) return false
  if (!Array.isArray(value.packingGroups)) return false
  if (!Array.isArray(value.outfitSuggestions)) return false
  if (!Array.isArray(value.insuranceRecommendations)) return false
  if (!Array.isArray(value.notes)) return false
  return true
}

export async function generatePlanWithLLM(profile: TravelProfile, preferredDestination?: string): Promise<TravelPlan | null> {
  if (!hasGPTConfig()) return null

  try {
    const explicitDestination = normalizeCity(profile.destinationCity || preferredDestination || '')
    const requestedDays = extractRequestedDays(profile)
    const hint = explicitDestination
      ? `用户已经明确指定目的地为 ${explicitDestination}。selectedRecommendation.city 必须等于 ${explicitDestination}，recommendations 的第一项也必须是 ${explicitDestination}，绝对不要改成其他城市。`
      : '如果用户没有指定城市，请给出 3 个候选目的地并选择最匹配的一个。'
    const prompt = `你是一个旅行规划师。请根据用户画像生成一份可执行的旅行方案。${hint}

用户画像（JSON）：
${JSON.stringify(profile, null, 2)}

要求：
1) 只输出 JSON，不要 Markdown，不要解释。
2) JSON 必须包含这些字段：recommendations, selectedRecommendation, dayPlans, budget, policyCards, monitors, packingGroups, outfitSuggestions, insuranceRecommendations, notes。
3) recommendations 至少 3 个，每个包含：id, city, country, score(0-100), bestWindow, highlights(数组), reasons(数组), matchReason, coverImage(用一句英文 prompt 描述图片即可), weatherSummary, mapCenter([lng,lat])。
4) dayPlans 为按天列表，每天包含：day(从1开始), title, routeSummary, spots(数组)。每个 spot 包含：time, name, type(景点/餐饮/交通/酒店), note, cost(可选), lng/lat(可选)。
5) 用户本次明确要玩 ${requestedDays} 天，所以 dayPlans 必须严格返回 ${requestedDays} 天，不能少、不能多。
5) budget 为整数并给出 total 与各项细分：flight, hotel, food, transportation, tickets, insurance, flexible。
6) monitors 至少 2 个（机票/酒店），给出 currentPrice, expectedPrice, trend(6个数字), status(观察中/接近低价/建议立即预订), enabled。
7) policyCards 给出签证/政策/注意事项，packingGroups 给出打包清单分组，outfitSuggestions 给出穿搭建议，insuranceRecommendations 给出保险建议。
`

    const response = await chatCompletion(prompt, '你是一个严谨的 JSON 生成器，只输出符合要求的 JSON。', 0.55)
    if (!response) return null

    const parsed = safeJsonParse(response)
    if (!isPlanShape(parsed)) return null

    const imageFromPrompt = (prompt: string, size = 'portrait_16_9') =>
      `https://copilot-cn.bytedance.net/api/ide/v1/text_to_image?prompt=${encodeURIComponent(prompt)}&image_size=${size}`

    const normalizeCoverImage = (value: unknown) => {
      if (typeof value !== 'string') return imageFromPrompt('minimal travel cover photo, warm sunlight, premium editorial style')
      if (value.startsWith('http://') || value.startsWith('https://')) return value
      return imageFromPrompt(value)
    }

    const recommendations = parsed.recommendations.map((item: any) => ({
      ...item,
      coverImage: normalizeCoverImage(item.coverImage),
    }))

    const selectedId = parsed.selectedRecommendation?.id
    const selectedRecommendation =
      recommendations.find((item: any) => item.id === selectedId) ??
      ({
        ...parsed.selectedRecommendation,
        coverImage: normalizeCoverImage(parsed.selectedRecommendation?.coverImage),
      } as any)

    const normalized: TravelPlan = {
      ...parsed,
      recommendations,
      selectedRecommendation,
      notes: isStringArray(parsed.notes) ? parsed.notes : [],
    }

    if (explicitDestination && normalizeCity(normalized.selectedRecommendation.city) !== explicitDestination) {
      return null
    }

    return alignPlanDayCount(normalized, profile)
  } catch {
    return null
  }
}
