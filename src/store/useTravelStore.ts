import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { enrichPlanWithAmap } from '@/services/poiEnrichment'
import { buildTravelPlanAsync, collectConversationTurn, ensurePlanCityConsistency, getMissingFields } from '@/services/planner'
import { emitTelemetry } from '@/services/telemetry'
import { createEmptyProfile, type ChatMessage, type RequiredField, type TravelPlan, type TravelProfile } from '@/types/travel'

type TravelState = {
  profile: TravelProfile
  messages: ChatMessage[]
  plan: TravelPlan | null
  activeRecommendationId: string
  expectedField: RequiredField | ''
  lastSummary: string
  isGenerating: boolean
  submitMessage: (text: string) => Promise<void>
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
        if (!trimmed) return

        void emitTelemetry('chat.user', { content: trimmed })

        set((state) => ({
          messages: [...state.messages, createMessage('user', trimmed)],
          isGenerating: true,
        }))

        try {
          const turn = await collectConversationTurn(get().profile, trimmed, get().expectedField || undefined)
          void emitTelemetry('chat.assistant', { content: turn.assistantMessage, summary: turn.summary })
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
            return
          }

          set((state) => ({
            messages: [...state.messages, createMessage('assistant', '信息已收齐，我正在生成行程、地图节点和准备清单，稍等片刻。')],
          }))

          if (turn.shouldGeneratePlan) {
            const rawPlan = await buildTravelPlanAsync(turn.profile, get().activeRecommendationId || undefined)
            void emitTelemetry('plan.generated', {
              destination: rawPlan.selectedRecommendation?.city,
              budget: rawPlan.budget,
            })
            nextState.plan = rawPlan
            nextState.activeRecommendationId = rawPlan.selectedRecommendation.id
            nextState.expectedField = ''
            refinePlanWithAmapInBackground(rawPlan, turn.profile)
          }

          set((state) => ({
            ...state,
            ...nextState,
            isGenerating: false,
            messages: [
              ...state.messages,
              createMessage('assistant', `已生成 ${nextState.plan?.selectedRecommendation.city || '目的地'} 方案，可切换到底部“行程”和“准备”查看。`),
            ],
          }))
        } catch (error) {
          void emitTelemetry('plan.error', { error: String(error?.message || error) })
          set((state) => ({
            ...state,
            isGenerating: false,
            messages: [
              ...state.messages,
              createMessage('assistant', '我刚刚在生成方案时遇到了一点问题。你可以再点一次“生成旅行方案”，或换一种说法补充需求，我会重新生成。'),
            ],
          }))
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
          const rawPlan = await buildTravelPlanAsync(profile, get().activeRecommendationId || undefined)
          void emitTelemetry('plan.generated', {
            destination: rawPlan.selectedRecommendation?.city,
            budget: rawPlan.budget,
          })
          refinePlanWithAmapInBackground(rawPlan, profile)
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
          const rawPlan = await buildTravelPlanAsync(profile, id)
          void emitTelemetry('plan.switched', { destination: rawPlan.selectedRecommendation?.city, id })
          set({ plan: rawPlan, activeRecommendationId: rawPlan.selectedRecommendation.id, expectedField: '', isGenerating: false })
          refinePlanWithAmapInBackground(rawPlan, profile)
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
