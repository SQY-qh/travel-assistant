import { useEffect, useMemo, useRef, useState } from 'react'
import { Map, MapPinned } from 'lucide-react'
import { fetchAmapRoute } from '@/services/amapWebService'
import { geocodeAmap, hasAmapKey, loadAmap } from '@/services/providers/amapProvider'
import type { DayPlan } from '@/types/travel'

type RouteMapCardProps = {
  dayPlans: DayPlan[]
  center: [number, number]
  destination: string
}

type RoutePoint = {
  lng: number
  lat: number
  name: string
}

type RouteSegment = [number, number][]

const buildSyntheticPoints = (center: [number, number], count: number): RoutePoint[] => {
  const total = Math.max(2, count)
  return Array.from({ length: total }, (_, index) => {
    const step = index - (total - 1) / 2
    return {
      lng: Number((center[0] + step * 0.025).toFixed(6)),
      lat: Number((center[1] + ((index % 2 === 0 ? 1 : -1) * 0.015 + step * 0.008)).toFixed(6)),
      name: `route-${index + 1}`,
    }
  })
}

const buildBaseLayers = (AMap: any) => {
  if (!AMap?.TileLayer) return []

  const layers = [new AMap.TileLayer({ zIndex: 1, opacity: 1 })]
  if (AMap.TileLayer.RoadNet) {
    layers.push(new AMap.TileLayer.RoadNet({ zIndex: 2, opacity: 1 }))
  }
  return layers
}

export default function RouteMapCard({ dayPlans, center, destination }: RouteMapCardProps) {
  const mapRef = useRef<HTMLDivElement | null>(null)
  const [ready, setReady] = useState(false)
  const [isResolving, setIsResolving] = useState(false)
  const [activeDay, setActiveDay] = useState(1)
  const [resolvedCenter, setResolvedCenter] = useState(center)
  const [resolvedPoints, setResolvedPoints] = useState<RoutePoint[]>([])
  const [routeSegments, setRouteSegments] = useState<RouteSegment[]>([])
  const activeDayPlan = useMemo(
    () => dayPlans.find((plan) => plan.day === activeDay) ?? dayPlans[0],
    [activeDay, dayPlans],
  )
  const timelineSpots = useMemo(() => activeDayPlan?.spots ?? [], [activeDayPlan])
  const explicitPoints = useMemo(
    () => timelineSpots.filter((spot) => typeof spot.lng === 'number' && typeof spot.lat === 'number'),
    [timelineSpots],
  )

  useEffect(() => {
    if (!dayPlans.some((plan) => plan.day === activeDay)) {
      setActiveDay(dayPlans[0]?.day ?? 1)
    }
  }, [activeDay, dayPlans])

  useEffect(() => {
    let cancelled = false

    if (!hasAmapKey()) {
      setResolvedCenter(center)
      setResolvedPoints([])
      setRouteSegments([])
      setIsResolving(false)
      return
    }

    const resolveGeometry = async () => {
      setIsResolving(true)
      const immediateFallback = buildSyntheticPoints(center, Math.min(Math.max(timelineSpots.length, 2), 6))
      setResolvedCenter(center)
      setResolvedPoints(explicitPoints.length > 0 ? explicitPoints.map((spot) => ({ lng: spot.lng, lat: spot.lat, name: spot.name })) : immediateFallback)
      setRouteSegments([])

      const destinationCenter = (await geocodeAmap(destination)) ?? center
      if (cancelled) return

      setResolvedCenter(destinationCenter)

      if (explicitPoints.length > 0) {
        setResolvedPoints(explicitPoints.map((spot) => ({ lng: spot.lng, lat: spot.lat, name: spot.name })))
        setIsResolving(false)
        return
      }

      const geocoded = await Promise.all(
        timelineSpots.slice(0, 6).map(async (spot) => {
          const query = `${destination}${spot.name}`.replace(/\s+/g, '')
          const point = await geocodeAmap(query)
          return point ? { lng: point[0], lat: point[1], name: spot.name } : null
        }),
      )
      if (cancelled) return

      const usable = geocoded.filter((item): item is RoutePoint => Boolean(item))
      setResolvedPoints(usable.length >= 2 ? usable : buildSyntheticPoints(destinationCenter, Math.min(Math.max(timelineSpots.length, 2), 6)))
      setIsResolving(false)
    }

    void resolveGeometry()

    return () => {
      cancelled = true
    }
  }, [center, destination, explicitPoints, timelineSpots])

  useEffect(() => {
    let cancelled = false

    if (!hasAmapKey() || resolvedPoints.length < 2) {
      setRouteSegments([])
      return
    }

    const resolveRoutes = async () => {
      const segments = await Promise.all(
        resolvedPoints.slice(0, -1).map(async (point, index): Promise<RouteSegment> => {
          const next = resolvedPoints[index + 1]
          const approxDistance = Math.hypot(point.lng - next.lng, point.lat - next.lat)
          const route = await fetchAmapRoute({
            origin: [point.lng, point.lat],
            destination: [next.lng, next.lat],
            mode: approxDistance < 0.05 ? 'walking' : 'driving',
          })
          return route?.polyline ?? ([
            [point.lng, point.lat],
            [next.lng, next.lat],
          ] as RouteSegment)
        }),
      )

      if (cancelled) return
      setRouteSegments(segments)
    }

    void resolveRoutes()
    return () => {
      cancelled = true
    }
  }, [resolvedPoints])

  useEffect(() => {
    if (!hasAmapKey() || !mapRef.current || resolvedPoints.length === 0) {
      setReady(false)
      return
    }

    let map: any = null
    let disposed = false

    loadAmap().then((AMap) => {
      if (!AMap || disposed || !mapRef.current) {
        return
      }

      const baseLayers = buildBaseLayers(AMap)
      map = new AMap.Map(mapRef.current, {
        zoom: 13,
        center: resolvedCenter,
        mapStyle: 'amap://styles/normal',
        viewMode: '3D',
        resizeEnable: true,
        showLabel: true,
        features: ['bg', 'road', 'building', 'point'],
        ...(baseLayers.length > 0 ? { layers: baseLayers } : {}),
      })
      if (typeof map.setMapStyle === 'function') {
        map.setMapStyle('amap://styles/normal')
      }
      if (baseLayers.length > 0 && typeof map.setLayers === 'function') {
        map.setLayers(baseLayers)
      }

      const markers = resolvedPoints.map(
        (spot) =>
          new AMap.Marker({
            position: [spot.lng, spot.lat],
            title: spot.name,
          }),
      )

      map.add(markers)
      const paths = routeSegments.length > 0 ? routeSegments : [resolvedPoints.map((spot) => [spot.lng, spot.lat])]
      const polylines = paths.map(
        (path) =>
          new AMap.Polyline({
            path,
            strokeColor: '#8A5A15',
            strokeWeight: 5,
            lineJoin: 'round',
            showDir: true,
          }),
      )
      map.add(polylines)
      map.setFitView(undefined, false, [24, 24, 24, 24], Math.max(map.getZoom?.() ?? 13, 12))
      setReady(true)
    })

    return () => {
      disposed = true
      if (map) map.destroy()
    }
  }, [resolvedCenter, resolvedPoints, routeSegments])

  if (!hasAmapKey()) {
    return (
      <div className="rounded-[24px] bg-[linear-gradient(145deg,_#fff8ee,_#f0e2c6)] p-4 text-stone-700">
        <div className="mb-4 flex items-center gap-2 text-stone-800">
          <MapPinned className="h-4 w-4 text-amber-700" />
          <strong className="text-sm">路线预览</strong>
        </div>
        <div className="space-y-3">
          {timelineSpots.slice(0, 6).map((spot, index) => (
            <div key={`${spot.name}-${index}`} className="flex items-center gap-3">
              <div className="flex w-10 flex-col items-center">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-stone-900 text-[11px] font-semibold text-white">{index + 1}</span>
                {index !== timelineSpots.length - 1 ? <span className="mt-1 h-8 w-px bg-stone-300" /> : null}
              </div>
              <div className="rounded-2xl bg-white/85 px-3 py-2 shadow-sm">
                <p className="text-xs font-semibold text-stone-900">{spot.name}</p>
                <p className="text-[11px] text-stone-500">{spot.time} · {spot.note}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[11px] leading-5 text-stone-500">
          当前未检测到高德地图 API Key，因此以路线时间轴模式展示。将密钥填入 `secrets/local.keys.env` 后刷新页面，即可启用真实地图。
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-[24px] bg-white/80 p-3">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-stone-800">
        <Map className="h-4 w-4 text-amber-700" />
        AMap 路线视图
      </div>
      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
        {dayPlans.map((dayPlan) => (
          <button
            key={dayPlan.day}
            type="button"
            onClick={() => setActiveDay(dayPlan.day)}
            className={`rounded-full px-3 py-2 text-[11px] font-semibold transition ${
              activeDay === dayPlan.day ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            Day {dayPlan.day}
          </button>
        ))}
      </div>
      <div ref={mapRef} className="h-64 overflow-hidden rounded-[20px] bg-stone-200" />
      <div className="mt-3 space-y-3">
        <p className="text-[11px] text-stone-500">
          {ready
            ? isResolving
              ? '地图已显示，正在继续用高德解析更准确的路线节点与城市焦点。'
              : routeSegments.length > 0
                ? '已根据高德路径规划绘制真实路线。'
                : '已根据推荐路线绘制城市动线。'
            : '正在加载地图资源...'}
        </p>
        <div className="rounded-[20px] bg-stone-50 px-3 py-3">
          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-400">
            <MapPinned className="h-3.5 w-3.5 text-amber-700" />
            Route Nodes · Day {activeDayPlan?.day ?? activeDay}
          </div>
          <div className="space-y-2">
            {timelineSpots.slice(0, 5).map((spot, index) => (
              <div key={`${spot.name}-${index}`} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-stone-900 text-[10px] font-semibold text-white">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-stone-800">{spot.name}</p>
                  <p className="text-[11px] leading-5 text-stone-500">{spot.time} · {spot.note}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
