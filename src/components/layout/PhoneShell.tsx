import type { ReactNode } from 'react'
import BottomTabs from '@/components/layout/BottomTabs'
import { cn } from '@/lib/utils'

const titles: Record<string, string> = {
  '/': 'VOYA 通话中',
  '/call': 'VOYA 电话中',
  '/plan': 'VOYA 行程方案',
  '/prepare': 'VOYA 出行准备',
}

type PhoneShellProps = {
  currentPath: string
  children: ReactNode
}

export default function PhoneShell({ currentPath, children }: PhoneShellProps) {
  const normalizedPath = currentPath === '/' ? '/' : currentPath.replace(/\/+$/, '')
  const isCallMode = normalizedPath === '/call'

  return (
    <div className="relative mx-auto flex h-[860px] w-[390px] flex-col rounded-[44px] border-[10px] border-stone-900 bg-[#f7f3ec] p-2 shadow-[0_35px_80px_rgba(43,31,16,0.34)] ring-1 ring-white/40">
      <div className="absolute left-1/2 top-0 z-20 h-7 w-40 -translate-x-1/2 rounded-b-[20px] bg-stone-900" />
      <div className="flex items-center justify-between px-6 pb-3 pt-6 text-[12px] font-semibold text-stone-700">
        <span>9:41</span>
        <div className="rounded-full bg-white/80 px-3 py-1 text-[11px] text-stone-600 shadow-sm">
          {titles[normalizedPath] ?? 'VOYA'}
        </div>
        <span>5G</span>
      </div>
      <div className="relative flex-1 overflow-hidden px-2 pb-2">
        <div className="micro-motion-root flex h-full flex-col overflow-hidden rounded-[34px] border border-white/70 bg-[#f9f5ef] shadow-inner">
          <div className={cn('min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-4', isCallMode && 'overflow-hidden px-0 pb-0 pt-0')}>{children}</div>
          {!isCallMode ? (
            <div className="px-3 pb-3 pt-1">
              <BottomTabs />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
