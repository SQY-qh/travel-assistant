import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { enrichPlanWithAmap } from '@/services/poiEnrichment'
import { buildTravelPlan, buildTravelPlanAsync, collectConversationTurn, ensurePlanCityConsistency, extractProfileFromText, getMissingFields } from '@/services/planner'
import { emitTelemetry } from '@/services/telemetry'
import { createEmptyProfile, type ChatMessage, type RequiredField, type TravelPlan, type TravelProfile } from '@/types/travel'

export type SubmitMessageResult = {
  assistantMessages: string[]
  spokenText: string
  shouldGeneratePlan: boolean
}

type TravelState = {
  profile: TravelProfile
  messages: ChatMessage[]
  plan: TravelPlan | null
  activeRecommendationId: string
  expectedField: RequiredField | ''
  lastSummary: string
  isGenerating: boolean
  submitMessage: (text: string) => Promise<SubmitMessageResult | null>
  submitVoiceMessage: (text: string) => Promise<SubmitMessageResult | null>
  generatePlanFromProfile: () => Promise<void>
  selectRecommendation: (id: string) => Promise<void>
  toggleMonitor: (id: string) => void
  resetConversation: () => void
}

const createMessage = (role: ChatMessage['role'], content: string): ChatMessage => ({
  id: `${role}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
  role,
  content,
  timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
})

const initialMessages = [
  createMessage('assistant', '你好，我是 VOYA。你可以像打电话一样直接告诉我：从哪里出发、想去哪里、玩几天、和谁去、预算多少。我会一边收集需求，一边帮你生成行程和预算。'),
]

const voiceFieldQuestions: Record<RequiredField, string> = {
  departureCity: '我听到了。先告诉我你的出发城市，我才能判断交通成本。',
  destinationCity: '我听到了。你想去哪个城市或目的地？也可以说海边、历史、美食这类偏好。',
  dateRange: '我听到了。大概什么时候出发、玩几天？',
  travelers: '我听到了。这次是一个人、情侣、亲子，还是朋友同行？',
  budgetLevel: '我听到了。预算想走紧凑、中等还是高预算？',
}

const summarizeProfile = (profile: TravelProfile) =>
  [
    profile.departureCity ? `从${profile.departureCity}出发` : '',
    profile.destinationCity ? `去${profile.destinationCity}` : '',
    profile.dateRange,
    profile.travelers,
    profile.budgetLevel,
  ]
    .filter(Boolean)
    .join('，') || '暂未收集到关键信息'

export const useTravelStore = create<TravelState>()(
  persist(
    (set, get) => {
      const refinePlanWithAmapInBackground = (basePlan: TravelPlan, profile: TravelProfile) => {
        void enrichPlanWithAmap(basePlan, profile)
          .then((plan) => {
            void emitTelemetry('plan.enriched', {
              destination: plan.selectedRecommendation?.city,
              points: plan.dayPlans.flatMap((dayPlan) => dayPlan.spots).filter((spot) => typeof spot.lng === 'number' && typeof spot.lat === 'number').length,
            })
            set((state) => {
              if (state.activeRecommendationId !== basePlan.selectedRecommendation.id) return state
              return {
                ...state,
                plan,
                activeRecommendationId: plan.selectedRecommendation.id,
              }
            })
          })
          .catch((error) => {
            void emitTelemetry('plan.enrich.error', { error: String(error?.message || error) })
          })
      }

      const refinePlanWithLLMAndAmapInBackground = (basePlan: TravelPlan, profile: TravelProfile, selectedId?: string) => {
        void buildTravelPlanAsync(profile, selectedId)
          .then((llmPlan) => enrichPlanWithAmap(llmPlan, profile))
          .then((plan) => {
            void emitTelemetry('plan.refined', { destination: plan.selectedRecommendation?.city })
            set((state) => {
              if (state.activeRecommendationId !== basePlan.selectedRecommendation.id) return state
              return {
                ...state,
                plan,
                activeRecommendationId: plan.selectedRecommendation.id,
              }
            })
          })
          .catch((error) => {
            void emitTelemetry('plan.refine.error', { error: String(error?.message || error) })
            refinePlanWithAmapInBackground(basePlan, profile)
          })
      }

      return ({
      profile: createEmptyProfile(),
      messages: initialMessages,
      plan: null,
      activeRecommendationId: '',
      expectedField: 'departureCity',
      lastSummary: '暂未收集到关键信息',
      isGenerating: false,
      submitMessage: async (text) => {
        const trimmed = text.trim()
        if (!trimmed) return null
        const assistantMessages: string[] = []

        void emitTelemetry('chat.user', { content: trimmed })

        set((state) => ({
          messages: [...state.messages, createMessage('user', trimmed)],
          isGenerating: true,
        }))

        try {
          const turn = await collectConversationTurn(get().profile, trimmed, get().expectedField || undefined)
          void emitTelemetry('chat.assistant', { content: turn.assistantMessage, summary: turn.summary })
          assistantMessages.push(turn.assistantMessage)
          const nextState: Partial<TravelState> = {
            profile: turn.profile,
            lastSummary: turn.summary,
            expectedField: turn.missingFields[0] ?? '',
          }

          set((state) => ({
            ...state,
            ...nextState,
            isGenerating: turn.shouldGeneratePlan,
            messages: [...state.messages, createMessage('assistant', turn.assistantMessage)],
          }))

          if (!turn.shouldGeneratePlan) {
            return {
              assistantMessages,
              spokenText: turn.assistantMessage,
              shouldGeneratePlan: false,
            }
          }

          const workingMessage = '信息已收齐，我正在生成行程、地图节点和准备清单，稍等片刻。'
          assistantMessages.push(workingMessage)
          set((state) => ({
            messages: [...state.messages, createMessage('assistant', workingMessage)],
          }))

          if (turn.shouldGeneratePlan) {
            const rawPlan = buildTravelPlan(turn.profile, get().activeRecommendationId || undefined)
            void emitTelemetry('plan.generated', {
              destination: rawPlan.selectedRecommendation?.city,
              budget: rawPlan.budget,
            })
            nextState.plan = rawPlan
            nextState.activeRecommendationId = rawPlan.selectedRecommendation.id
            nextState.expectedField = ''
            if (!rawPlan.localOnly) {
              refinePlanWithLLMAndAmapInBackground(rawPlan, turn.profile, get().activeRecommendationId || undefined)
            }
          }

          const finalMessage = `已生成 ${nextState.plan?.selectedRecommendation.city || '目的地'} 方案，可切换到底部“行程”和“准备”查看。`
          assistantMessages.push(finalMessage)
          set((state) => ({
            ...state,
            ...nextState,
            isGenerating: false,
            messages: [
              ...state.messages,
              createMessage('assistant', finalMessage),
            ],
          }))

          return {
            assistantMessages,
            spokenText: finalMessage,
            shouldGeneratePlan: true,
          }
        } catch (error) {
          void emitTelemetry('plan.error', { error: String(error?.message || error) })
          const errorMessage = '我刚刚在生成方案时遇到了一点问题。你可以再点一次“生成旅行方案”，或换一种说法补充需求，我会重新生成。'
          assistantMessages.push(errorMessage)
          set((state) => ({
            ...state,
            isGenerating: false,
            messages: [
              ...state.messages,
              createMessage('assistant', errorMessage),
            ],
          }))
          return {
            assistantMessages,
            spokenText: errorMessage,
            shouldGeneratePlan: false,
          }
        }
      },
      submitVoiceMessage: async (text) => {
        const trimmed = text.trim()
        if (!trimmed) return null

        void emitTelemetry('voice.user', { content: trimmed })
        set((state) => ({
          messages: [...state.messages, createMessage('user', trimmed)],
          isGenerating: true,
        }))

        try {
          const profile = extractProfileFromText(get().profile, trimmed, get().expectedField || undefined)
          const missingFields = getMissingFields(profile)
          const summary = summarizeProfile(profile)

          if (missingFields.length > 0) {
            const spokenText = voiceFieldQuestions[missingFields[0]]
            set((state) => ({
              ...state,
              profile,
              lastSummary: summary,
              expectedField: missingFields[0],
              isGenerating: false,
              messages: [...state.messages, createMessage('assistant', spokenText)],
            }))
            return {
              assistantMessages: [spokenText],
              spokenText,
              shouldGeneratePlan: false,
            }
          }

          const rawPlan = buildTravelPlan(profile, get().activeRecommendationId || undefined)
          void emitTelemetry('voice.plan.generated', {
            destination: rawPlan.selectedRecommendation?.city,
            budget: rawPlan.budget,
          })
          if (!rawPlan.localOnly) {
            refinePlanWithLLMAndAmapInBackground(rawPlan, profile, get().activeRecommendationId || undefined)
          }

          const spokenText = `好的，我已生成 ${rawPlan.selectedRecommendation.city} 方案。你可以继续告诉我想调整的景点、节奏或预算。`
          set((state) => ({
            ...state,
            profile,
            lastSummary: summary,
            expectedField: '',
            isGenerating: false,
            plan: rawPlan,
            activeRecommendationId: rawPlan.selectedRecommendation.id,
            messages: [...state.messages, createMessage('assistant', spokenText)],
          }))

          return {
            assistantMessages: [spokenText],
            spokenText,
            shouldGeneratePlan: true,
          }
        } catch (error) {
          void emitTelemetry('voice.error', { error: String(error?.message || error) })
          const spokenText = '我刚刚理解时遇到了一点问题。你可以再说一遍，或者点“字”手动输入。'
          set((state) => ({
            ...state,
            isGenerating: false,
            messages: [...state.messages, createMessage('assistant', spokenText)],
          }))
          return {
            assistantMessages: [spokenText],
            spokenText,
            shouldGeneratePlan: false,
          }
        }
      },
      generatePlanFromProfile: async () => {
        const profile = get().profile
        const missing = getMissingFields(profile)
        if (missing.length > 0) {
          set({ expectedField: missing[0] })
          set((state) => ({
            messages: [
              ...state.messages,
              createMessage('assistant', '我还缺少一些关键信息，至少需要出发地、目的地意向、时间、同行人和预算档位。你补充一句话给我，我就继续帮你生成。'),
            ],
          }))
          return
        }
        set({ isGenerating: true })
        try {
          const rawPlan = buildTravelPlan(profile, get().activeRecommendationId || undefined)
          void emitTelemetry('plan.generated', {
            destination: rawPlan.selectedRecommendation?.city,
            budget: rawPlan.budget,
          })
          if (!rawPlan.localOnly) {
            refinePlanWithLLMAndAmapInBackground(rawPlan, profile, get().activeRecommendationId || undefined)
          }
          set((state) => ({
            ...state,
            isGenerating: false,
            plan: rawPlan,
            activeRecommendationId: rawPlan.selectedRecommendation.id,
            expectedField: '',
            messages: [
              ...state.messages,
              createMessage('assistant', `已根据你的条件生成 ${rawPlan.selectedRecommendation.city} 方案，你现在可以去查看路线、预算、价格监控和出行准备了。`),
            ],
          }))
        } catch (error) {
          void emitTelemetry('plan.error', { error: String(error?.message || error) })
          set((state) => ({
            ...state,
            isGenerating: false,
            messages: [
              ...state.messages,
              createMessage('assistant', '我刚刚生成方案失败了。你可以稍后再试，或先描述一个更具体的城市与天数，我会更容易生成。'),
            ],
          }))
        }
      },
      selectRecommendation: async (id) => {
        const profile = get().profile
        set({ isGenerating: true })
        try {
          const rawPlan = buildTravelPlan(profile, id)
          void emitTelemetry('plan.switched', { destination: rawPlan.selectedRecommendation?.city, id })
          set({ plan: rawPlan, activeRecommendationId: rawPlan.selectedRecommendation.id, expectedField: '', isGenerating: false })
          if (!rawPlan.localOnly) {
            refinePlanWithLLMAndAmapInBackground(rawPlan, profile, id)
          }
        } catch (error) {
          void emitTelemetry('plan.error', { error: String(error?.message || error) })
          set({ isGenerating: false })
        }
      },
      toggleMonitor: (id) => {
        const currentPlan = get().plan
        if (!currentPlan) return
        set({
          plan: {
            ...currentPlan,
            monitors: currentPlan.monitors.map((item) =>
              item.id === id ? { ...item, enabled: !item.enabled } : item,
            ),
          },
        })
      },
      resetConversation: () =>
        set({
          profile: createEmptyProfile(),
          messages: initialMessages,
          plan: null,
          activeRecommendationId: '',
          expectedField: 'departureCity',
          lastSummary: '暂未收集到关键信息',
          isGenerating: false,
        }),
      })
    },
    {
      name: 'voya-travel-store',
      partialize: (state) => ({
        profile: state.profile,
        messages: state.messages,
        plan: state.plan,
        activeRecommendationId: state.activeRecommendationId,
        lastSummary: state.lastSummary,
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<TravelState> | undefined
        return {
          ...currentState,
          ...persisted,
          profile: {
            ...createEmptyProfile(),
            ...(persisted?.profile ?? {}),
          },
          plan: persisted?.plan ? ensurePlanCityConsistency(persisted.plan) : currentState.plan,
          expectedField: 'departureCity',
        }
      },
    },
  ),
)
