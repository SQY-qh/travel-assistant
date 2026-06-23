import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Map, MapPinned } from 'lucide-react'
import { fetchAmapRoute } from '@/services/amapWebService'
import { geocodeAmap, hasAmapKey, loadAmap } from '@/services/providers/amapProvider'
import type { DayPlan, DaySpot } from '@/types/travel'

type RouteMapCardProps = {
  dayPlans: DayPlan[]
  center: [number, number]
  destination: string
  offline?: boolean
  activeDay?: number
  onActiveDayChange?: (day: number) => void
  showNodeList?: boolean
}

type RoutePoint = {
  lng: number
  lat: number
  name: string
  spotIndex: number
}

type RouteSegment = [number, number][]

type AMapLayer = unknown
type AMapOverlay = unknown
type AMapMarker = AMapOverlay & {
  on?: (event: string, handler: () => void) => void
}
type AMapInstance = {
  setMapStyle?: (style: string) => void
  setLayers?: (layers: AMapLayer[]) => void
  add: (overlays: AMapOverlay | AMapOverlay[]) => void
  setFitView: (overlays?: unknown, immediately?: boolean, avoid?: number[], maxZoom?: number) => void
  getZoom?: () => number
  destroy: () => void
}
type AMapNamespace = {
  TileLayer?: {
    new (options: Record<string, unknown>): AMapLayer
    RoadNet?: new (options: Record<string, unknown>) => AMapLayer
  }
  Map: new (container: HTMLDivElement, options: Record<string, unknown>) => AMapInstance
  Marker: new (options: Record<string, unknown>) => AMapMarker
  Polyline: new (options: Record<string, unknown>) => AMapOverlay
}

const buildSyntheticPoints = (center: [number, number], spots: DaySpot[]): RoutePoint[] => {
  const total = Math.max(2, spots.length)
  return Array.from({ length: spots.length }, (_, index) => {
    const step = index - (total - 1) / 2
    return {
      lng: Number((center[0] + step * 0.025).toFixed(6)),
      lat: Number((center[1] + ((index % 2 === 0 ? 1 : -1) * 0.015 + step * 0.008)).toFixed(6)),
      name: spots[index]?.name ?? `route-${index + 1}`,
      spotIndex: index,
    }
  })
}

const buildBaseLayers = (AMap: AMapNamespace) => {
  if (!AMap?.TileLayer) return []

  const layers = [new AMap.TileLayer({ zIndex: 1, opacity: 1 })]
  if (AMap.TileLayer.RoadNet) {
    layers.push(new AMap.TileLayer.RoadNet({ zIndex: 2, opacity: 1 }))
  }
  return layers
}

const buildMarkerContent = (index: number, active: boolean) => `
  <button
    type="button"
    aria-label="路线节点 ${index + 1}"
    style="
      width:${active ? 30 : 26}px;
      height:${active ? 30 : 26}px;
      border-radius:999px;
      border:2px solid white;
      background:${active ? '#171412' : '#d97706'};
      color:white;
      display:flex;
      align-items:center;
      justify-content:center;
      font-size:12px;
      font-weight:800;
      box-shadow:0 8px 18px rgba(66,50,24,.28);
      transform:translate(-50%, -50%);
      cursor:pointer;
    "
  >${index + 1}</button>
`

export default function RouteMapCard({ dayPlans, center, destination, offline = false, activeDay, onActiveDayChange, showNodeList = true }: RouteMapCardProps) {
  const mapRef = useRef<HTMLDivElement | null>(null)
  const [ready, setReady] = useState(false)
  const [isResolving, setIsResolving] = useState(false)
  const [internalActiveDay, setInternalActiveDay] = useState(1)
  const [resolvedCenter, setResolvedCenter] = useState(center)
  const [resolvedPoints, setResolvedPoints] = useState<RoutePoint[]>([])
  const [routeSegments, setRouteSegments] = useState<RouteSegment[]>([])
  const [selectedSpotIndex, setSelectedSpotIndex] = useState(0)
  const selectedDay = activeDay ?? internalActiveDay
  const setSelectedDay = useCallback((day: number) => {
    if (activeDay === undefined) {
      setInternalActiveDay(day)
    }
    onActiveDayChange?.(day)
  }, [activeDay, onActiveDayChange])
  const activeDayPlan = useMemo(
    () => dayPlans.find((plan) => plan.day === selectedDay) ?? dayPlans[0],
    [selectedDay, dayPlans],
  )
  const timelineSpots = useMemo(() => activeDayPlan?.spots ?? [], [activeDayPlan])
  const selectedSpot = timelineSpots[selectedSpotIndex] ?? timelineSpots[0]
  const selectedSpotImage = selectedSpot?.imageUrl
  const useOfflineTimeline = offline || !hasAmapKey()

  useEffect(() => {
    if (!dayPlans.some((plan) => plan.day === selectedDay)) {
      setSelectedDay(dayPlans[0]?.day ?? 1)
    }
  }, [dayPlans, selectedDay, setSelectedDay])

  useEffect(() => {
    setSelectedSpotIndex(0)
  }, [selectedDay])

  useEffect(() => {
    if (selectedSpotIndex >= timelineSpots.length) {
      setSelectedSpotIndex(0)
    }
  }, [selectedSpotIndex, timelineSpots.length])

  useEffect(() => {
    let cancelled = false

    if (useOfflineTimeline) {
      setResolvedCenter(center)
      setResolvedPoints([])
      setRouteSegments([])
      setIsResolving(false)
      return
    }

    const resolveGeometry = async () => {
      setIsResolving(true)
      const immediateFallback = buildSyntheticPoints(center, timelineSpots)
      setResolvedCenter(center)
      setResolvedPoints(timelineSpots.length > 0 ? immediateFallback : [])
      setRouteSegments([])

      const destinationCenter = (await geocodeAmap(destination)) ?? center
      if (cancelled) return

      setResolvedCenter(destinationCenter)

      if (timelineSpots.length === 0) {
        setResolvedPoints([])
        setIsResolving(false)
        return
      }

      const geocoded = await Promise.all(
        timelineSpots.map(async (spot, index) => {
          if (typeof spot.lng === 'number' && typeof spot.lat === 'number') {
            return { lng: spot.lng, lat: spot.lat, name: spot.name, spotIndex: index } satisfies RoutePoint
          }
          const query = `${destination}${spot.name}`.replace(/\s+/g, '')
          const point = await geocodeAmap(query)
          return point ? ({ lng: point[0], lat: point[1], name: spot.name, spotIndex: index } satisfies RoutePoint) : null
        }),
      )
      if (cancelled) return

      const fallbackPoints = buildSyntheticPoints(destinationCenter, timelineSpots)
      const completePoints = timelineSpots.map((_, index) => geocoded[index] ?? fallbackPoints[index]).filter((point): point is RoutePoint => Boolean(point))
      setResolvedPoints(completePoints)
      setIsResolving(false)
    }

    void resolveGeometry()

    return () => {
      cancelled = true
    }
  }, [center, destination, timelineSpots, useOfflineTimeline])

  useEffect(() => {
    let cancelled = false

    if (useOfflineTimeline || resolvedPoints.length < 2) {
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
  }, [resolvedPoints, useOfflineTimeline])

  useEffect(() => {
    if (useOfflineTimeline || !mapRef.current || resolvedPoints.length === 0) {
      setReady(false)
      return
    }

    let map: AMapInstance | null = null
    let disposed = false

    loadAmap().then((loadedAmap) => {
      if (!loadedAmap || disposed || !mapRef.current) {
        return
      }

      const AMap = loadedAmap as AMapNamespace
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
        (spot) => {
          const marker = new AMap.Marker({
            position: [spot.lng, spot.lat],
            title: spot.name,
            content: buildMarkerContent(spot.spotIndex, spot.spotIndex === selectedSpotIndex),
          })
          marker.on?.('click', () => setSelectedSpotIndex(spot.spotIndex))
          return marker
        },
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
  }, [resolvedCenter, resolvedPoints, routeSegments, selectedSpotIndex, useOfflineTimeline])

  if (useOfflineTimeline) {
    return (
      <div className="rounded-[24px] bg-[linear-gradient(145deg,_#fff8ee,_#f0e2c6)] p-4 text-stone-700">
        <div className="mb-4 flex items-center gap-2 text-stone-800">
          <MapPinned className="h-4 w-4 text-amber-700" />
          <strong className="text-sm">路线预览</strong>
        </div>
        {dayPlans.length > 1 ? (
          <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
            {dayPlans.map((dayPlan) => (
              <button
                key={dayPlan.day}
                type="button"
                onClick={() => setSelectedDay(dayPlan.day)}
                className={`rounded-full px-3 py-2 text-[11px] font-semibold transition ${
                  selectedDay === dayPlan.day ? 'bg-stone-900 text-white' : 'bg-white/75 text-stone-600 hover:bg-white'
                }`}
              >
                Day {dayPlan.day}
              </button>
            ))}
          </div>
        ) : null}
        {showNodeList ? (
          <>
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
              {offline
                ? '已按当天动线展示关键节点，建议根据天气、人流和体力微调停留时长。'
                : '已按路线节点展示当天动线，关键位置可作为导航与转场参考。'}
            </p>
          </>
        ) : null}
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
            onClick={() => setSelectedDay(dayPlan.day)}
            className={`rounded-full px-3 py-2 text-[11px] font-semibold transition ${
              selectedDay === dayPlan.day ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
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
                ? '高德底图已显示，路线折线为当前静态版估算动线。'
                : '高德底图已显示，正在按推荐节点绘制城市动线。'
            : '正在加载地图资源...'}
        </p>
        {selectedSpot ? (
          <div className="overflow-hidden rounded-[22px] border border-amber-100 bg-amber-50/70 shadow-sm">
            {selectedSpotImage ? (
              <img
                src={selectedSpotImage}
                alt={selectedSpot.name}
                className="h-32 w-full object-cover"
                loading="lazy"
              />
            ) : null}
            <div className="px-3 py-3">
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-stone-900 text-[10px] font-semibold text-white">
                {selectedSpotIndex + 1}
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-stone-900">{selectedSpot.name}</p>
                <p className="text-[11px] text-stone-500">{selectedSpot.time} · {selectedSpot.type}</p>
              </div>
            </div>
            {selectedSpot.address ? <p className="mb-2 text-[11px] leading-5 text-stone-500">{selectedSpot.address}</p> : null}
            <p className="text-[11px] leading-5 text-stone-600">{selectedSpot.note}</p>
            {selectedSpot.cost !== undefined ? (
              <div className="mt-3 rounded-2xl bg-white/70 px-3 py-2 text-[11px] text-stone-600">
                <p className="font-semibold text-stone-900">预估费用 ¥{selectedSpot.cost}</p>
                {selectedSpot.costDetails?.length ? (
                  <ul className="mt-2 space-y-1 leading-5">
                    {selectedSpot.costDetails.map((detail) => (
                      <li key={detail} className="flex gap-1.5">
                        <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-amber-700" />
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
            </div>
          </div>
        ) : null}
        {showNodeList ? (
          <div className="rounded-[20px] bg-stone-50 px-3 py-3">
            <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-400">
              <MapPinned className="h-3.5 w-3.5 text-amber-700" />
              Route Nodes · Day {activeDayPlan?.day ?? selectedDay}
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
        ) : null}
      </div>
    </div>
  )
}
