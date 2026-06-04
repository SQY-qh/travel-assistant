import { Line, LineChart, ResponsiveContainer, Tooltip } from 'recharts'

type TrendSparklineProps = {
  trend: number[]
  color?: string
}

export default function TrendSparkline({ trend, color = '#8A5A15' }: TrendSparklineProps) {
  const data = trend.map((value, index) => ({ day: index + 1, value }))
  return (
    <div className="h-16 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2.5} dot={false} />
          <Tooltip formatter={(value: number) => [`¥${value}`, '价格']} labelFormatter={(value) => `近 ${value} 次观察`} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
