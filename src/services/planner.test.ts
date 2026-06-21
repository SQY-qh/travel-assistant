import { describe, expect, it } from 'vitest'
import { applyShenzhenShanghaiPlanAdjustment } from '@/data/localShanghaiPlan'
import { buildTravelPlan, collectConversationTurn, ensurePlanCityConsistency, extractProfileFromText, getMissingFields } from '@/services/planner'
import { alignPlanDayCount } from '@/services/llmPlan'
import { createEmptyProfile } from '@/types/travel'

describe('planner service', () => {
  it('从中文需求中提取核心旅行画像', () => {
    const profile = extractProfileFromText(
      createEmptyProfile(),
      '我想从上海出发，8月去一个适合情侣的城市玩4天，预算9000，住精品酒店。',
    )

    expect(profile.departureCity).toBe('上海')
    expect(profile.dateRange).toContain('4天')
    expect(profile.travelers).toContain('情侣')
    expect(profile.budgetLevel).toBe('中等预算')
    expect(profile.accommodationPreference).toBe('精品酒店')
    expect(profile.destinationIntent).toBeTruthy()
  })

  it('在信息不全时返回待补充字段', async () => {
    const result = await collectConversationTurn(createEmptyProfile(), '我想去海边放松一下')

    expect(getMissingFields(result.profile).length).toBeGreaterThan(0)
    expect(result.assistantMessage.length).toBeGreaterThan(8)
    expect(result.shouldGeneratePlan).toBe(false)
  })

  it('在信息完整时可以生成旅行方案', () => {
    const plan = buildTravelPlan({
      ...createEmptyProfile(),
      departureCity: '杭州',
      destinationCity: '新加坡',
      destinationIntent: '亲子轻松出游',
      dateRange: '7月 · 5天',
      travelers: '亲子',
      budgetLevel: '中等预算',
      travelStyle: ['亲子', '轻松'],
      accommodationPreference: '亲子酒店',
      transportPreference: '飞机',
      visaStatus: '免签',
      notes: '需要价格监控',
    })

    expect(plan.recommendations).toHaveLength(3)
    expect(plan.dayPlans.length).toBe(5)
    expect(plan.budget.total).toBeGreaterThan(0)
    expect(plan.monitors[0].trend).toHaveLength(6)
  })

  it('模板城市也应按用户输入扩展到要求天数，而不是被模板天数截断', () => {
    const plan = buildTravelPlan({
      ...createEmptyProfile(),
      departureCity: '深圳',
      destinationCity: '成都',
      destinationIntent: '情侣出游',
      dateRange: '6月1号 · 5天',
      travelers: '情侣',
      budgetLevel: '中等预算',
      travelStyle: ['轻松', '美食'],
      accommodationPreference: '精品酒店',
      transportPreference: '飞机',
      visaStatus: '',
      notes: '',
    })

    expect(plan.selectedRecommendation.city).toBe('成都')
    expect(plan.dayPlans).toHaveLength(5)
    expect(plan.dayPlans[4].day).toBe(5)
  })

  it('用户明确指定模板外城市时，不应回退成其他城市方案', () => {
    const plan = buildTravelPlan({
      ...createEmptyProfile(),
      departureCity: '杭州',
      destinationCity: '深圳',
      destinationIntent: '城市漫游',
      dateRange: '6月中 · 7天',
      travelers: '情侣',
      budgetLevel: '紧凑预算',
      travelStyle: ['城市', '轻松'],
      accommodationPreference: '精品酒店',
      transportPreference: '高铁',
      visaStatus: '',
      notes: '需要价格监控',
    })

    expect(plan.selectedRecommendation.city).toBe('深圳')
    expect(plan.notes[0]).toContain('深圳')
    expect(plan.monitors[0].target).toContain('深圳')
  })

  it('用户明确指定沈阳时，地图中心不应回退到北京', () => {
    const plan = buildTravelPlan({
      ...createEmptyProfile(),
      departureCity: '上海',
      destinationCity: '沈阳',
      destinationIntent: '历史文化深度游',
      dateRange: '7月 · 3天',
      travelers: '情侣',
      budgetLevel: '中等预算',
      travelStyle: ['历史', '城市'],
      accommodationPreference: '精品酒店',
      transportPreference: '飞机',
      visaStatus: '',
      notes: '需要价格监控',
    })

    expect(plan.selectedRecommendation.city).toBe('沈阳')
    expect(plan.selectedRecommendation.mapCenter).toEqual([123.4315, 41.8057])
    expect(plan.selectedRecommendation.mapCenter).not.toEqual([116.4074, 39.9042])
  })

  it('用户明确指定上海时，封面不应使用穿搭图', () => {
    const plan = buildTravelPlan({
      ...createEmptyProfile(),
      departureCity: '北京',
      destinationCity: '上海',
      destinationIntent: '城市漫游',
      dateRange: '7月 · 3天',
      travelers: '情侣',
      budgetLevel: '中等预算',
      travelStyle: ['城市', '轻松'],
      accommodationPreference: '精品酒店',
      transportPreference: '高铁',
      visaStatus: '',
      notes: '',
    })

    expect(plan.selectedRecommendation.city).toBe('上海')
    expect(plan.selectedRecommendation.coverImage).toContain('destinations/shanghai.svg')
    expect(plan.selectedRecommendation.coverImage).not.toContain('outfits')
  })

  it('深圳到上海 7 月 1 日情侣 5 天游应使用专属细化方案', () => {
    const profile = extractProfileFromText(
      createEmptyProfile(),
      '深圳到上海/7月1号出发玩5天/情侣出游/预算1万',
    )
    const plan = buildTravelPlan(profile)

    expect(profile.departureCity).toBe('深圳')
    expect(profile.destinationCity).toBe('上海')
    expect(plan.source).toBe('local-preset')
    expect(plan.localOnly).toBe(true)
    expect(plan.selectedRecommendation.city).toBe('上海')
    expect(plan.dayPlans).toHaveLength(5)
    expect(plan.bookingComparison?.options).toHaveLength(3)
    expect(plan.bookingComparison?.recommendedOptionId).toBe('baseline')
    expect(plan.spotRecommendations?.length).toBeGreaterThanOrEqual(4)
    expect(plan.contingencyPlans?.length).toBeGreaterThanOrEqual(4)
    expect(plan.spotRecommendations?.every((spot) => Boolean(spot.imageUrl))).toBe(true)
    expect(plan.bookingComparison?.hotelOptions?.every((hotel) => Boolean(hotel.imageUrl))).toBe(true)
    expect(plan.outfitSuggestions.some((outfit) => outfit.scenario === '海边度假')).toBe(false)

    const visibleText = [
      plan.selectedRecommendation.matchReason,
      ...plan.policyCards.flatMap((card) => [card.title, card.summary]),
      ...plan.notes,
      plan.bookingComparison?.title,
      plan.bookingComparison?.baseline,
      plan.bookingComparison?.summary,
      ...(plan.bookingComparison?.insights ?? []),
    ].join(' ')

    expect(visibleText).not.toMatch(/本地预存|离线时间轴|不加载|不调用|不依赖|远程模型|远程路线|API Key|secrets/)
  })

  it('深圳到上海本地方案支持用户说“7月1号出游”直接生成', async () => {
    const result = await collectConversationTurn(
      createEmptyProfile(),
      '出发地深圳，目的地上海，7月1号出游，玩5天，情侣出游，预算1万',
    )
    const plan = buildTravelPlan(result.profile)

    expect(result.shouldGeneratePlan).toBe(true)
    expect(plan.source).toBe('local-preset')
    expect(plan.selectedRecommendation.city).toBe('上海')
    expect(result.assistantMessage).toContain('迪士尼下雨怎么办')
  })

  it('深圳到上海本地方案可在对话中触发临时改行程', () => {
    const profile = extractProfileFromText(
      createEmptyProfile(),
      '出发地深圳，目的地上海，7月1号出游，玩5天，情侣出游，预算1万',
    )
    const plan = buildTravelPlan(profile)
    const adjusted = applyShenzhenShanghaiPlanAdjustment(plan, '如果迪士尼那天下雨怎么办')

    expect(adjusted).not.toBeNull()
    expect(adjusted?.plan.dayPlans.find((day) => day.day === 3)?.title).toContain('雨天')
    expect(adjusted?.plan.dayPlans.find((day) => day.day === 4)?.title).toContain('迪士尼')
    expect(adjusted?.message).toContain('Day 3')
  })

  it('旧缓存中的穿搭封面应按当前城市修正为目的地封面', () => {
    const plan = buildTravelPlan({
      ...createEmptyProfile(),
      departureCity: '北京',
      destinationCity: '上海',
      destinationIntent: '城市漫游',
      dateRange: '7月 · 3天',
      travelers: '情侣',
      budgetLevel: '中等预算',
      travelStyle: ['城市'],
      accommodationPreference: '',
      transportPreference: '高铁',
      visaStatus: '',
      notes: '',
    })

    const repaired = ensurePlanCityConsistency({
      ...plan,
      selectedRecommendation: {
        ...plan.selectedRecommendation,
        coverImage: '/travel-assistant/outfits/citywalk-women.jpg',
      },
      recommendations: plan.recommendations.map((recommendation, index) =>
        index === 0
          ? {
              ...recommendation,
              coverImage: 'outfits/wuhan-citywalk.png',
            }
          : recommendation,
      ),
    })

    expect(repaired.selectedRecommendation.coverImage).toContain('destinations/shanghai.svg')
    expect(repaired.recommendations[0].coverImage).toContain('destinations/shanghai.svg')
  })

  it('切换到其他候选时也应保留用户明确指定的目的地候选', () => {
    const plan = buildTravelPlan(
      {
        ...createEmptyProfile(),
        departureCity: '杭州',
        destinationCity: '海南',
        destinationIntent: '海边放松',
        dateRange: '7月 · 5天',
        travelers: '情侣',
        budgetLevel: '中等预算',
        travelStyle: ['海边', '轻松'],
        accommodationPreference: '海景房',
        transportPreference: '飞机',
        visaStatus: '',
        notes: '需要价格监控',
      },
      'tokyo',
    )

    expect(plan.selectedRecommendation.city).toBe('东京')
    expect(plan.recommendations.some((item) => item.city === '海南')).toBe(true)
  })

  it('应把 LLM 返回的天数校正到用户要求的天数', () => {
    const basePlan = buildTravelPlan({
      ...createEmptyProfile(),
      departureCity: '上海',
      destinationCity: '珠海',
      destinationIntent: '海边放松',
      dateRange: '7月 · 5天',
      travelers: '情侣',
      budgetLevel: '中等预算',
      travelStyle: ['海边', '轻松'],
      accommodationPreference: '海景房',
      transportPreference: '飞机',
      visaStatus: '',
      notes: '',
    })

    const shortenedPlan = {
      ...basePlan,
      dayPlans: basePlan.dayPlans.slice(0, 3),
    }

    const aligned = alignPlanDayCount(shortenedPlan, {
      ...createEmptyProfile(),
      departureCity: '上海',
      destinationCity: '珠海',
      dateRange: '7月 · 5天',
      travelers: '情侣',
      budgetLevel: '中等预算',
      destinationIntent: '海边放松',
      travelStyle: ['海边'],
      accommodationPreference: '',
      transportPreference: '',
      visaStatus: '',
      notes: '',
    })

    expect(aligned.dayPlans).toHaveLength(5)
    expect(aligned.dayPlans[4].day).toBe(5)
    expect(aligned.notes.some((item) => item.includes('5 天'))).toBe(true)
  })
})
