export type AmapPoi = {
  id: string
  name: string
  type: string
  address: string
  cityname: string
  adname: string
  location: [number, number] | null
}

export type AmapRouteSegment = {
  distance: number
  duration: number
  polyline: [number, number][]
}

const readJson = async <T>(url: string): Promise<T | null> => {
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    return (await response.json()) as T
  } catch {
    return null
  }
}

export async function verifyAmapWebService() {
  return readJson<{ ok: boolean; info?: string; reason?: string }>('/api/amap/verify')
}

export async function geocodeAddress(address: string, city?: string) {
  const params = new URLSearchParams({ address })
  if (city) params.set('city', city)
  const result = await readJson<{ ok: boolean; location: [number, number] | null }>(`/api/amap/geocode?${params.toString()}`)
  return result?.ok ? result.location : null
}

export async function searchAmapPoi(options: {
  keywords: string
  city?: string
  types?: string
  limit?: number
}) {
  const params = new URLSearchParams({ keywords: options.keywords })
  if (options.city) params.set('city', options.city)
  if (options.types) params.set('types', options.types)
  if (options.limit) params.set('offset', String(options.limit))
  const result = await readJson<{ ok: boolean; pois: AmapPoi[] }>(`/api/amap/poi?${params.toString()}`)
  return result?.ok ? result.pois : []
}

export async function fetchAmapRoute(options: {
  origin: [number, number]
  destination: [number, number]
  mode?: 'walking' | 'driving'
}) {
  const params = new URLSearchParams({
    origin: `${options.origin[0]},${options.origin[1]}`,
    destination: `${options.destination[0]},${options.destination[1]}`,
    mode: options.mode || 'walking',
  })
  const result = await readJson<{ ok: boolean; route: AmapRouteSegment | null }>(`/api/amap/route?${params.toString()}`)
  return result?.ok ? result.route : null
}
