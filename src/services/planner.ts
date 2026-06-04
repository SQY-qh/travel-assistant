import { destinationTemplates } from '@/data/demo'
import { selectOutfitsForTrip } from '@/data/outfits'
import { chatCompletion, hasGPTConfig, maybeRefineReply } from '@/services/providers/gptProvider'
import { alignPlanDayCount, generatePlanWithLLM } from '@/services/llmPlan'
import { createEmptyProfile, type ConversationTurnResult, type DayPlan, type DestinationRecommendation, type PolicyCard, type PriceMonitorItem, type RequiredField, type TravelPlan, type TravelProfile } from '@/types/travel'

        const requiredFields: RequiredField[] = [
          'departureCity',
  'destinationCity',
          'dateRange',
          'travelers',
          'budgetLevel',
        ]

        const budgetPrompts = [
          { matcher: /(1万5|15000|高预算|充足|轻奢|奢华)/, value: '高预算' },
          { matcher: /(8千|8000|1万|10000|中等|适中|正常)/, value: '中等预算' },
          { matcher: /(5千|5000|紧凑|省钱|学生)/, value: '紧凑预算' },
        ]

        const styleKeywords = ['慢逛', '城市', '美食', '亲子', '情侣', '购物', '出境', '海边', '历史', '轻松', '休闲', '国内']
        const accommodationKeywords = ['精品酒店', '酒店', '民宿', '海景房', '亲子酒店']
        const transportKeywords = ['飞机', '高铁', '自驾', '地铁', '公共交通']
        const visaKeywords = ['免签', '已有签证', '需要签证', '落地签']
const imageFromPrompt = (prompt: string, size = 'portrait_16_9') =>
  `https://copilot-cn.bytedance.net/api/ide/v1/text_to_image?prompt=${encodeURIComponent(prompt)}&image_size=${size}`
const normalizeCityName = (value: string) => value.replace(/市|特别行政区|自治区|省/g, '').trim()
const domesticCities = new Set(['北京', '上海', '广州', '深圳', '杭州', '成都', '重庆', '西安', '青岛', '厦门', '南京', '苏州', '武汉', '长沙', '三亚', '昆明', '大理', '丽江', '哈尔滨', '天津', '珠海', '桂林', '拉萨', '福州', '宁波', '无锡'])
const cityCenters: Record<string, [number, number]> = {
  北京: [116.4074, 39.9042],
  上海: [121.4737, 31.2304],
  广州: [113.2644, 23.1291],
  深圳: [114.0579, 22.5431],
  杭州: [120.1551, 30.2741],
  成都: [104.0665, 30.5728],
  重庆: [106.5516, 29.563],
  西安: [108.9398, 34.3416],
  青岛: [120.3826, 36.0671],
  厦门: [118.0894, 24.4798],
  南京: [118.7969, 32.0603],
  苏州: [120.5853, 31.2989],
  武汉: [114.3054, 30.5931],
  长沙: [112.9388, 28.2282],
}

const cityClimateNotes: Record<string, string> = {
  北京: '北京四季分明，春秋温差较大，建议带一件轻薄外套。',
  上海: '上海夏季湿热、冬季湿冷，建议准备透气衣物和薄外套。',
  广州: '广州气候湿热，夏秋雨水较多，建议带轻便雨具和透气衣物。',
  深圳: '深圳常年温暖潮湿，夏季日晒和阵雨都较明显，建议带防晒和雨具。',
  杭州: '杭州春秋适合步行，夏季偏闷热，建议带舒适鞋和轻便外套。',
  成都: '成都体感湿润，夏季闷热、冬季偏阴冷，建议带薄外套。',
  重庆: '重庆坡路多且夏季炎热，建议穿防滑舒适鞋并注意补水。',
  西安: '西安昼夜温差较明显，春秋建议准备外套，夏季注意防晒。',
  武汉: '武汉夏季炎热湿润，春秋适合城市漫游，建议准备透气衣物、遮阳用品和轻便雨具。',
  长沙: '长沙夏季湿热、口味偏辣，建议注意补水并准备轻便透气衣物。',
}

        const normalize = (value: string) => value.replace(/[，。！？；]/g, ' ').trim()

        const extractDays = (value: string) => {
          const dayMatch = value.match(/(\d+)\s*天/)
          if (dayMatch) {
            return Number(dayMatch[1])
          }
          return 3
        }

        const estimateTravelerCount = (value: string) => {
          const match = value.match(/(\d+)\s*人/)
          if (match) {
            return Number(match[1])
          }
          if (value.includes('亲子')) return 3
          if (value.includes('情侣')) return 2
          if (value.includes('朋友')) return 2
          return 1
        }

        const mergeUnique = (current: string[], next: string[]) => Array.from(new Set([...current, ...next]))

export function extractProfileFromText(current: TravelProfile, text: string, expectedField?: RequiredField): TravelProfile {
  const next = { ...current }
  const source = normalize(text)
  const compact = text.trim()
  const cityOnly = /^[\u4e00-\u9fa5]{2,6}$/.test(compact)

  const explicitDeparture = /从[^\s]{1,8}出发/.test(source) || /出发地(?:是|为)?/.test(source)
  const explicitDestination = /目的地(?:是|为)?/.test(source) || /去[^\s，。！？；]{1,14}/.test(source)

  const departureMatches = [source.match(/从([^\s]{1,8})出发/), source.match(/出发地(?:是|为)?([^\s]{1,8})/)]
  const departure = departureMatches.find(Boolean)?.[1]
  if (departure) {
    if (!next.departureCity || explicitDeparture || expectedField === 'departureCity') {
      next.departureCity = departure
    }
  } else if (cityOnly && expectedField === 'departureCity') {
    next.departureCity = compact
  }

  const destinationMatch =
    source.match(/目的地(?:是|为)?([^\s，。！？；]{1,14})/)?.[1] || source.match(/去([^\s，。！？；]{1,14})/)?.[1]
  if (destinationMatch) {
    const candidate = destinationMatch
      .replace(/(玩|游玩|旅游|出差|出游).*/g, '')
      .replace(/[，。！？；]/g, '')
      .trim()
    const looksLikeCity =
      /^[\u4e00-\u9fa5]{2,8}$/.test(candidate) && !/(城市|地方|适合|国内|国外|周边)/.test(candidate)
    if (looksLikeCity) {
      if (!next.destinationCity || explicitDestination || expectedField === 'destinationCity') {
        next.destinationCity = candidate
      }
    }
  } else if (cityOnly && expectedField === 'destinationCity') {
    next.destinationCity = compact
  }

  if (cityOnly && !explicitDeparture && !explicitDestination) {
    if (!next.departureCity && next.destinationCity) {
      next.departureCity = compact
    } else if (!next.destinationCity && next.departureCity) {
      next.destinationCity = compact
    }
  }

          if (source.includes('海边')) next.destinationIntent = next.destinationIntent || '海边放松'
          if (source.includes('历史')) next.destinationIntent = next.destinationIntent || '历史文化深度游'
          if (source.includes('亲子')) next.destinationIntent = next.destinationIntent || '亲子轻松出游'
          if (source.includes('城市')) next.destinationIntent = next.destinationIntent || '城市漫游'
          if (source.includes('出境')) next.destinationIntent = next.destinationIntent || '高确定性出境旅行'

  const explicitIntent = source.match(/想去([^\s]{1,10})/)?.[1]
  if (explicitIntent && explicitIntent.length <= 6 && !explicitIntent.includes('玩')) {
    if (!next.destinationCity) next.destinationCity = explicitIntent
  }

          const dayMatch = source.match(/(\d+\s*天(?:\d+\s*晚)?)/)
          if (dayMatch) next.dateRange = dayMatch[1].replace(/\s+/g, '')

          const monthMatch = source.match(/(\d+月[^\s]*)/)
          if (monthMatch) {
            next.dateRange = next.dateRange ? `${monthMatch[1]} · ${next.dateRange}` : monthMatch[1]
          }

          const travelerMatch = source.match(/(\d+人同行|\d+人|情侣|亲子|和父母|和朋友)/)
          if (travelerMatch) {
            next.travelers = travelerMatch[1]
          }

          const budgetMatch = budgetPrompts.find((item) => item.matcher.test(source))
          if (budgetMatch) next.budgetLevel = budgetMatch.value
          const numericBudget = source.match(/预算\s*(\d{4,5})/)
          if (numericBudget) {
            const amount = Number(numericBudget[1])
            if (amount >= 12000) next.budgetLevel = '高预算'
            else if (amount >= 7000) next.budgetLevel = '中等预算'
            else next.budgetLevel = '紧凑预算'
          }

          const foundStyles = styleKeywords.filter((keyword) => source.includes(keyword))
          if (foundStyles.length) next.travelStyle = mergeUnique(next.travelStyle, foundStyles)

          const accommodation = accommodationKeywords.find((keyword) => source.includes(keyword))
          if (accommodation) next.accommodationPreference = accommodation

          const transport = transportKeywords.find((keyword) => source.includes(keyword))
          if (transport) next.transportPreference = transport

          const visa = visaKeywords.find((keyword) => source.includes(keyword))
          if (visa) next.visaStatus = visa

          if (source.includes('签证') || source.includes('保险') || source.includes('价格监控')) {
            next.notes = mergeUnique(
              next.notes ? next.notes.split('｜') : [],
              ['关注签证政策', '需要价格监控', '补充保险建议'].filter((item) => source.includes(item.replace('关注', '').replace('需要', '').replace('补充', ''))),
            ).join('｜')
          }

  return next
}

        export const getMissingFields = (profile: TravelProfile) =>
  requiredFields.filter((field) => {
    if (field === 'destinationCity') {
      return !(profile.destinationCity ?? '').trim() && !(profile.destinationIntent ?? '').trim()
    }
    return !(profile[field] ?? '').trim()
  })

const fieldQuestions: Record<RequiredField, string> = {
  departureCity: '先告诉我你的出发城市，我好帮你判断机票与路线成本。',
  destinationCity: '你有明确想去的城市/目的地吗？如果还没想好，也可以说你想要海边/城市漫游/亲子等风格，我来给你挑。',
  dateRange: '大概什么时候出发、玩几天？给我一个月份和天数就够了。',
  travelers: '这次谁和你一起去？一个人、情侣、亲子还是朋友同行？',
  budgetLevel: '预算想走什么档位？紧凑、中等还是高预算都可以。',
}

const buildProfileSummary = (profile: TravelProfile) => {
  const chunks = [
    profile.departureCity ? `从${profile.departureCity}出发` : '',
    profile.destinationCity ? `去${profile.destinationCity}` : '',
    profile.dateRange || '',
    profile.travelers || '',
    profile.destinationIntent ? `偏好${profile.destinationIntent}` : '',
    profile.budgetLevel || '',
  ].filter(Boolean)

  return chunks.length ? chunks.join('，') : '暂未收集到完整信息'
}

const llmExtractProfile = async (current: TravelProfile, text: string, expectedField?: RequiredField): Promise<TravelProfile | null> => {
  if (!hasGPTConfig()) return null

  const prompt = `请从用户输入中抽取并更新旅行画像字段，只输出 JSON。

当前画像 JSON：
${JSON.stringify(current)}

用户输入：
${text}

输出 JSON（字段必须完整，未知字段填空字符串或空数组）：
{
  "departureCity": "",
  "destinationCity": "",
  "destinationIntent": "",
  "dateRange": "",
  "travelers": "",
  "budgetLevel": "",
  "travelStyle": [],
  "accommodationPreference": "",
  "transportPreference": "",
  "visaStatus": "",
  "notes": ""
}
`

  const response = await chatCompletion(prompt, '你是一个严格的 JSON 解析器，只输出合法 JSON。', 0)
  if (!response) return null

  try {
    const parsed = JSON.parse(response)
    if (!parsed || typeof parsed !== 'object') return null
    const explicit = {
      departureCity: /从[^\s]{1,8}出发/.test(text) || /出发地/.test(text) || expectedField === 'departureCity',
      destinationCity: /目的地/.test(text) || /去[^\s，。！？；]{1,14}/.test(text) || expectedField === 'destinationCity',
      dateRange: /(\d+\s*天|\d+\s*晚|\d+月)/.test(text) || expectedField === 'dateRange',
      travelers: /(\d+\s*人|情侣|亲子|朋友|和父母)/.test(text) || expectedField === 'travelers',
      budgetLevel: /(预算|高预算|中等|紧凑|[0-9]{4,5})/.test(text) || expectedField === 'budgetLevel',
      accommodationPreference: /(酒店|民宿|设计师酒店|精品酒店|海景房)/.test(text),
      transportPreference: /(飞机|高铁|自驾|地铁|公共交通)/.test(text),
      visaStatus: /(签证|免签|落地签)/.test(text),
      destinationIntent: /(海边|历史|亲子|城市漫游|出境|度假|美食)/.test(text),
      notes: /(价格监控|保险|签证)/.test(text),
    } as const

    const merged: TravelProfile = { ...current }
    const parsedRecord = parsed as Record<string, unknown>

    type ExplicitField = keyof typeof explicit

    const maybeUpdateString = (field: ExplicitField) => {
      const value = parsedRecord[field]
      if (typeof value !== 'string') return
      const trimmed = value.trim()
      if (!trimmed) return
      const currentValue = merged[field]
      if (currentValue && !explicit[field]) return
      merged[field] = trimmed
    }

    maybeUpdateString('departureCity')
    maybeUpdateString('destinationCity')
    maybeUpdateString('destinationIntent')
    maybeUpdateString('dateRange')
    maybeUpdateString('travelers')
    maybeUpdateString('budgetLevel')
    maybeUpdateString('accommodationPreference')
    maybeUpdateString('transportPreference')
    maybeUpdateString('visaStatus')
    maybeUpdateString('notes')

    if (Array.isArray(parsed.travelStyle)) {
      const styles = parsed.travelStyle.filter((item: unknown) => typeof item === 'string') as string[]
      if (styles.length) {
        merged.travelStyle = Array.from(new Set([...(current.travelStyle || []), ...styles]))
      }
    }

    return merged
  } catch {
    return null
  }
}

export async function collectConversationTurn(current: TravelProfile, text: string, expectedField?: RequiredField): Promise<ConversationTurnResult> {
  let profile = extractProfileFromText(current, text, expectedField)
  const afterHeuristicMissing = getMissingFields(profile)
  if (afterHeuristicMissing.length > 0 || (!profile.destinationCity && !profile.destinationIntent)) {
    const refined = await llmExtractProfile(profile, text, expectedField)
    if (refined) {
      profile = refined
    }
  }
          const missingFields = getMissingFields(profile)
          const summary = buildProfileSummary(profile)
          const shouldGeneratePlan = missingFields.length === 0

          const fallback = shouldGeneratePlan
            ? `我已经收齐了关键信息：${summary}。现在可以直接为你生成候选目的地、路线、预算、价格监控和出行准备清单。你也可以继续补充偏好，比如“想住设计酒店”或“想把购物安排多一点”。`
            : `已记录：${summary}。${fieldQuestions[missingFields[0]]}`

          const assistantMessage = await maybeRefineReply({
            fallback,
            prompt: `用户刚刚说：${text}
旅行画像：${JSON.stringify(profile)}
请输出一段简短、温和、专业的中文回复。若信息不完整，只追问一个最关键问题；若已完整，说明你可以生成方案。`,
          })

          return {
            profile,
            assistantMessage,
            missingFields,
            shouldGeneratePlan,
            summary,
          }
        }

const scoreTemplate = (
  template: Pick<DestinationRecommendation, 'city' | 'country'>,
  profile: TravelProfile,
  keywordWeights: Record<string, number>,
) => {
          const requestedCity = normalizeCityName(profile.destinationCity)
          const source = [
            profile.destinationIntent,
            profile.destinationCity,
            profile.budgetLevel,
            profile.travelers,
            profile.travelStyle.join(' '),
            profile.notes,
          ].join(' ')

          let score = 72
          Object.entries(keywordWeights).forEach(([keyword, weight]) => {
            if (source.includes(keyword)) {
              score += weight * 5
            }
          })
          if (requestedCity) {
            if (normalizeCityName(template.city) === requestedCity) score += 50
            else score -= 18
          }
          if (profile.destinationIntent.includes(template.city)) score += 10
          if (profile.destinationIntent.includes('出境') && template.country !== '中国') score += 6
          if (profile.destinationIntent.includes('国内') && template.country === '中国') score += 6
          return Math.min(score, 98)
        }

        const buildReasons = (profile: TravelProfile, city: string) => {
          const reasons = ['路线成熟，适合第一次规划就直接落地。']
          if (profile.travelers.includes('亲子')) reasons.unshift('整体转场顺畅，亲子体验更省心。')
          if (profile.travelers.includes('情侣')) reasons.unshift('氛围感与节奏兼顾，适合约会型旅行。')
          if (profile.travelStyle.includes('美食')) reasons.unshift(`${city} 的餐饮体验很适合把每天都安排得有记忆点。`)
          if (profile.budgetLevel.includes('紧凑')) reasons.push('可以通过替换住宿和餐饮档位控制成本。')
          return reasons.slice(0, 3)
        }

        const buildBudget = (baseBudget: TravelPlan['budget'], profile: TravelProfile): TravelPlan['budget'] => {
          const travelerCount = estimateTravelerCount(profile.travelers)
          const budgetFactor = profile.budgetLevel.includes('高') ? 1.25 : profile.budgetLevel.includes('紧凑') ? 0.82 : 1
          const sharedHotelFactor = travelerCount > 1 ? 1 + (travelerCount - 1) * 0.42 : 1
          const personalFactor = travelerCount

          const result = {
            flight: Math.round(baseBudget.flight * personalFactor * budgetFactor),
            hotel: Math.round(baseBudget.hotel * sharedHotelFactor * budgetFactor),
            food: Math.round(baseBudget.food * personalFactor * budgetFactor),
            transportation: Math.round(baseBudget.transportation * personalFactor * 0.9),
            tickets: Math.round(baseBudget.tickets * personalFactor),
            insurance: Math.round(baseBudget.insurance * personalFactor),
            flexible: Math.round(baseBudget.flexible * budgetFactor),
            total: 0,
          }
          result.total = Object.values(result).reduce((sum, value) => sum + value, 0) - result.total
          return result
        }

        const buildMonitors = (templateId: string, flightTarget: string, hotelTarget: string, budget: TravelPlan['budget']): PriceMonitorItem[] => {
          const baseFlight = Math.round(budget.flight / 1.06)
          const baseHotel = Math.round(budget.hotel / 1.08)
          return [
            {
              id: `${templateId}-flight`,
              category: '机票',
              target: flightTarget,
              currentPrice: baseFlight,
              expectedPrice: Math.round(baseFlight * 0.9),
              trend: [1.04, 1.02, 1.03, 1.01, 0.98, 0.95].map((item) => Math.round(baseFlight * item)),
              status: baseFlight <= budget.flight ? '接近低价' : '观察中',
              enabled: true,
            },
            {
              id: `${templateId}-hotel`,
              category: '酒店',
              target: hotelTarget,
              currentPrice: baseHotel,
              expectedPrice: Math.round(baseHotel * 0.92),
              trend: [1.08, 1.07, 1.01, 0.99, 0.96, 0.94].map((item) => Math.round(baseHotel * item)),
              status: baseHotel <= budget.hotel ? '建议立即预订' : '观察中',
              enabled: true,
            },
          ]
        }

const buildGenericDayPlans = (city: string, profile: TravelProfile): DayPlan[] => {
  const days = Math.max(2, Math.min(extractDays(profile.dateRange), 7))
  const focusByDay = [
    ['抵达与城市适应', `${city} 核心区轻松走一圈`, ['酒店办理入住', `${city} 市中心漫步`, `${city} 晚餐`]],
    ['经典地标日', `安排 ${city} 代表性区域与城市地标`, [`${city} 地标景点`, `${city} 特色餐饮`, `${city} 夜景区`]],
    ['主题偏好日', `根据你的偏好补足 ${profile.destinationIntent || '美食 / 购物 / 文化'} 体验`, [`${city} 主题街区`, `${city} 特色体验`, `${city} 休闲餐酒吧`]],
    ['深度漫游日', `留给 ${city} 更松弛的一面`, [`${city} 在地社区`, `${city} 咖啡馆 / 茶馆`, `${city} 公园或海滨步道`]],
    ['机动调整日', '给天气、购物或临时加点留出弹性', [`${city} 备选景点`, `${city} 购物区`, `${city} 酒店休整`]],
    ['周边延展日', `若体力允许，可加入 ${city} 周边半日线`, [`${city} 周边目的地`, `${city} 在地午餐`, `${city} 返回市区`]],
    ['返程收尾日', '整理行李与返程', [`${city} 最后采买`, `${city} 返程交通`, `${city} 行程复盘`]],
  ] as const

  return Array.from({ length: days }, (_, index) => {
    const [title, routeSummary, spots] = focusByDay[Math.min(index, focusByDay.length - 1)]
    return {
      day: index + 1,
      title,
      routeSummary,
      spots: [
        { time: '10:00', name: spots[0], type: index === 0 ? '酒店' : '景点', note: `先用 ${city} 的核心区域打开当天节奏，方便适应交通和步行强度。` },
        { time: '14:00', name: spots[1], type: index === 6 ? '交通' : '餐饮', note: `这段安排适合按你的兴趣选择具体店铺或景点，保留一点临场调整空间。` },
        { time: '18:30', name: spots[2], type: index >= 4 ? '酒店' : '景点', note: `为 ${profile.travelers || '本次出行'} 预留轻松收尾节奏。` },
      ],
    }
  })
}

const detailedCityPlans: Record<string, DayPlan[]> = {
  武汉: [
    {
      day: 1,
      title: '武昌老城与长江夜色',
      routeSummary: '黄鹤楼 -> 户部巷 / 粮道街 -> 武汉长江大桥 -> 江汉路',
      spots: [
        { time: '10:00', name: '黄鹤楼', type: '景点', note: '首站安排城市名片，建议提前买票，登楼后可以顺着蛇山看长江与武昌城景。', lat: 30.5449, lng: 114.3092, cost: 70 },
        { time: '12:30', name: '粮道街', type: '餐饮', note: '午餐放在粮道街一带，热干面、豆皮、糊汤粉都方便试，排队店铺可按现场人流调整。', lat: 30.5416, lng: 114.3111, cost: 45 },
        { time: '15:30', name: '武汉长江大桥', type: '景点', note: '从桥头慢慢走一段就够，不必全程走完；下午光线适合拍江面和桥体。', lat: 30.5542, lng: 114.2938, cost: 0 },
        { time: '19:00', name: '江汉路步行街', type: '餐饮', note: '晚餐和夜逛放在江汉路，转场到汉口后更适合感受武汉的夜生活。', lat: 30.5844, lng: 114.2892, cost: 90 },
      ],
    },
    {
      day: 2,
      title: '东湖绿道与湖北省博',
      routeSummary: '湖北省博物馆 -> 东湖听涛 / 绿道 -> 楚河汉街',
      spots: [
        { time: '09:30', name: '湖北省博物馆', type: '景点', note: '建议预约上午场，把越王勾践剑、曾侯乙编钟作为重点，不要试图一次看完所有展厅。', lat: 30.5619, lng: 114.3671, cost: 0 },
        { time: '12:30', name: '省博周边简餐', type: '餐饮', note: '中午就近吃简餐，给下午东湖步行留体力；如果带孩子或长辈，可把午休时间拉长。', lat: 30.5598, lng: 114.3656, cost: 60 },
        { time: '14:30', name: '东湖听涛景区', type: '景点', note: '下午安排湖边轻徒步，体力好可接一段绿道骑行，夏季注意防晒和补水。', lat: 30.5592, lng: 114.3774, cost: 0 },
        { time: '18:30', name: '楚河汉街', type: '餐饮', note: '晚餐安排在楚河汉街，餐厅选择多，适合结束东湖日后轻松收尾。', lat: 30.5597, lng: 114.3396, cost: 110 },
      ],
    },
    {
      day: 3,
      title: '汉口租界建筑与江滩',
      routeSummary: '古德寺 -> 黎黄陂路 -> 汉口江滩 -> 吉庆街',
      spots: [
        { time: '09:30', name: '古德寺', type: '景点', note: '建筑风格很特别，建议上午去避开人流，拍照时注意保持安静。', lat: 30.6288, lng: 114.3042, cost: 13 },
        { time: '12:00', name: '黎黄陂路', type: '餐饮', note: '午餐和咖啡都放在黎黄陂路周边，顺便看老租界街区和洋行建筑。', lat: 30.5903, lng: 114.2995, cost: 95 },
        { time: '15:30', name: '汉口江滩', type: '景点', note: '下午到江滩散步，路线不要排太满，留时间看江风和城市天际线。', lat: 30.5946, lng: 114.3072, cost: 0 },
        { time: '19:00', name: '吉庆街', type: '餐饮', note: '晚餐安排武汉小吃和排档氛围，适合把热干面之外的本地菜补齐。', lat: 30.588, lng: 114.2839, cost: 100 },
      ],
    },
    {
      day: 4,
      title: '大学街区与光谷慢逛',
      routeSummary: '武汉大学 -> 珞珈山 / 凌波门 -> 光谷广场',
      spots: [
        { time: '09:30', name: '武汉大学', type: '景点', note: '避开樱花季高峰也值得逛，重点看老斋舍、珞珈山一带，进校政策出发前再确认。', lat: 30.5391, lng: 114.3596, cost: 0 },
        { time: '12:30', name: '广八路 / 街道口午餐', type: '餐饮', note: '午餐放在学生街区，选择更接地气，价格也比景区友好。', lat: 30.5277, lng: 114.3546, cost: 55 },
        { time: '15:00', name: '凌波门东湖栈道', type: '景点', note: '如果天气好，安排一段湖边散步；如果下雨，可改去商场或咖啡馆。', lat: 30.5428, lng: 114.3744, cost: 0 },
        { time: '18:30', name: '光谷步行街', type: '餐饮', note: '晚上到光谷吃饭和补购物，适合年轻同行或想要热闹氛围的行程。', lat: 30.5066, lng: 114.4003, cost: 95 },
      ],
    },
    {
      day: 5,
      title: '过早收尾与返程',
      routeSummary: '山海关路过早 -> 武汉美术馆 / 商圈 -> 返程交通',
      spots: [
        { time: '08:30', name: '山海关路过早', type: '餐饮', note: '最后一天用“过早”收尾，热干面、三鲜豆皮、蛋酒可按胃口组合，不建议排太多队。', lat: 30.5986, lng: 114.3047, cost: 35 },
        { time: '10:30', name: '武汉美术馆（汉口馆）', type: '景点', note: '返程日前半天安排室内项目，节奏稳定，也方便遇到雨天时替换。', lat: 30.585, lng: 114.2894, cost: 0 },
        { time: '13:30', name: '武汉天地 / 江汉路补给', type: '餐饮', note: '午餐和伴手礼放在交通便利的商圈，避免最后一天跨区奔波。', lat: 30.6073, lng: 114.3077, cost: 90 },
        { time: '16:00', name: '返程交通', type: '交通', note: '去武汉站或天河机场都建议预留充足时间，晚高峰前出发更稳。', lat: 30.6072, lng: 114.424, cost: 80 },
      ],
    },
  ],
}

const fitDetailedCityPlans = (city: string, days: number) => {
  const plans = detailedCityPlans[city]
  if (!plans?.length) return null
  return Array.from({ length: days }, (_, index) => {
    const base = plans[Math.min(index, plans.length - 1)]
    if (index < plans.length) {
      return {
        ...base,
        day: index + 1,
        spots: base.spots.map((spot) => ({ ...spot })),
      }
    }
    return {
      day: index + 1,
      title: `${city} 机动深度日`,
      routeSummary: `${city} 备选街区 -> 在地餐饮 -> 轻松收尾`,
      spots: [
        { time: '10:00', name: `${city} 备选街区`, type: '景点', note: '把这一天留给天气、体力和临时想去的地方，避免长行程过度紧绷。' },
        { time: '13:00', name: `${city} 在地餐饮`, type: '餐饮', note: '优先选择离上午区域近的餐厅，减少跨城交通时间。' },
        { time: '17:30', name: `${city} 酒店休整`, type: '酒店', note: '傍晚回酒店整理行李或休息，给第二天留出体力。' },
      ],
    } satisfies DayPlan
  })
}

const buildDetailedCityDayPlans = (city: string, profile: TravelProfile) => {
  const days = Math.max(2, Math.min(extractDays(profile.dateRange), 7))
  return fitDetailedCityPlans(city, days) ?? buildGenericDayPlans(city, profile)
}

const buildCityHighlights = (city: string) => {
  if (city === '武汉') {
    return ['黄鹤楼与长江大桥首日建立城市印象', '东湖与湖北省博适合安排完整一日', '汉口老租界、江滩和过早路线更有本地生活感']
  }
  return [`已按你指定的 ${city} 生成方案`, '路线会尽量落到真实街区与餐饮区域', '预算和准备清单会跟随画像更新']
}

const buildCityMatchReason = (city: string) => {
  if (city === '武汉') {
    return '武汉适合把历史地标、长江夜色、东湖绿道和过早美食串成一条节奏清晰的城市旅行线。'
  }
  return `你已经明确指定目的地为 ${city}，系统现在会优先输出 ${city} 方案，而不是替换成其他模板城市。`
}

const inferCountry = (city: string, profile: TravelProfile) => {
  if (domesticCities.has(city)) return '中国'
  if (profile.destinationIntent.includes('出境')) return '海外'
  return '中国'
}

const buildCityPolicyCards = (city: string): PolicyCard[] => [
  {
    title: '气候提醒',
    summary: cityClimateNotes[city] ?? `${city} 的天气和体感会随季节变化，建议出发前按当地预报准备外套、雨具和舒适步行鞋。`,
    level: '重要',
  },
  {
    title: '交通提醒',
    summary: `${city} 行程建议提前确认机场 / 高铁站到酒店的接驳时间，跨区移动尽量避开早晚高峰。`,
    level: '建议',
  },
  {
    title: '预订提醒',
    summary: `${city} 热门商圈和景点周边住宿建议提前锁定，餐厅和展馆类项目可优先预约。`,
    level: '提醒',
  },
]

const knownCityNames = Array.from(new Set([
  ...Array.from(domesticCities),
  ...destinationTemplates.map((item) => normalizeCityName(item.recommendation.city)),
]))

const hasMismatchedCityMention = (value: string, city: string) =>
  knownCityNames.some((name) => name && name !== city && value.includes(name))

const ensureCityScopedPolicyCards = (cards: PolicyCard[], city: string) => {
  const cityCards = buildCityPolicyCards(city)
  if (!Array.isArray(cards) || cards.length === 0) return cityCards

  const cleaned = cards.map((card, index) => {
    const text = `${card.title} ${card.summary}`
    if (hasMismatchedCityMention(text, city)) {
      return cityCards[Math.min(index, cityCards.length - 1)]
    }
    return card
  })

  const climateIndex = cleaned.findIndex((card) => /气候|天气|温度|体感/.test(`${card.title}${card.summary}`))
  if (climateIndex >= 0 && !cleaned[climateIndex].summary.includes(city)) {
    cleaned[climateIndex] = cityCards[0]
  }

  return cleaned.length >= 2 ? cleaned : [...cleaned, ...cityCards.slice(cleaned.length)]
}

const userFacingSpotNote = (note: string, city: string) => {
  if (/通用占位|接入实时\s*POI|替换成具体|通用城市骨架|细化到具体点位|真实的点位/.test(note)) {
    return `这段安排会围绕 ${city} 的实际动线展开，适合根据当天体力和天气灵活调整。`
  }
  return note
}

const needsDetailedCityUpgrade = (plan: TravelPlan, city: string) =>
  Boolean(detailedCityPlans[city]) &&
  plan.dayPlans.some((dayPlan) => {
    const text = [
      dayPlan.title,
      dayPlan.routeSummary,
      ...dayPlan.spots.flatMap((spot) => [spot.name, spot.note]),
    ].join(' ')
    return /地标景点|主题街区|特色体验|在地社区|备选景点|周边目的地|市中心漫步|核心区轻松走一圈/.test(text)
  })

export const ensurePlanCityConsistency = (plan: TravelPlan): TravelPlan => {
  const city = normalizeCityName(plan.selectedRecommendation.city)
  if (!city) return plan
  const upgradedDayPlans = needsDetailedCityUpgrade(plan, city)
    ? fitDetailedCityPlans(city, plan.dayPlans.length) ?? plan.dayPlans
    : plan.dayPlans
  return {
    ...plan,
    policyCards: ensureCityScopedPolicyCards(plan.policyCards, city),
    outfitSuggestions: selectOutfitsForTrip({ ...createEmptyProfile(), destinationCity: city }, city),
    dayPlans: upgradedDayPlans.map((dayPlan) => ({
      ...dayPlan,
      routeSummary: userFacingSpotNote(dayPlan.routeSummary, city),
      spots: dayPlan.spots.map((spot) => ({
        ...spot,
        note: userFacingSpotNote(spot.note, city),
      })),
    })),
    notes: plan.notes
      .map((note) => userFacingSpotNote(note, city))
      .filter((note) => !/自动替换成东京\/成都|通用骨架/.test(note)),
  }
}

const buildRequestedCityPlan = (
  profile: TravelProfile,
  ranked: Array<{ template: (typeof destinationTemplates)[number]; recommendation: DestinationRecommendation }>,
  requestedCity: string,
  recommendations: DestinationRecommendation[],
): TravelPlan => {
  const preferOutbound = profile.destinationIntent.includes('出境')
  const base =
    ranked.find((item) => (preferOutbound ? item.template.recommendation.country !== '中国' : item.template.recommendation.country === '中国')) ??
    ranked[0]
  const budget = buildBudget({ ...base.template.baseBudget, total: 0 }, profile)
  const selectedRecommendation: DestinationRecommendation = {
    id: `custom-${requestedCity}`,
    city: requestedCity,
    country: inferCountry(requestedCity, profile),
    score: 98,
    bestWindow: profile.dateRange || '按季节灵活安排',
    highlights: buildCityHighlights(requestedCity),
    reasons: buildReasons(profile, requestedCity),
    matchReason: buildCityMatchReason(requestedCity),
    coverImage: imageFromPrompt(`${requestedCity} travel destination, premium editorial style, realistic cityscape, warm light, mobile app hero image`),
    weatherSummary: `${requestedCity} 行程会按季节、天气和你的偏好灵活调整，优先保证步行舒适度。`,
    mapCenter: cityCenters[requestedCity] ?? base.template.recommendation.mapCenter,
  }

  return alignPlanDayCount({
    recommendations,
    selectedRecommendation,
    dayPlans: buildDetailedCityDayPlans(requestedCity, profile),
    budget,
    policyCards: buildCityPolicyCards(requestedCity),
    monitors: buildMonitors(
      `custom-${requestedCity}`,
      `${profile.departureCity || '你的出发地'} -> ${requestedCity} 往返`,
      `${requestedCity} 市区酒店`,
      budget,
    ),
    packingGroups: base.template.packingGroups,
    outfitSuggestions: selectOutfitsForTrip(profile, requestedCity),
    insuranceRecommendations: base.template.insuranceRecommendations,
    notes: [
      `当前方案已按 ${requestedCity} 安排，路线会优先围绕目的地本身展开。`,
      '如果你告诉我更具体的偏好，我可以继续把每天安排得更贴近你的兴趣。',
    ],
  }, profile)
}

        export function buildTravelPlan(profile: TravelProfile, selectedId?: string): TravelPlan {
          const requestedCity = normalizeCityName(profile.destinationCity)
          const ranked = destinationTemplates
            .map((template) => {
              const score = scoreTemplate(template.recommendation, profile, template.keywordWeights)
              return {
                template,
                recommendation: {
                  ...template.recommendation,
                  score,
                  reasons: buildReasons(profile, template.recommendation.city),
                  matchReason: `和你的“${profile.destinationIntent || '旅行愿望'}”匹配度较高，且路线与预算更好控。`,
                },
              }
            })
            .sort((left, right) => right.recommendation.score - left.recommendation.score)

          const exactRequestedTemplate = requestedCity
            ? ranked.find((item) => normalizeCityName(item.recommendation.city) === requestedCity)
            : undefined

          const customRequestedRecommendation =
            requestedCity && !exactRequestedTemplate
              ? {
                  id: `custom-${requestedCity}`,
                  city: requestedCity,
                  country: inferCountry(requestedCity, profile),
                  score: 98,
                  bestWindow: profile.dateRange || '按季节灵活安排',
                  highlights: buildCityHighlights(requestedCity),
                  reasons: buildReasons(profile, requestedCity),
                  matchReason: buildCityMatchReason(requestedCity),
                  coverImage: imageFromPrompt(`${requestedCity} travel destination, premium editorial style, realistic cityscape, warm light, mobile app hero image`),
                  weatherSummary: `${requestedCity} 行程会按季节、天气和你的偏好灵活调整，优先保证步行舒适度。`,
                  mapCenter: cityCenters[requestedCity] ?? ranked[0].template.recommendation.mapCenter,
                }
              : null

          const recommendations = customRequestedRecommendation
            ? [customRequestedRecommendation, ...ranked.map((item) => item.recommendation)]
            : ranked.map((item) => item.recommendation)

          if (customRequestedRecommendation && (!selectedId || selectedId === customRequestedRecommendation.id)) {
            return ensurePlanCityConsistency(buildRequestedCityPlan(profile, ranked, requestedCity, recommendations))
          }

          const selected = ranked.find((item) => item.recommendation.id === selectedId) ?? exactRequestedTemplate ?? ranked[0]
          const days = extractDays(profile.dateRange)
          const dayPlans = selected.template.dayPlans.slice(0, Math.max(2, Math.min(days, selected.template.dayPlans.length)))
          const budget = buildBudget({ ...selected.template.baseBudget, total: 0 }, profile)

          return ensurePlanCityConsistency(alignPlanDayCount({
            recommendations,
            selectedRecommendation: selected.recommendation,
            dayPlans,
            budget,
            policyCards: selected.template.policyCards,
            monitors: buildMonitors(
              selected.template.recommendation.id,
              selected.template.flightTarget,
              selected.template.hotelTarget,
              budget,
            ),
            packingGroups: selected.template.packingGroups,
            outfitSuggestions: selectOutfitsForTrip(profile, selected.recommendation.city),
            insuranceRecommendations: selected.template.insuranceRecommendations,
            notes: selected.template.notes,
          }, profile))
        }

        export const summarizeRoute = (dayPlans: DayPlan[]) =>
          dayPlans.flatMap((plan) => plan.spots).filter((spot) => spot.lat && spot.lng)

export async function buildTravelPlanAsync(profile: TravelProfile, selectedId?: string) {
  try {
    const preferredDestination =
      profile.destinationCity || destinationTemplates.find((item) => item.recommendation.id === selectedId)?.recommendation.city
    const llmPlan = await generatePlanWithLLM(profile, preferredDestination)
    if (llmPlan) {
      return ensurePlanCityConsistency(llmPlan)
    }
    return ensurePlanCityConsistency(buildTravelPlan(profile, selectedId))
  } catch {
    return ensurePlanCityConsistency(buildTravelPlan(profile, selectedId))
  }
}
