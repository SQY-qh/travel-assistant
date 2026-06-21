import { useEffect, useMemo, useState } from 'react'
import { BriefcaseBusiness, ChevronLeft, ChevronRight, FileText, Hotel, Plane, RefreshCw, ShieldPlus, Shirt, Ticket, TriangleAlert } from 'lucide-react'
import SectionCard from '@/components/common/SectionCard'
import { fetchLivePricing, resolveLivePricingQuery } from '@/services/livePricing'
import { useTravelStore } from '@/store/useTravelStore'
import { cn } from '@/lib/utils'
import type { LivePricingResult } from '@/types/travel'

type PricingStatus = 'idle' | 'loading' | 'ready' | 'error'

const currencyToCnyRate: Record<string, number> = {
  CNY: 1,
  RMB: 1,
  USD: 7.25,
  EUR: 7.85,
  GBP: 9.2,
  HKD: 0.93,
  MOP: 0.9,
  JPY: 0.05,
  SGD: 5.35,
}

const formatMoney = (value: number, currency = 'CNY') => {
  if (!Number.isFinite(value)) return '--'
  const rate = currencyToCnyRate[currency.toUpperCase()] ?? 1
  return `¥${Math.round(value * rate)}`
}

const formatDateTime = (value: string) => {
  if (!value) return '--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const formatDuration = (value: string) => {
  const match = value.match(/PT(?:(\d+)H)?(?:(\d+)M)?/)
  if (!match) return value || '--'
  const hours = Number(match[1] || 0)
  const minutes = Number(match[2] || 0)
  if (hours && minutes) return `${hours}小时${minutes}分钟`
  if (hours) return `${hours}小时`
  if (minutes) return `${minutes}分钟`
  return value
}

const describeStops = (segments: unknown[]) => {
  const count = Math.max(0, segments.length - 1)
  if (count === 0) return '直飞'
  return `${count} 次中转`
}

const buildQueryKey = (query: LivePricingResult['query'] | null | undefined) =>
  query
    ? [
        query.originCode,
        query.destinationCode,
        query.departureDate,
        query.returnDate,
        query.checkInDate,
        query.checkOutDate,
        query.tripDays,
      ].join('|')
    : ''

const cleanHotelRoom = (roomType: string) => {
  if (!roomType || /Booking|公开报价|页面|详情|以.+为准/i.test(roomType)) return '舒适房型'
  return roomType
}

const assetUrl = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`
const defaultOutfitImages = [
  assetUrl('outfits/citywalk-women.jpg'),
  assetUrl('outfits/citywalk-men.jpg'),
  assetUrl('outfits/rainy-indoor-women.jpg'),
  assetUrl('outfits/evening-dinner-men.jpg'),
]

export default function Prepare() {
  const { plan, profile } = useTravelStore()
  const [pricingStatus, setPricingStatus] = useState<PricingStatus>('idle')
  const [pricingError, setPricingError] = useState('')
  const [livePricing, setLivePricing] = useState<LivePricingResult | null>(null)
  const [activeBookingIndex, setActiveBookingIndex] = useState(0)
  const [activeHotelIndex, setActiveHotelIndex] = useState(0)
  const localBookingComparison = plan?.bookingComparison
  const bookingOptions = localBookingComparison?.options ?? []
  const hotelOptions = localBookingComparison?.hotelOptions ?? []

  const queryResolution = useMemo(
    () => (plan ? resolveLivePricingQuery(profile, plan) : null),
    [plan, profile],
  )

  const queryError = queryResolution?.ok === false ? queryResolution.error : ''
  const activeQueryKey = queryResolution?.ok ? buildQueryKey(queryResolution.query) : ''
  const livePricingKey = livePricing ? buildQueryKey(livePricing.query) : ''
  const alignedLivePricing = livePricing && activeQueryKey && livePricingKey === activeQueryKey ? livePricing : null

  useEffect(() => {
    if (bookingOptions.length > 0 && activeBookingIndex >= bookingOptions.length) {
      setActiveBookingIndex(0)
    }
  }, [activeBookingIndex, bookingOptions.length])

  useEffect(() => {
    if (hotelOptions.length > 0 && activeHotelIndex >= hotelOptions.length) {
      setActiveHotelIndex(0)
    }
  }, [activeHotelIndex, hotelOptions.length])

  const goToBooking = (direction: -1 | 1) => {
    if (!bookingOptions.length) return
    setActiveBookingIndex((current) => (current + direction + bookingOptions.length) % bookingOptions.length)
  }

  const goToHotel = (direction: -1 | 1) => {
    if (!hotelOptions.length) return
    setActiveHotelIndex((current) => (current + direction + hotelOptions.length) % hotelOptions.length)
  }

  const refreshLivePricing = async () => {
    if (localBookingComparison) {
      setPricingStatus('ready')
      setPricingError('')
      setLivePricing(null)
      return
    }

    if (!queryResolution?.ok) {
      setPricingStatus('error')
      setPricingError(queryError || '暂时无法生成真实报价查询条件。')
      setLivePricing(null)
      return
    }

    setPricingStatus('loading')
    setPricingError('')
    setLivePricing(null)
    try {
      const result = await fetchLivePricing(queryResolution.query)
      if (buildQueryKey(result.query) !== buildQueryKey(queryResolution.query)) {
        return
      }
      setLivePricing(result)
      setPricingStatus('ready')
    } catch (error) {
      setLivePricing(null)
      setPricingStatus('error')
      setPricingError(String(error instanceof Error ? error.message : error || 'pricing_search_failed'))
    }
  }

  useEffect(() => {
    if (!plan) return
    if (localBookingComparison) {
      setPricingStatus('ready')
      setPricingError('')
      setLivePricing(null)
      return
    }
    let cancelled = false

    const run = async () => {
      if (!queryResolution?.ok) {
        if (!cancelled) {
          setPricingStatus('error')
          setPricingError(queryError || '暂时无法生成真实报价查询条件。')
          setLivePricing(null)
        }
        return
      }

      if (!cancelled) {
        setPricingStatus('loading')
        setPricingError('')
        setLivePricing(null)
      }

      try {
        const result = await fetchLivePricing(queryResolution.query)
        if (cancelled) return
        if (buildQueryKey(result.query) !== buildQueryKey(queryResolution.query)) return
        setLivePricing(result)
        setPricingStatus('ready')
      } catch (error) {
        if (cancelled) return
        setLivePricing(null)
        setPricingStatus('error')
        setPricingError(String(error instanceof Error ? error.message : error || 'pricing_search_failed'))
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [localBookingComparison, plan, queryError, queryResolution])

  if (!plan) {
    return (
      <SectionCard title="还没有准备清单" eyebrow="Preparation Pending">
        <p className="text-sm leading-7 text-stone-600">先完成对话需求收集并生成行程，这里就会自动出现价格监控、签证政策、打包清单、穿搭和保险建议。</p>
      </SectionCard>
    )
  }

  return (
    <div className="space-y-4 pb-28">
      {localBookingComparison ? (
        <SectionCard title="前后一天预订比价" eyebrow="Booking Comparison">
          <div className="space-y-3">
            <div className="relative h-[500px] overflow-hidden">
              {bookingOptions.map((option, index) => {
                const forwardOffset = (index - activeBookingIndex + bookingOptions.length) % bookingOptions.length
                const stackOffset = forwardOffset > bookingOptions.length / 2 ? forwardOffset - bookingOptions.length : forwardOffset
                const isVisible = Math.abs(stackOffset) <= 1
                const isActive = index === activeBookingIndex
                const isCheapest = option.id === localBookingComparison.cheapestOptionId
                const isRecommended = option.id === localBookingComparison.recommendedOptionId

                return (
                  <article
                    key={option.id}
                    className={cn(
                      'absolute inset-x-3 top-0 rounded-[26px] border p-4 shadow-[0_18px_45px_rgba(66,50,24,0.14)] transition-all duration-300',
                      isRecommended ? 'border-amber-300 bg-amber-50' : 'border-white/80 bg-white',
                      isVisible ? 'pointer-events-auto' : 'pointer-events-none',
                    )}
                    style={{
                      zIndex: isActive ? 30 : 20 - Math.abs(stackOffset),
                      opacity: isVisible ? 1 : 0,
                      transform: `translateX(${stackOffset * 22}px) translateY(${Math.abs(stackOffset) * 18}px) scale(${isActive ? 1 : 0.94})`,
                    }}
                    aria-hidden={!isVisible}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.22em] text-stone-400">{option.departDate} · {option.returnDate}</p>
                        <h3 className="mt-1 text-base font-semibold text-stone-950">{option.label}</h3>
                        <p className="mt-1 text-[11px] text-stone-500">{option.hotelNights} 晚 · 两人出行估算</p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        {isRecommended ? <span className="rounded-full bg-stone-900 px-2 py-1 text-[10px] text-white">综合推荐</span> : null}
                        {isCheapest ? <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] text-emerald-700">最低价</span> : null}
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2 text-[11px] text-stone-600">
                      <p className="rounded-2xl bg-white px-3 py-2 shadow-sm"><Plane className="mb-1 h-3.5 w-3.5 text-amber-700" />机票两人：{formatMoney(option.flightTotal)}</p>
                      <p className="rounded-2xl bg-white px-3 py-2 shadow-sm"><Ticket className="mb-1 h-3.5 w-3.5 text-amber-700" />高铁两人：{formatMoney(option.trainTotal)}</p>
                      <p className="rounded-2xl bg-white px-3 py-2 shadow-sm"><Hotel className="mb-1 h-3.5 w-3.5 text-amber-700" />酒店总价：{formatMoney(option.hotelTotal)}</p>
                      <p className="rounded-2xl bg-white px-3 py-2 font-semibold text-stone-900 shadow-sm">机酒合计：{formatMoney(option.totalByFlight)}</p>
                    </div>
                    <p className="mt-3 text-xs leading-6 text-stone-600">{localBookingComparison.summary}</p>
                    <p className="mt-2 text-[11px] leading-5 text-stone-500">{localBookingComparison.baseline}</p>
                    {isActive ? (
                      <div className="mt-3 grid grid-cols-1 gap-2">
                        {localBookingComparison.insights.slice(0, 2).map((insight) => (
                          <p key={insight} className="rounded-2xl bg-white/80 px-3 py-2 text-[11px] leading-5 text-stone-500 shadow-sm">{insight}</p>
                        ))}
                      </div>
                    ) : null}
                    <p className="mt-4 text-xs leading-6 text-stone-600">{option.recommendation}</p>
                    <div className="mt-3 space-y-2">
                      {option.bookingTips.slice(0, 2).map((tip) => (
                        <p key={tip} className="rounded-2xl bg-white/80 px-3 py-2 text-[11px] leading-5 text-stone-500 shadow-sm">{tip}</p>
                      ))}
                    </div>
                  </article>
                )
              })}
              <button
                type="button"
                onClick={() => goToBooking(-1)}
                className="absolute left-0 top-0 z-40 flex h-full w-16 items-center justify-start bg-transparent pl-1 text-stone-900/55 transition hover:text-stone-950"
                aria-label="上一个比价方案"
                title="上一个比价方案"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/60 shadow-sm backdrop-blur">
                  <ChevronLeft className="h-5 w-5" />
                </span>
              </button>
              <button
                type="button"
                onClick={() => goToBooking(1)}
                className="absolute right-0 top-0 z-40 flex h-full w-16 items-center justify-end bg-transparent pr-1 text-stone-900/55 transition hover:text-stone-950"
                aria-label="下一个比价方案"
                title="下一个比价方案"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/60 shadow-sm backdrop-blur">
                  <ChevronRight className="h-5 w-5" />
                </span>
              </button>
              <div className="absolute bottom-2 left-1/2 z-40 flex -translate-x-1/2 gap-1.5">
                {bookingOptions.map((option, index) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setActiveBookingIndex(index)}
                    className={cn('h-1.5 rounded-full transition-all', index === activeBookingIndex ? 'w-5 bg-stone-900' : 'w-1.5 bg-stone-300')}
                    aria-label={`切换到${option.label}`}
                  />
                ))}
              </div>
            </div>

            {hotelOptions.length ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-1 text-sm font-semibold text-stone-900">
                  <Hotel className="h-4 w-4 text-amber-700" />
                  酒店参考
                </div>
                <div className="relative h-[360px] overflow-hidden">
                  {hotelOptions.map((hotel, index) => {
                    const forwardOffset = (index - activeHotelIndex + hotelOptions.length) % hotelOptions.length
                    const stackOffset = forwardOffset > hotelOptions.length / 2 ? forwardOffset - hotelOptions.length : forwardOffset
                    const isVisible = Math.abs(stackOffset) <= 1
                    const isActive = index === activeHotelIndex

                    return (
                      <article
                        key={hotel.name}
                        className={cn(
                          'absolute inset-x-3 top-0 overflow-hidden rounded-[26px] border border-white/80 bg-white shadow-[0_18px_45px_rgba(66,50,24,0.14)] transition-all duration-300',
                          isVisible ? 'pointer-events-auto' : 'pointer-events-none',
                        )}
                        style={{
                          zIndex: isActive ? 30 : 20 - Math.abs(stackOffset),
                          opacity: isVisible ? 1 : 0,
                          transform: `translateX(${stackOffset * 22}px) translateY(${Math.abs(stackOffset) * 18}px) scale(${isActive ? 1 : 0.94})`,
                        }}
                        aria-hidden={!isVisible}
                      >
                        <img src={hotel.imageUrl} alt={hotel.name} className="h-36 w-full object-cover" loading="lazy" />
                        <div className="px-4 py-4">
                          <p className="text-[11px] uppercase tracking-[0.22em] text-stone-400">{hotel.area}</p>
                          <h3 className="mt-1 text-base font-semibold text-stone-950">{hotel.name}</h3>
                          <p className="mt-2 text-xs leading-6 text-stone-600">{hotel.reason}</p>
                          <p className="mt-3 rounded-2xl bg-amber-50 px-3 py-2 text-[11px] font-medium leading-5 text-amber-800">{hotel.priceHint}</p>
                        </div>
                      </article>
                    )
                  })}
                  <button
                    type="button"
                    onClick={() => goToHotel(-1)}
                    className="absolute left-0 top-0 z-40 flex h-full w-16 items-center justify-start bg-transparent pl-1 text-stone-900/55 transition hover:text-stone-950"
                    aria-label="上一个酒店"
                    title="上一个酒店"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/60 shadow-sm backdrop-blur">
                      <ChevronLeft className="h-5 w-5" />
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => goToHotel(1)}
                    className="absolute right-0 top-0 z-40 flex h-full w-16 items-center justify-end bg-transparent pr-1 text-stone-900/55 transition hover:text-stone-950"
                    aria-label="下一个酒店"
                    title="下一个酒店"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/60 shadow-sm backdrop-blur">
                      <ChevronRight className="h-5 w-5" />
                    </span>
                  </button>
                  <div className="absolute bottom-2 left-1/2 z-40 flex -translate-x-1/2 gap-1.5">
                    {hotelOptions.map((hotel, index) => (
                      <button
                        key={hotel.name}
                        type="button"
                        onClick={() => setActiveHotelIndex(index)}
                        className={cn('h-1.5 rounded-full transition-all', index === activeHotelIndex ? 'w-5 bg-stone-900' : 'w-1.5 bg-stone-300')}
                        aria-label={`切换到${hotel.name}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </SectionCard>
      ) : null}

      {!localBookingComparison ? (
        <>
          <SectionCard title="航班报价" eyebrow="Flights">
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3 rounded-2xl bg-stone-50 p-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm font-semibold text-stone-900">
                    <Plane className="h-4 w-4 text-amber-700" />
                    往返航班
                  </div>
                  <p className="mt-2 text-xs leading-6 text-stone-500">
                    {queryResolution?.ok ? queryResolution.query.querySummary : pricingError || '等待生成查询条件'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void refreshLivePricing()}
                  className="inline-flex items-center gap-2 rounded-full bg-stone-900 px-3 py-2 text-[11px] text-white"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${pricingStatus === 'loading' ? 'animate-spin' : ''}`} />
                  刷新报价
                </button>
              </div>

              {pricingStatus === 'loading' ? (
                <article className="rounded-2xl bg-stone-50 px-4 py-5 text-sm text-stone-500">正在刷新航班报价...</article>
              ) : null}

              {pricingStatus === 'error' ? (
                <article className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm leading-6 text-rose-700">
                  <div className="flex items-center gap-2 font-semibold">
                    <TriangleAlert className="h-4 w-4" />
                    暂时未拿到航班报价
                  </div>
                </article>
              ) : null}

              {pricingStatus === 'ready' && alignedLivePricing && alignedLivePricing.flights.length === 0 ? (
                <article className="rounded-2xl bg-stone-50 px-4 py-5 text-sm text-stone-500">当前查询条件下暂未返回可展示的航班结果。</article>
              ) : null}

              <div className="grid grid-cols-1 gap-3">
              {alignedLivePricing?.flights.map((flight) => {
                const outbound = flight.itineraries[0] ?? []
                const inbound = flight.itineraries[1] ?? []
                const firstOutbound = outbound[0]
                const lastOutbound = outbound[outbound.length - 1]
                return (
                  <article key={flight.id} className="rounded-2xl border border-stone-200 bg-white px-4 py-4 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-stone-900">
                          {(flight.validatingAirlineCodes[0] || flight.airlineCodes[0] || '航司待确认')} · {describeStops(outbound)}
                        </div>
                        <p className="mt-2 text-xs text-stone-500">
                          去程 {firstOutbound?.departureIata || '--'} {formatDateTime(firstOutbound?.departureAt || '')}{' -> '}{lastOutbound?.arrivalIata || '--'} {formatDateTime(lastOutbound?.arrivalAt || '')}
                        </p>
                        {inbound.length > 0 ? (
                          <p className="mt-1 text-xs text-stone-500">
                            返程 {inbound[0]?.departureIata || '--'} {formatDateTime(inbound[0]?.departureAt || '')}{' -> '}{inbound[inbound.length - 1]?.arrivalIata || '--'} {formatDateTime(inbound[inbound.length - 1]?.arrivalAt || '')}
                          </p>
                        ) : null}
                      </div>
                      <div className="shrink-0 rounded-2xl bg-amber-50 px-3 py-2 text-right text-amber-800">
                        <p className="text-[10px]">总价</p>
                        <p className="text-base font-semibold">{formatMoney(flight.totalPrice, flight.currency)}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {outbound.map((segment) => (
                        <span key={`${flight.id}-${segment.flightNumber}-${segment.departureAt}`} className="rounded-full bg-stone-100 px-3 py-2 text-[11px] text-stone-600">
                          {segment.flightNumber} · {segment.departureIata}{' -> '}{segment.arrivalIata} · {formatDuration(segment.duration)}
                        </span>
                      ))}
                    </div>
                  </article>
                )
              })}
              </div>
            </div>
          </SectionCard>

          <SectionCard title="酒店报价" eyebrow="Hotels">
            <div className="space-y-3">
              {pricingStatus === 'loading' ? (
                <article className="rounded-2xl bg-stone-50 px-4 py-5 text-sm text-stone-500">正在刷新酒店报价...</article>
              ) : null}

              {pricingStatus === 'ready' && alignedLivePricing && alignedLivePricing.hotels.length === 0 ? (
                <article className="rounded-2xl bg-stone-50 px-4 py-5 text-sm text-stone-500">当前查询条件下暂未返回可展示的酒店报价。</article>
              ) : null}

              <div className="grid grid-cols-1 gap-3">
              {alignedLivePricing?.hotels.map((hotel) => (
                <article key={hotel.id} className="rounded-2xl border border-stone-200 bg-white px-4 py-4 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-sm font-semibold text-stone-900">
                        <Hotel className="h-4 w-4 text-amber-700" />
                        {hotel.hotelName}
                      </div>
                      <p className="mt-2 text-xs leading-6 text-stone-500">{hotel.address || `${hotel.cityCode} 市区`}</p>
                      <p className="mt-1 text-xs leading-6 text-stone-500">房型：{cleanHotelRoom(hotel.roomType)}</p>
                    </div>
                    <div className="shrink-0 rounded-2xl bg-amber-50 px-3 py-2 text-right text-amber-800">
                      <p className="text-[10px]">报价</p>
                      <p className="text-base font-semibold">{formatMoney(hotel.totalPrice, hotel.currency)}</p>
                    </div>
                  </div>
                </article>
              ))}
              </div>
            </div>
          </SectionCard>

          <SectionCard title="火车票报价" eyebrow="Trains">
            <div className="space-y-3">
              {pricingStatus === 'loading' ? (
                <article className="rounded-2xl bg-stone-50 px-4 py-5 text-sm text-stone-500">正在刷新火车票报价...</article>
              ) : null}

              {pricingStatus === 'ready' && alignedLivePricing && alignedLivePricing.trains.length === 0 ? (
                <article className="rounded-2xl bg-stone-50 px-4 py-5 text-sm text-stone-500">当前查询条件下暂未返回可展示的火车票结果。</article>
              ) : null}

              <div className="grid grid-cols-1 gap-3">
              {alignedLivePricing?.trains.map((train) => (
                <article key={train.id} className="rounded-2xl border border-stone-200 bg-white px-4 py-4 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-sm font-semibold text-stone-900">
                        <Ticket className="h-4 w-4 text-amber-700" />
                        {train.trainNumber} · {train.seatType}
                      </div>
                      <p className="mt-2 text-xs leading-6 text-stone-500">
                        {train.departureStation} {formatDateTime(train.departureAt)} {'->'} {train.arrivalStation} {formatDateTime(train.arrivalAt)}
                      </p>
                      <p className="mt-1 text-xs leading-6 text-stone-500">
                        {train.duration}
                      </p>
                    </div>
                    <div className="shrink-0 rounded-2xl bg-amber-50 px-3 py-2 text-right text-amber-800">
                      <p className="text-[10px]">票价</p>
                      <p className="text-base font-semibold">{formatMoney(train.totalPrice, train.currency)}</p>
                    </div>
                  </div>
                </article>
              ))}
              </div>
            </div>
          </SectionCard>
        </>
      ) : null}

      <SectionCard title="签证 / 政策 / 注意事项" eyebrow="Policy Notes">
        <div className="space-y-3">
          {plan.policyCards.map((item) => (
            <article key={item.title} className="rounded-[24px] border border-stone-200 bg-white px-4 py-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-stone-900">
                  <FileText className="h-4 w-4 text-amber-700" />
                  {item.title}
                </div>
                <span className={`rounded-full px-2 py-1 text-[10px] ${item.level === '重要' ? 'bg-rose-100 text-rose-700' : item.level === '建议' ? 'bg-amber-100 text-amber-700' : 'bg-stone-100 text-stone-500'}`}>
                  {item.level}
                </span>
              </div>
              <p className="mt-3 text-xs leading-6 text-stone-600">{item.summary}</p>
            </article>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="打包清单" eyebrow="Packing Checklist">
        <div className="space-y-3">
          {plan.packingGroups.map((group) => (
            <article key={group.title} className="rounded-[24px] bg-stone-50 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-stone-900">
                <BriefcaseBusiness className="h-4 w-4 text-amber-700" />
                {group.title}
              </div>
              <div className="flex flex-wrap gap-2">
                {group.items.map((item) => (
                  <span key={item} className="rounded-full bg-white px-3 py-2 text-[11px] text-stone-600 shadow-sm">{item}</span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="穿搭推荐" eyebrow="Outfit Guidance">
        <div className="space-y-3">
          {plan.outfitSuggestions.map((outfit, index) => (
            <article key={outfit.title} className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
              <img
                src={outfit.imageUrl || defaultOutfitImages[index % defaultOutfitImages.length]}
                alt={outfit.title}
                className="h-40 w-full object-cover"
                loading="lazy"
              />
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-stone-900">
                    <Shirt className="h-4 w-4 text-amber-700" />
                    {outfit.title}
                  </div>
                  {outfit.gender ? (
                    <span className="shrink-0 rounded-full bg-stone-100 px-2 py-1 text-[10px] text-stone-500">{outfit.gender}</span>
                  ) : null}
                </div>
                <p className="mt-2 text-xs leading-6 text-stone-500">{outfit.mood}</p>
                {outfit.keywords?.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {outfit.keywords.map((keyword) => (
                      <span key={keyword} className="rounded-full bg-stone-100 px-3 py-1.5 text-[11px] font-medium text-stone-600">{keyword}</span>
                    ))}
                  </div>
                ) : null}
                {outfit.interpretation ? (
                  <p className="mt-3 text-xs leading-6 text-stone-500">{outfit.interpretation}</p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  {outfit.pieces.map((piece) => (
                    <span key={piece} className="rounded-full bg-amber-50 px-3 py-2 text-[11px] text-amber-800">{piece}</span>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="保险推荐" eyebrow="Insurance">
        <div className="space-y-3">
          {plan.insuranceRecommendations.map((item) => (
            <article key={item.title} className="rounded-[24px] bg-stone-900 px-4 py-4 text-white shadow-lg">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <ShieldPlus className="h-4 w-4 text-amber-300" />
                {item.title}
              </div>
              <p className="mt-2 text-xs leading-6 text-white/75">核心关注：{item.focus}</p>
              <p className="mt-1 text-xs leading-6 text-white/75">适合人群：{item.suitableFor}</p>
              <ul className="mt-3 space-y-2 text-[11px] text-white/70">
                {item.tips.map((tip) => (
                  <li key={tip} className="rounded-2xl bg-white/10 px-3 py-2">{tip}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </SectionCard>

    </div>
  )
}
