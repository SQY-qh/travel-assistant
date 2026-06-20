import { Clock3, Compass, Landmark, Wallet } from 'lucide-react'
import BudgetPieChart from '@/components/plan/BudgetPieChart'
import RouteMapCard from '@/components/plan/RouteMapCard'
import SectionCard from '@/components/common/SectionCard'
import { useTravelStore } from '@/store/useTravelStore'
import { cn } from '@/lib/utils'

export default function Plan() {
  const { plan, selectRecommendation, activeRecommendationId } = useTravelStore()

  if (!plan) {
    return (
      <SectionCard title="还没有方案" eyebrow="Plan Pending">
        <p className="text-sm leading-7 text-stone-600">先在“通话中”页告诉我你的出发地、时间、同行人和预算，我就能生成目的地推荐、路线和预算分配。</p>
      </SectionCard>
    )
  }

  return (
    <div className="space-y-4 pb-4">
      <section className="overflow-hidden rounded-[30px] border border-white/70 bg-white shadow-[0_20px_45px_rgba(82,64,28,0.12)]">
        <img src={plan.selectedRecommendation.coverImage} alt={plan.selectedRecommendation.city} className="h-40 w-full object-cover" />
        <div className="space-y-3 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.26em] text-stone-400">Top Match</p>
              <h1 className="mt-1 text-xl font-semibold text-stone-900">{plan.selectedRecommendation.city} · {plan.selectedRecommendation.country}</h1>
            </div>
            <div className="rounded-2xl bg-amber-50 px-3 py-2 text-right text-amber-700">
              <p className="text-[10px] uppercase tracking-[0.22em]">匹配分</p>
              <p className="text-lg font-semibold">{plan.selectedRecommendation.score}</p>
            </div>
          </div>
          <p className="text-sm leading-6 text-stone-600">{plan.selectedRecommendation.matchReason}</p>
          <div className="flex flex-wrap gap-2">
            {plan.selectedRecommendation.highlights.map((item) => (
              <span key={item} className="rounded-full bg-stone-100 px-3 py-2 text-[11px] text-stone-600">{item}</span>
            ))}
          </div>
        </div>
      </section>

      <SectionCard title="候选目的地" eyebrow="Recommendations">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {plan.recommendations.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => selectRecommendation(item.id)}
              className={cn(
                'min-w-[150px] rounded-[22px] border px-4 py-3 text-left transition',
                activeRecommendationId === item.id ? 'border-stone-900 bg-stone-900 text-white shadow-lg' : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-white',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <strong className="text-sm">{item.city}</strong>
                <span className={cn('rounded-full px-2 py-1 text-[10px]', activeRecommendationId === item.id ? 'bg-white/15 text-white' : 'bg-amber-50 text-amber-700')}>
                  {item.score}
                </span>
              </div>
              <p className={cn('mt-2 text-[11px] leading-5', activeRecommendationId === item.id ? 'text-white/75' : 'text-stone-500')}>
                {item.reasons[0]}
              </p>
            </button>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="行程路线" eyebrow="Route Overview">
        <RouteMapCard
          dayPlans={plan.dayPlans}
          center={plan.selectedRecommendation.mapCenter}
          destination={plan.selectedRecommendation.planningCity || plan.selectedRecommendation.city}
          offline={plan.localOnly}
        />
      </SectionCard>

      {plan.spotRecommendations?.length ? (
        <SectionCard title="细颗粒度景点推荐" eyebrow="Spot Playbook">
          <div className="space-y-3">
            {plan.spotRecommendations.map((spot) => (
              <article key={spot.title} className="overflow-hidden rounded-[24px] border border-stone-200 bg-white shadow-sm">
                {spot.imageUrl ? (
                  <img src={spot.imageUrl} alt={spot.title} className="h-36 w-full object-cover" loading="lazy" />
                ) : null}
                <div className="px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.22em] text-stone-400">{spot.area}</p>
                      <h2 className="mt-1 text-sm font-semibold text-stone-900">{spot.title}</h2>
                    </div>
                    <span className="shrink-0 rounded-full bg-amber-50 px-3 py-1.5 text-[11px] font-medium text-amber-800">{spot.duration}</span>
                  </div>
                  <p className="mt-3 text-xs leading-6 text-stone-600">{spot.why}</p>
                  <div className="mt-3 grid grid-cols-1 gap-2 text-[11px] leading-5 text-stone-500">
                    <p className="rounded-2xl bg-stone-50 px-3 py-2">最佳时间：{spot.bestTime}</p>
                    <p className="rounded-2xl bg-stone-50 px-3 py-2">预约/排队：{spot.reservation}</p>
                    <p className="rounded-2xl bg-stone-50 px-3 py-2">附近吃喝：{spot.nearbyFood}</p>
                    <p className="rounded-2xl bg-stone-50 px-3 py-2">替代方案：{spot.fallback}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </SectionCard>
      ) : null}

      <SectionCard title="预算制定与分配" eyebrow="Budget Strategy">
        <BudgetPieChart budget={plan.budget} />
      </SectionCard>

      <SectionCard title="按天行程" eyebrow="Daily Plans">
        <div className="space-y-4">
          {plan.dayPlans.map((dayPlan) => (
            <article key={dayPlan.day} className="rounded-[24px] bg-stone-50 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-stone-400">Day {dayPlan.day}</p>
                  <h2 className="mt-1 text-sm font-semibold text-stone-900">{dayPlan.title}</h2>
                  <p className="mt-2 text-xs leading-6 text-stone-500">{dayPlan.routeSummary}</p>
                </div>
                <div className="rounded-2xl bg-white px-3 py-2 text-[11px] text-stone-500 shadow-sm">
                  {dayPlan.spots.length} 个节点
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {dayPlan.spots.map((spot) => (
                  <div key={`${dayPlan.day}-${spot.time}-${spot.name}`} className="flex gap-3">
                    <div className="flex w-14 flex-col items-center">
                      <span className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-stone-700 shadow-sm">{spot.time}</span>
                      <span className="mt-2 h-full w-px bg-stone-200" />
                    </div>
                    <div className="flex-1 rounded-[20px] bg-white px-4 py-3 shadow-sm">
                      {spot.imageUrl ? (
                        <img src={spot.imageUrl} alt={spot.name} className="mb-3 h-28 w-full rounded-2xl object-cover" loading="lazy" />
                      ) : null}
                      <div className="flex items-center gap-2 text-stone-900">
                        {spot.type === '景点' ? <Landmark className="h-4 w-4 text-amber-700" /> : null}
                        {spot.type === '交通' ? <Compass className="h-4 w-4 text-amber-700" /> : null}
                        {spot.type === '餐饮' ? <Clock3 className="h-4 w-4 text-amber-700" /> : null}
                        {spot.type === '酒店' ? <Wallet className="h-4 w-4 text-amber-700" /> : null}
                        <strong className="text-sm">{spot.name}</strong>
                      </div>
                      <p className="mt-2 text-xs leading-6 text-stone-500">{spot.note}</p>
                      {spot.cost ? <p className="mt-2 text-[11px] font-medium text-stone-700">预估费用 ¥{spot.cost}</p> : null}
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </SectionCard>

      {plan.contingencyPlans?.length ? (
        <SectionCard title="临时修改策略" eyebrow="Change Handling">
          <div className="space-y-3">
            {plan.contingencyPlans.map((item) => (
              <article key={item.trigger} className="rounded-[24px] bg-stone-900 px-4 py-4 text-white shadow-lg">
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">触发情况</p>
                <h2 className="mt-1 text-sm font-semibold">{item.trigger}</h2>
                <p className="mt-3 text-xs leading-6 text-white/75">调整策略：{item.strategy}</p>
                <p className="mt-2 text-xs leading-6 text-white/75">后续规划：{item.nextPlan}</p>
                <p className="mt-2 rounded-2xl bg-white/10 px-3 py-2 text-[11px] leading-5 text-white/70">取舍：{item.tradeoff}</p>
              </article>
            ))}
          </div>
        </SectionCard>
      ) : null}

    </div>
  )
}
