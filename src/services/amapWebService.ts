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

const cityCenters: Record<string, [number, number]> = {
  北京: [116.4074, 39.9042],
  上海: [121.4737, 31.2304],
  广州: [113.2644, 23.1291],
  深圳: [114.0579, 22.5431],
  杭州: [120.1551, 30.2741],
  成都: [104.0665, 30.5728],
  重庆: [106.5516, 29.563],
  西安: [108.9398, 34.3416],
  青岛: [120.3826, 36.0671],
  厦门: [118.0894, 24.4798],
  南京: [118.7969, 32.0603],
  苏州: [120.5853, 31.2989],
  武汉: [114.3054, 30.5931],
  长沙: [112.9388, 28.2282],
  三亚: [109.5119, 18.2528],
  香港: [114.1694, 22.3193],
  澳门: [113.5439, 22.1987],
  东京: [139.6917, 35.6895],
  大阪: [135.5023, 34.6937],
  京都: [135.7681, 35.0116],
  首尔: [126.978, 37.5665],
  新加坡: [103.8198, 1.3521],
  曼谷: [100.5018, 13.7563],
  巴黎: [2.3522, 48.8566],
  伦敦: [-0.1276, 51.5072],
  纽约: [-74.006, 40.7128],
}

const normalizeCity = (value = '') => value.replace(/市|特别行政区|自治区|省/g, '').trim()

const inferCenter = (value = '') => {
  const normalized = normalizeCity(value)
  const matchedKey = Object.keys(cityCenters).find((city) => normalized.includes(city) || city.includes(normalized))
  return matchedKey ? cityCenters[matchedKey] : null
}

const offsetPoint = (center: [number, number], index: number): [number, number] => {
  const angle = index * 1.7
  const radius = 0.012 + (index % 3) * 0.006
  return [
    Number((center[0] + Math.cos(angle) * radius).toFixed(6)),
    Number((center[1] + Math.sin(angle) * radius).toFixed(6)),
  ]
}

export async function verifyAmapWebService() {
  return { ok: true, info: 'static-mode' }
}

export async function geocodeAddress(address: string, city?: string) {
  return inferCenter(address) ?? inferCenter(city) ?? null
}

export async function searchAmapPoi(options: {
  keywords: string
  city?: string
  types?: string
  limit?: number
}) {
  const center = inferCenter(options.city) ?? inferCenter(options.keywords)
  if (!center) return []

  const normalizedCity = normalizeCity(options.city || options.keywords.split(/\s+/)[0] || '目的地')
  const limit = options.limit ?? 5
  const category = options.types?.startsWith('05') ? '餐饮' : options.types?.startsWith('10') ? '酒店' : options.types?.startsWith('15') ? '交通' : '景点'

  return Array.from({ length: limit }, (_, index): AmapPoi => {
    const location = offsetPoint(center, index)
    return {
      id: `static-${normalizedCity}-${category}-${index + 1}`,
      name: `${normalizedCity}${category === '景点' ? '城市漫游点' : category}${index + 1}`,
      type: category,
      address: `${normalizedCity}核心游览区`,
      cityname: normalizedCity,
      adname: normalizedCity,
      location,
    }
  })
}

export async function fetchAmapRoute(options: {
  origin: [number, number]
  destination: [number, number]
  mode?: 'walking' | 'driving'
}): Promise<AmapRouteSegment> {
  const [originLng, originLat] = options.origin
  const [destinationLng, destinationLat] = options.destination
  const distance = Math.hypot(destinationLng - originLng, destinationLat - originLat) * 100000
  const midpoint: [number, number] = [
    Number(((originLng + destinationLng) / 2).toFixed(6)),
    Number(((originLat + destinationLat) / 2 + 0.004).toFixed(6)),
  ]
  return {
    distance: Math.round(distance),
    duration: Math.round(distance / (options.mode === 'driving' ? 8 : 1.4)),
    polyline: [
      options.origin,
      midpoint,
      options.destination,
    ],
  }
}
