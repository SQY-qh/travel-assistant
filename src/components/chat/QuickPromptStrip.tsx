import { Sparkles } from 'lucide-react'
import { quickPrompts } from '@/data/demo'
import { cn } from '@/lib/utils'

type QuickPromptStripProps = {
  onSelect: (value: string) => void
  compact?: boolean
}

export default function QuickPromptStrip({ onSelect, compact = false }: QuickPromptStripProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-stone-400">
        <Sparkles className="h-3.5 w-3.5" />
        快捷需求
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {quickPrompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => onSelect(prompt)}
            className={cn(
              'min-w-[180px] rounded-[22px] border border-white/80 bg-white/80 px-4 py-3 text-left text-[12px] leading-5 text-stone-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-white',
              compact ? 'min-w-[160px]' : 'min-w-[220px]',
            )}
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  )
}
