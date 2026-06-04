import { Bot, UserRound } from 'lucide-react'
import type { ChatMessage as ChatMessageType } from '@/types/travel'
import { cn } from '@/lib/utils'

type ChatMessageProps = {
  message: ChatMessageType
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isAssistant = message.role === 'assistant'

  return (
    <div className={cn('flex items-end gap-2', isAssistant ? 'justify-start' : 'justify-end')}>
      {isAssistant ? (
        <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
          <Bot className="h-4 w-4" />
        </div>
      ) : null}
      <div
        className={cn(
          'max-w-[78%] rounded-[22px] px-4 py-3 text-[13px] leading-6 shadow-sm',
          isAssistant
            ? 'rounded-bl-md bg-white text-stone-700'
            : 'rounded-br-md bg-stone-900 text-white',
        )}
      >
        <p>{message.content}</p>
        <span className={cn('mt-2 block text-[10px]', isAssistant ? 'text-stone-400' : 'text-white/60')}>
          {message.timestamp}
        </span>
      </div>
      {!isAssistant ? (
        <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-stone-200 text-stone-700">
          <UserRound className="h-4 w-4" />
        </div>
      ) : null}
    </div>
  )
}
