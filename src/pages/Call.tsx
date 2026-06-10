import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Grid2X2, Keyboard, Mic, MicOff, MoreHorizontal, SendHorizonal, Volume2, VolumeX, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import VoyaAvatar from '@/components/common/VoyaAvatar'
import { cn } from '@/lib/utils'
import { useTravelStore } from '@/store/useTravelStore'
import type { VoyaMotionState } from '@/data/voya'

type CallStatus = 'idle' | 'listening' | 'thinking' | 'speaking'

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance

type SpeechRecognitionInstance = {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  onend: (() => void) | null
  onerror: ((event: { error?: string }) => void) | null
  onresult: ((event: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null
  abort: () => void
  start: () => void
  stop: () => void
}

type SpeechRecognitionWindow = Window &
  typeof globalThis & {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }

const statusLabel: Record<CallStatus, string> = {
  idle: '点麦克风开始说话',
  listening: '你可以开始说话',
  thinking: 'VOYA 正在理解...',
  speaking: 'VOYA 正在回答...',
}

const getSpeechRecognition = () => {
  if (typeof window === 'undefined') return null
  const speechWindow = window as SpeechRecognitionWindow
  return speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition || null
}

export default function Call() {
  const navigate = useNavigate()
  const submitVoiceMessage = useTravelStore((state) => state.submitVoiceMessage)
  const [status, setStatus] = useState<CallStatus>('idle')
  const [transcript, setTranscript] = useState('')
  const [assistantText, setAssistantText] = useState('')
  const [textInput, setTextInput] = useState('')
  const [textMode, setTextMode] = useState(false)
  const [voiceOutput, setVoiceOutput] = useState(true)
  const [error, setError] = useState('')
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const finalTranscriptRef = useRef('')
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const speechFallbackTimerRef = useRef<number | null>(null)
  const lastSpokenTextRef = useRef('')

  const speechRecognitionSupported = useMemo(() => Boolean(getSpeechRecognition()), [])

  const voyaState: VoyaMotionState =
    status === 'listening' ? 'listening' : status === 'thinking' || status === 'speaking' ? 'talking' : assistantText ? 'nodding' : 'greeting'

  const clearSpeechFallbackTimer = useCallback(() => {
    if (speechFallbackTimerRef.current) {
      window.clearTimeout(speechFallbackTimerRef.current)
      speechFallbackTimerRef.current = null
    }
  }, [])

  const stopSpeech = useCallback(() => {
    clearSpeechFallbackTimer()
    if (utteranceRef.current) {
      utteranceRef.current.onend = null
      utteranceRef.current.onerror = null
    }
    utteranceRef.current = null
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
  }, [clearSpeechFallbackTimer])

  const speakText = useCallback((text: string) => {
    const cleaned = text.trim()
    if (!cleaned) {
      setStatus('idle')
      return
    }

    lastSpokenTextRef.current = cleaned
    if (!('speechSynthesis' in window)) {
      setError('当前浏览器不支持语音输出，只能显示文字回复。')
      setStatus('idle')
      return
    }

    const synth = window.speechSynthesis
    synth.cancel()
    clearSpeechFallbackTimer()

    const utterance = new SpeechSynthesisUtterance(cleaned)
    utterance.lang = 'zh-CN'
    utterance.rate = 1
    utterance.pitch = 1
    utterance.volume = 1
    const voice = synth
      .getVoices()
      .find((item) => item.lang.toLowerCase().includes('zh') || /chinese|中文|普通话/i.test(item.name))
    if (voice) utterance.voice = voice
    utteranceRef.current = utterance
    setError('')
    setStatus('speaking')
    const finishSpeaking = () => {
      clearSpeechFallbackTimer()
      utteranceRef.current = null
      setStatus('idle')
    }
    speechFallbackTimerRef.current = window.setTimeout(finishSpeaking, Math.min(18000, Math.max(5000, cleaned.length * 220)))
    utterance.onend = () => {
      finishSpeaking()
    }
    utterance.onerror = () => {
      finishSpeaking()
      setError('如果没有听到 VOYA 的声音，请点音量按钮重播。')
    }
    synth.speak(utterance)
    window.setTimeout(() => synth.resume(), 250)
  }, [clearSpeechFallbackTimer])

  const processText = useCallback(
    async (value: string) => {
      const cleaned = value.trim()
      if (!cleaned || status === 'thinking') return

      setError('')
      setTranscript(cleaned)
      setAssistantText('')
      setTextInput('')
      setTextMode(false)
      setStatus('thinking')

      const result = await submitVoiceMessage(cleaned)
      const spokenText = result?.spokenText || '我已经收到你的需求，可以继续告诉我更多细节。'
      setAssistantText(spokenText)
      lastSpokenTextRef.current = spokenText
      if (voiceOutput) {
        speakText(spokenText)
      } else {
        setStatus('idle')
      }
    },
    [speakText, status, submitVoiceMessage, voiceOutput],
  )

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
  }, [])

  const startListening = useCallback(() => {
    if (status === 'thinking' || status === 'speaking') return

    if (status === 'listening') {
      stopListening()
      return
    }

    const Recognition = getSpeechRecognition()
    if (!Recognition) {
      setError('当前浏览器不支持语音识别，可以点“字”手动输入。')
      setTextMode(true)
      return
    }

    stopSpeech()

    const recognition = new Recognition()
    recognitionRef.current = recognition
    finalTranscriptRef.current = ''
    setTranscript('')
    setAssistantText('')
    setError('')
    setStatus('listening')

    recognition.lang = 'zh-CN'
    recognition.continuous = false
    recognition.interimResults = true
    recognition.maxAlternatives = 1
    recognition.onresult = (event) => {
      let finalText = ''
      let interimText = ''

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index]
        const text = result[0]?.transcript || ''
        if (result.isFinal) finalText += text
        else interimText += text
      }

      const displayText = (finalText || interimText).trim()
      if (displayText) setTranscript(displayText)
      if (finalText.trim()) finalTranscriptRef.current = finalText.trim()
    }
    recognition.onerror = (event) => {
      if (event.error && !['aborted', 'no-speech'].includes(event.error)) {
        setError('没有听清楚，可以再说一次，或点“字”手动输入。')
      }
    }
    recognition.onend = () => {
      recognitionRef.current = null
      const finalText = finalTranscriptRef.current.trim()
      if (finalText) {
        void processText(finalText)
      } else {
        setStatus((current) => (current === 'listening' ? 'idle' : current))
      }
    }

    try {
      recognition.start()
    } catch {
      setStatus('idle')
      setTextMode(true)
      setError('麦克风暂时无法启动，可以点“字”手动输入。')
    }
  }, [processText, status, stopListening, stopSpeech])

  const handleTextSubmit = async (event: FormEvent) => {
    event.preventDefault()
    await processText(textInput)
  }

  const toggleVoiceOutput = () => {
    if (voiceOutput) {
      setVoiceOutput(false)
      stopSpeech()
      setStatus((value) => (value === 'speaking' ? 'idle' : value))
      return
    }

    setVoiceOutput(true)
    const text = assistantText || lastSpokenTextRef.current
    if (text) {
      speakText(text)
    }
  }

  const endCall = () => {
    recognitionRef.current?.abort()
    stopSpeech()
    navigate('/')
  }

  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices()
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices()
      }
    }

    return () => {
      recognitionRef.current?.abort()
      stopSpeech()
      if ('speechSynthesis' in window) window.speechSynthesis.onvoiceschanged = null
    }
  }, [stopSpeech])

  return (
    <div className="relative flex min-h-full flex-col overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(255,221,232,0.92),_rgba(244,236,255,0.9)_48%,_rgba(238,246,255,0.92)_100%)] px-5 pb-6 pt-5 text-stone-900">
      <div className="flex items-center justify-between">
        <button type="button" className="flex h-11 w-11 items-center justify-center rounded-full text-stone-700" aria-label="更多">
          <MoreHorizontal className="h-7 w-7" />
        </button>
        <button type="button" className="inline-flex items-center gap-2 rounded-full bg-white/34 px-4 py-2 text-sm font-semibold text-stone-900 shadow-sm backdrop-blur">
          <Grid2X2 className="h-5 w-5" />
          选择情景
        </button>
        <button
          type="button"
          onClick={() => setTextMode((current) => !current)}
          className={cn('flex h-11 w-11 items-center justify-center rounded-full text-2xl font-semibold', textMode && 'bg-white/60 shadow-sm')}
          aria-label="文字输入"
        >
          字
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-9 pb-4 pt-8">
        <VoyaAvatar state={voyaState} size="call" />

        <div className="w-full text-center">
          <div className="mb-5 flex justify-center gap-3">
            {[0, 1, 2].map((item) => (
              <span
                key={item}
                className={cn(
                  'h-3.5 w-3.5 rounded-full transition',
                  status === 'listening' || status === 'thinking' || status === 'speaking' ? 'animate-pulse bg-stone-800' : 'bg-stone-500/80',
                )}
                style={{ animationDelay: `${item * 120}ms` }}
              />
            ))}
          </div>
          <p className="text-[20px] font-medium text-stone-600">{statusLabel[status]}</p>

          <div className="mx-auto mt-5 min-h-[76px] max-w-[310px] rounded-[28px] bg-white/34 px-4 py-3 text-left text-[12px] leading-6 text-stone-600 shadow-sm backdrop-blur">
            {error ? <p className="text-[#b31e3c]">{error}</p> : null}
            {transcript ? <p>你：{transcript}</p> : null}
            {assistantText ? <p className="mt-1">VOYA：{assistantText}</p> : null}
            {!error && !transcript && !assistantText ? <p className="text-center text-stone-500">等待通话内容...</p> : null}
          </div>

          {!speechRecognitionSupported ? <p className="mt-3 text-[11px] text-stone-500">当前浏览器可使用文字输入模式。</p> : null}
        </div>
      </div>

      {textMode ? (
        <form onSubmit={handleTextSubmit} className="mb-4 rounded-[28px] bg-white/58 p-3 shadow-sm backdrop-blur">
          <div className="flex items-end gap-2">
            <textarea
              value={textInput}
              onChange={(event) => setTextInput(event.target.value)}
              rows={2}
              placeholder="输入你想对 VOYA 说的话"
              className="min-h-[72px] flex-1 resize-none rounded-[22px] border border-white/80 bg-white/78 px-4 py-3 text-sm text-stone-700 outline-none focus:border-amber-300"
            />
            <button
              type="submit"
              disabled={!textInput.trim() || status === 'thinking'}
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-900 text-white shadow-lg transition disabled:cursor-not-allowed disabled:bg-stone-300"
              aria-label="发送文字"
            >
              <SendHorizonal className="h-4 w-4" />
            </button>
          </div>
        </form>
      ) : null}

      <div className="grid grid-cols-4 gap-4">
        <button
          type="button"
          onClick={startListening}
          disabled={status === 'thinking' || status === 'speaking'}
          className={cn(
            'flex aspect-square items-center justify-center rounded-full bg-white/38 text-stone-900 shadow-sm backdrop-blur transition disabled:opacity-50',
            status === 'listening' && 'bg-stone-900 text-white',
          )}
          aria-label={status === 'listening' ? '停止收音' : '开始说话'}
        >
          {status === 'listening' ? <MicOff className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
        </button>
        <button
          type="button"
          onClick={() => setTextMode((current) => !current)}
          className={cn('flex aspect-square items-center justify-center rounded-full bg-white/38 text-stone-900 shadow-sm backdrop-blur transition', textMode && 'bg-white/70')}
          aria-label="切换文字"
        >
          <Keyboard className="h-8 w-8" />
        </button>
        <button
          type="button"
          onClick={toggleVoiceOutput}
          className={cn('flex aspect-square items-center justify-center rounded-full bg-white/38 text-stone-900 shadow-sm backdrop-blur transition', !voiceOutput && 'text-stone-400')}
          aria-label={voiceOutput ? '关闭语音输出' : assistantText ? '开启语音输出并重播' : '开启语音输出'}
        >
          {voiceOutput ? <Volume2 className="h-8 w-8" /> : <VolumeX className="h-8 w-8" />}
        </button>
        <button
          type="button"
          onClick={endCall}
          className="flex aspect-square items-center justify-center rounded-full bg-white/38 text-red-600 shadow-sm backdrop-blur transition hover:bg-white/60"
          aria-label="结束通话"
        >
          <X className="h-10 w-10 stroke-[3]" />
        </button>
      </div>

      <p className="mt-5 text-center text-[12px] tracking-[0.14em] text-stone-500">内容由 AI 生成</p>
    </div>
  )
}
