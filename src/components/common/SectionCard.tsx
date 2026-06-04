import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type SectionCardProps = {
  title: string
  eyebrow?: string
  children: ReactNode
  className?: string
}

export default function SectionCard({ title, eyebrow, children, className }: SectionCardProps) {
  return (
    <section
      className={cn(
        'rounded-[28px] border border-white/65 bg-white/82 p-4 shadow-[0_20px_45px_rgba(82,64,28,0.12)] backdrop-blur',
        className,
      )}
    >
      {(eyebrow || title) && (
        <header className="mb-3 flex items-center justify-between gap-3">
          <div>
            {eyebrow ? <p className="text-[11px] uppercase tracking-[0.28em] text-stone-400">{eyebrow}</p> : null}
            <h2 className="text-sm font-semibold text-stone-900">{title}</h2>
          </div>
        </header>
      )}
      {children}
    </section>
  )
}
