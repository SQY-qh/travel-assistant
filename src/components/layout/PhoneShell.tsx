import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import VoyaAvatar from '@/components/common/VoyaAvatar'
import BottomTabs from '@/components/layout/BottomTabs'
import { cn } from '@/lib/utils'

const titles: Record<string, string> = {
  '/': 'VOYA 通话中',
  '/call': 'VOYA 电话中',
  '/plan': 'VOYA 行程方案',
  '/prepare': 'VOYA 出行准备',
  '/outfit-try-on': 'VOYA 试穿',
}

type PhoneShellProps = {
  currentPath: string
  children: ReactNode
}

type VoyaPeek = {
  id: number
  x: number
  y: number
}

const interactiveSelector = [
  'button',
  'a',
  '[role="button"]',
  'article',
  'section',
  'img',
  'input',
  'textarea',
  'select',
  'li[class*="rounded"]',
  'p[class*="rounded"]',
  'span[class*="rounded"]',
  'div[class*="rounded"]',
].join(',')

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

export default function PhoneShell({ currentPath, children }: PhoneShellProps) {
  const normalizedPath = currentPath === '/' ? '/' : currentPath.replace(/\/+$/, '')
  const displayPath = normalizedPath.startsWith('/outfit-try-on') ? '/outfit-try-on' : normalizedPath
  const isCallMode = displayPath === '/call'
  const isTryOnMode = displayPath === '/outfit-try-on'
  const isImmersiveMode = isCallMode || isTryOnMode
  const rootRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [voyaPeek, setVoyaPeek] = useState<VoyaPeek | null>(null)

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, left: 0 })
    setVoyaPeek(null)
  }, [currentPath])

  useEffect(() => {
    if (!voyaPeek) return
    const timer = window.setTimeout(() => setVoyaPeek(null), 1900)
    return () => window.clearTimeout(timer)
  }, [voyaPeek])

  const showVoyaPeek = (event: PointerEvent<HTMLDivElement>) => {
    const root = rootRef.current
    const target = event.target instanceof HTMLElement ? event.target : null
    if (isImmersiveMode) return
    if (!root || !target) return
    if (target.closest('.voya-peek-popover')) return
    if (target.closest('[aria-label^="路线节点"]')) return

    const module = target.closest(interactiveSelector)
    if (!(module instanceof HTMLElement) || !root.contains(module) || module === root) return

    const moduleRect = module.getBoundingClientRect()
    const rootRect = root.getBoundingClientRect()
    if (moduleRect.width < 18 || moduleRect.height < 18) return

    setVoyaPeek({
      id: Date.now(),
      x: clamp(moduleRect.right - rootRect.left - 72, 8, rootRect.width - 126),
      y: clamp(moduleRect.top - rootRect.top - 26, 8, rootRect.height - 112),
    })
  }

  return (
    <div className="relative mx-auto flex h-[860px] w-[390px] flex-col rounded-[44px] border-[10px] border-stone-900 bg-[#f7f3ec] p-2 shadow-[0_35px_80px_rgba(43,31,16,0.34)] ring-1 ring-white/40">
      <div className="absolute left-1/2 top-0 z-20 h-7 w-40 -translate-x-1/2 rounded-b-[20px] bg-stone-900" />
      <div className="flex items-center justify-between px-6 pb-3 pt-6 text-[12px] font-semibold text-stone-700">
        <span>9:41</span>
        <div className="rounded-full bg-white/80 px-3 py-1 text-[11px] text-stone-600 shadow-sm">
          {titles[displayPath] ?? 'VOYA'}
        </div>
        <span>5G</span>
      </div>
      <div className="relative flex-1 overflow-hidden px-2 pb-2">
        <div
          ref={rootRef}
          onPointerDownCapture={showVoyaPeek}
          className="micro-motion-root relative flex h-full flex-col overflow-hidden rounded-[34px] border border-white/70 bg-[#f9f5ef] shadow-inner"
        >
          <div ref={contentRef} className={cn('min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-4', isCallMode && 'overflow-hidden px-0 pb-0 pt-0', isTryOnMode && 'px-0 pb-0 pt-0')}>{children}</div>
          {!isImmersiveMode ? (
            <div className="px-3 pb-3 pt-1">
              <BottomTabs />
            </div>
          ) : null}
          {voyaPeek ? (
            <div
              key={voyaPeek.id}
              className="voya-peek-popover pointer-events-none absolute z-[90] flex items-start gap-1.5"
              style={{ left: voyaPeek.x, top: voyaPeek.y }}
              aria-hidden="true"
            >
              <VoyaAvatar state="greeting" size="peek" className="voya-peek-wave" />
              <span className="mt-1 rounded-full bg-stone-950/82 px-2.5 py-1 text-[10px] font-medium text-white shadow-lg backdrop-blur">
                Hi~
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
