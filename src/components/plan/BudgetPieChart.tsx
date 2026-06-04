import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { BudgetBreakdown } from '@/types/travel'

const colors = ['#8A5A15', '#D39A2D', '#F0C66B', '#E8DDC9', '#7A6A57', '#B03A2E']

type BudgetPieChartProps = {
  budget: BudgetBreakdown
}

export default function BudgetPieChart({ budget }: BudgetPieChartProps) {
  const data = [
    { name: '机票', value: budget.flight },
    { name: '酒店', value: budget.hotel },
    { name: '餐饮', value: budget.food },
    { name: '市内交通', value: budget.transportation },
    { name: '门票', value: budget.tickets },
    { name: '保险与机动', value: budget.insurance + budget.flexible },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-[160px_1fr] md:items-center">
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius={42} outerRadius={64} paddingAngle={2} stroke="none">
              {data.map((entry, index) => (
                <Cell key={entry.name} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => [`¥${value}`, '预算']} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="space-y-2">
        <div className="rounded-[20px] bg-stone-900 px-4 py-3 text-white">
          <p className="text-[11px] uppercase tracking-[0.24em] text-white/60">总预算</p>
          <p className="mt-1 text-2xl font-semibold">¥{budget.total}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs text-stone-600">
          {data.map((item, index) => (
            <div key={item.name} className="rounded-2xl bg-stone-100 px-3 py-2">
              <div className="mb-1 flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />
                <span>{item.name}</span>
              </div>
              <strong className="text-sm text-stone-900">¥{item.value}</strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
