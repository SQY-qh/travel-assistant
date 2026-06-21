import type { BudgetBreakdown } from '@/types/travel'

const colors = ['#8A5A15', '#D39A2D', '#F0C66B', '#E8DDC9', '#7A6A57', '#B03A2E']

type BudgetPieChartProps = {
  budget: BudgetBreakdown
}

const polarToCartesian = (cx: number, cy: number, radius: number, angle: number) => {
  const radians = ((angle - 90) * Math.PI) / 180
  return {
    x: cx + radius * Math.cos(radians),
    y: cy + radius * Math.sin(radians),
  }
}

const describeArc = (cx: number, cy: number, radius: number, startAngle: number, endAngle: number) => {
  const start = polarToCartesian(cx, cy, radius, endAngle)
  const end = polarToCartesian(cx, cy, radius, startAngle)
  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`
}

export default function BudgetPieChart({ budget }: BudgetPieChartProps) {
  const data = [
    { name: '机票', value: budget.flight, side: 'right' as const },
    { name: '酒店', value: budget.hotel, side: 'right' as const },
    { name: '餐饮', value: budget.food, side: 'left' as const },
    { name: '市内交通', value: budget.transportation, side: 'right' as const },
    { name: '门票', value: budget.tickets, side: 'left' as const },
    { name: '保险与机动', value: budget.insurance + budget.flexible, side: 'left' as const },
  ]

  let cursor = -118
  const segments = data.map((item, index) => {
    const span = (item.value / budget.total) * 360
    const startAngle = cursor
    const endAngle = cursor + span
    cursor = endAngle
    return {
      ...item,
      color: colors[index % colors.length],
      path: describeArc(150, 150, 82, startAngle, endAngle),
    }
  })

  const labelLayout = [
    { ...segments[0], x1: 210, y1: 92, x2: 224, y2: 54, labelX: 220, labelY: 38 },
    { ...segments[1], x1: 224, y1: 150, x2: 224, y2: 150, labelX: 220, labelY: 136 },
    { ...segments[3], x1: 202, y1: 214, x2: 224, y2: 224, labelX: 220, labelY: 206 },
    { ...segments[2], x1: 92, y1: 90, x2: 76, y2: 54, labelX: 80, labelY: 38 },
    { ...segments[4], x1: 76, y1: 150, x2: 76, y2: 150, labelX: 80, labelY: 136 },
    { ...segments[5], x1: 96, y1: 216, x2: 76, y2: 224, labelX: 80, labelY: 206 },
  ]

  return (
    <div className="rounded-[28px] bg-[linear-gradient(145deg,_#fffaf2,_#f4ead8)] px-3 py-4">
      <div className="mb-3 flex items-center justify-between gap-3 rounded-[24px] bg-stone-900 px-4 py-3 text-white shadow-lg">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-white/50">总预算</p>
          <p className="mt-1 text-3xl font-semibold">¥{budget.total}</p>
        </div>
        <p className="max-w-[116px] text-right text-[11px] leading-5 text-white/55">两人 5 天舒适出行预算拆分</p>
      </div>

      <div className="relative mx-auto aspect-square max-w-[330px]">
        <svg viewBox="0 0 300 300" className="h-full w-full overflow-visible">
          <circle cx="150" cy="150" r="84" fill="none" stroke="#F3E8D6" strokeWidth="34" />
          {segments.map((segment) => (
            <path key={segment.name} d={segment.path} fill="none" stroke={segment.color} strokeLinecap="round" strokeWidth="34" />
          ))}
          <circle cx="150" cy="150" r="54" fill="#FFF9EF" />
          <text x="150" y="145" textAnchor="middle" className="fill-stone-400 text-[10px] uppercase tracking-[0.22em]">
            Budget
          </text>
          <text x="150" y="166" textAnchor="middle" className="fill-stone-900 text-[17px] font-semibold">
            ¥{budget.total}
          </text>

          {labelLayout.map((item) => (
            <g key={item.name}>
              <path d={`M ${item.x1} ${item.y1} L ${item.x2} ${item.y2}`} fill="none" stroke={item.color} strokeWidth="1.5" strokeLinecap="round" />
              <circle cx={item.x1} cy={item.y1} r="3" fill={item.color} />
              <foreignObject x={item.side === 'left' ? item.labelX - 76 : item.labelX} y={item.labelY} width="76" height="54">
                <div className={`rounded-2xl bg-white/82 px-2.5 py-2 shadow-sm ${item.side === 'left' ? 'text-right' : 'text-left'}`}>
                  <div className={`mb-1 flex items-center gap-1.5 ${item.side === 'left' ? 'justify-end' : ''}`}>
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-[10px] leading-none text-stone-500">{item.name}</span>
                  </div>
                  <strong className="text-sm text-stone-950">¥{item.value}</strong>
                </div>
              </foreignObject>
            </g>
          ))}
        </svg>
      </div>
    </div>
  )
}
