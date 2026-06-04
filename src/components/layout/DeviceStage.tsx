import type { ReactNode } from 'react'
import PhoneShell from '@/components/layout/PhoneShell'

type DeviceStageProps = {
  children: ReactNode
  currentPath: string
}

export default function DeviceStage({ children, currentPath }: DeviceStageProps) {
  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(248,223,151,0.48),_rgba(247,243,236,0.92)_38%,_#f2ede6_70%)] px-4 py-8 text-stone-900 md:px-8 lg:px-12">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.16)_0%,rgba(255,255,255,0)_25%),linear-gradient(180deg,rgba(87,62,24,0.03)_0%,rgba(255,255,255,0)_100%)]" />
      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl items-center justify-center">
        <section className="relative flex w-full justify-center">
          <div className="absolute inset-6 -z-10 rounded-full bg-amber-200/50 blur-3xl" />
          <PhoneShell currentPath={currentPath}>{children}</PhoneShell>
        </section>
      </div>
    </main>
  )
}
