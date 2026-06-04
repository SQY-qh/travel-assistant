import AMapLoader from '@amap/amap-jsapi-loader'
import { emitTelemetry } from '@/services/telemetry'

declare global {
  interface Window {
    AMap: any
    _AMapSecurityConfig?: {
      securityJsCode?: string
      serviceHost?: string
    }
  }
}

export const getAmapKey = () => import.meta.env.VITE_AMAP_API_KEY ?? ''
export const getAmapSecurityCode = () => import.meta.env.VITE_AMAP_SECURITY_JS_CODE ?? ''

export const hasAmapKey = () => Boolean(getAmapKey())
const geocodeCache = new Map<string, Promise<[number, number] | null>>()

export async function loadAmap() {
  const key = getAmapKey()
  if (!key) {
    void emitTelemetry('amap.load.end', { ok: false, reason: 'missing_key' })
    return null
  }

  const securityJsCode = getAmapSecurityCode()
  void emitTelemetry('amap.load.start', { hasKey: true, hasSecurityJsCode: Boolean(securityJsCode) })

  try {
    if (typeof window !== 'undefined') {
      window._AMapSecurityConfig = securityJsCode ? { securityJsCode } : {}
    }

    const AMap = await AMapLoader.load({
      key,
      version: '2.0',
      plugins: ['AMap.Scale', 'AMap.ToolBar', 'AMap.Geocoder'],
    })
    if (typeof window !== 'undefined') {
      window.AMap = AMap
    }
    void emitTelemetry('amap.load.end', { ok: true })
    return AMap
  } catch (error) {
    void emitTelemetry('amap.load.end', { ok: false, error: String(error?.message || error) })
    return null
  }
}

type AmapLocation = {
  lng?: number
  lat?: number
  getLng?: () => number
  getLat?: () => number
}

const normalizeLocation = (location?: AmapLocation | null): [number, number] | null => {
  if (!location) return null
  const lng = typeof location.getLng === 'function' ? location.getLng() : location.lng
  const lat = typeof location.getLat === 'function' ? location.getLat() : location.lat
  return typeof lng === 'number' && typeof lat === 'number' ? [lng, lat] : null
}

export async function geocodeAmap(keyword: string) {
  const trimmed = keyword.trim()
  if (!trimmed || !hasAmapKey()) return null

  const cached = geocodeCache.get(trimmed)
  if (cached) return cached

  const task = (async () => {
    try {
      const AMap = await loadAmap()
      if (!AMap) return null

      const geocoder = new AMap.Geocoder()
      const point = await new Promise<[number, number] | null>((resolve) => {
        geocoder.getLocation(trimmed, (status: string, result: { geocodes?: Array<{ location?: AmapLocation }> }) => {
          if (status !== 'complete') {
            resolve(null)
            return
          }
          resolve(normalizeLocation(result?.geocodes?.[0]?.location))
        })
      })
      void emitTelemetry('amap.geocode.end', { keyword: trimmed, ok: Boolean(point) })
      return point
    } catch (error) {
      void emitTelemetry('amap.geocode.end', { keyword: trimmed, ok: false, error: String(error?.message || error) })
      return null
    }
  })()

  geocodeCache.set(trimmed, task)
  return task
}
