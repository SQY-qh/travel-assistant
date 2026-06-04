import { ClipboardList, MessageCircleMore, ShieldCheck } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'

const tabs = [
  { to: '/', label: '通话中', icon: MessageCircleMore },
  { to: '/plan', label: '行程', icon: ClipboardList },
  { to: '/prepare', label: '准备', icon: ShieldCheck },
]

export default function BottomTabs() {
  return (
    <nav className="grid grid-cols-3 gap-2 rounded-[26px] border border-stone-200/80 bg-white/92 px-3 py-3 shadow-[0_14px_30px_rgba(82,64,28,0.10)] backdrop-blur">
      {tabs.map((tab) => {
        const Icon = tab.icon
        return (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium transition',
                isActive ? 'bg-stone-900 text-white shadow-lg' : 'text-stone-500 hover:bg-stone-100',
              )
            }
          >
            <Icon className="h-4 w-4" />
            {tab.label}
          </NavLink>
        )
      })}
    </nav>
  )
}
