import { FormEvent, useMemo, useState } from 'react'
import { Mic, RefreshCcw, SendHorizonal, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import ChatMessage from '@/components/chat/ChatMessage'
import QuickPromptStrip from '@/components/chat/QuickPromptStrip'
import SectionCard from '@/components/common/SectionCard'
import VoyaAvatar from '@/components/common/VoyaAvatar'
import { useTravelStore } from '@/store/useTravelStore'

const summaryLabels: Record<string, string> = {
  departureCity: '出发地',
  destinationCity: '目的地',
  destinationIntent: '目的地意向',
  dateRange: '时间',
  travelers: '同行人',
  budgetLevel: '预算',
  accommodationPreference: '住宿',
  transportPreference: '交通',
  visaStatus: '签证',
}

export default function Home() {
  const navigate = useNavigate()
  const [input, setInput] = useState('')
  const { messages, profile, plan, lastSummary, isGenerating, submitMessage, generatePlanFromProfile, resetConversation } = useTravelStore()
  const trimmedInput = input.trim()

  const summaryItems = useMemo(
    () =>
      Object.entries(profile)
        .filter(([, value]) => typeof value === 'string' && value)
        .map(([field, value]) => ({ label: summaryLabels[field] ?? field, value: value as string }))
        .slice(0, 8),
    [profile],
  )

  const latestAssistantIndex = useMemo(() => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      if (messages[index].role === 'assistant') return index
    }
    return -1
  }, [messages])

  const liveVoyaState = isGenerating ? 'talking' : trimmedInput ? 'listening' : messages.length > 1 ? 'nodding' : 'greeting'

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const payload = input.trim()
    if (!payload) return
    setInput('')
    await submitMessage(payload)
  }

  const sendQuickPrompt = async (value: string) => {
    await submitMessage(value)
  }

  return (
    <div className="space-y-4 pb-4">
      <SectionCard title="语音助手模式" eyebrow="Live Session">
        <div className="rounded-[26px] bg-[radial-gradient(circle_at_top,_rgba(255,229,166,0.9),_rgba(255,247,230,0.92)_45%,_rgba(249,245,239,0.9)_100%)] px-4 pb-4 pt-5 text-center shadow-inner">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-[11px] tracking-[0.2em] text-stone-500 shadow-sm">
            <span className="flex gap-1">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400 [animation-delay:120ms]" />
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-300 [animation-delay:240ms]" />
            </span>
            通话采集中
          </div>
          <VoyaAvatar state={liveVoyaState} size="hero" />
                  <h2 className="font-display mt-3 text-2xl text-stone-900">{isGenerating ? 'VOYA 正在说...' : 'VOYA 正在听...'}</h2>
          <p className="mt-2 text-xs leading-6 text-stone-500">告诉我你的出发地、旅行风格、日期和预算，我会逐步把需求补齐。</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {['推荐景点', '当地美食', '交通路线', '购物推荐'].map((item) => (
              <span key={item} className="rounded-full bg-white/80 px-3 py-2 text-[11px] text-stone-600 shadow-sm">
                {item}
              </span>
            ))}
          </div>
        </div>
      </SectionCard>

      <SectionCard title="已收集需求" eyebrow="Travel Profile">
        <p className="text-xs leading-6 text-stone-500">{lastSummary}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {summaryItems.length ? (
            summaryItems.map((item) => (
              <span key={item.label} className="rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-stone-700">
                {item.label} · {item.value}
              </span>
            ))
          ) : (
            <span className="rounded-full bg-stone-100 px-3 py-2 text-[11px] text-stone-500">还没有完整需求，先发一句话给我。</span>
          )}
        </div>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={async () => {
              await generatePlanFromProfile()
              navigate('/plan')
            }}
            className="flex-1 rounded-2xl bg-stone-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-stone-800"
          >
            生成旅行方案
          </button>
          <button
            type="button"
            onClick={resetConversation}
            className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-stone-600 transition hover:bg-stone-50"
            aria-label="重置对话"
          >
            <RefreshCcw className="h-4 w-4" />
          </button>
        </div>
        {plan ? <p className="mt-3 text-[11px] text-emerald-600">当前已生成 {plan.selectedRecommendation.city} 方案，可切换到底部“行程”和“准备”查看。</p> : null}
      </SectionCard>

      <QuickPromptStrip onSelect={sendQuickPrompt} />

      <SectionCard title="对话记录" eyebrow="Conversation Stream">
        <div className="space-y-3">
          {messages.map((message, index) => (
            <ChatMessage key={message.id} message={message} active={isGenerating && index === latestAssistantIndex} />
          ))}
          {isGenerating ? (
            <div className="rounded-[22px] bg-white px-4 py-3 text-[12px] text-stone-500 shadow-sm">
              <div className="flex items-center gap-3">
                <VoyaAvatar state="talking" size="status" />
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 animate-pulse text-amber-600" />
                  VOYA 正在整理你的旅行需求...
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </SectionCard>

      <form onSubmit={handleSubmit} className="sticky bottom-0 rounded-[28px] border border-white/70 bg-white/92 p-3 shadow-[0_-6px_24px_rgba(82,64,28,0.08)] backdrop-blur">
        <label className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-stone-400">
          <Mic className="h-3.5 w-3.5" />
          像打电话一样对我说
        </label>
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            rows={3}
            placeholder="例如：我想从杭州出发，8 月去一个适合情侣的城市，玩 4 天，预算 9000。"
            className="min-h-[92px] flex-1 resize-none rounded-[24px] border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700 outline-none transition focus:border-amber-400 focus:bg-white"
          />
          <button
            type="submit"
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#b31e3c] text-white shadow-lg transition hover:scale-[1.02] hover:bg-[#9e1734]"
            aria-label="发送需求"
          >
            <SendHorizonal className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  )
}
