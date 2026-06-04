const MAX_BODY_BYTES = 256 * 1024

const json = (res, statusCode, payload) => {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(payload))
}

const setCors = (res) => {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

const readBody = (req) =>
  new Promise((resolve, reject) => {
    const chunks = []
    let bytes = 0
    req.on('data', (chunk) => {
      bytes += chunk.length
      if (bytes > MAX_BODY_BYTES) {
        reject(new Error('payload_too_large'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')))
    req.on('error', reject)
  })

const parseJson = (value) => {
  try {
    return JSON.parse(value || '{}')
  } catch {
    return null
  }
}

const qwenConfig = () => ({
  apiKey: process.env.VITE_GPT_API_KEY || process.env.QWEN_API_KEY || '',
  baseUrl: (process.env.VITE_GPT_BASE_URL || process.env.QWEN_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1').replace(/\/$/, ''),
  model: process.env.VITE_GPT_MODEL || process.env.QWEN_MODEL || 'qwen-turbo',
})

const callQwen = async ({ prompt, system, temperature = 0.7 }) => {
  const { apiKey, baseUrl, model } = qwenConfig()
  if (!apiKey) return { ok: false, error: 'missing_qwen_api_key' }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: system || '你是中文旅行助手。' },
        { role: 'user', content: prompt || '' },
      ],
      temperature,
    }),
  })

  if (!response.ok) {
    return { ok: false, error: 'qwen_request_failed', status: response.status, detail: (await response.text()).slice(0, 600) }
  }

  const data = await response.json()
  const content = data?.choices?.[0]?.message?.content
  return { ok: typeof content === 'string' && Boolean(content.trim()), content: typeof content === 'string' ? content.trim() : '' }
}

const amapKey = () => process.env.VITE_AMAP_WEBSERVICE_KEY || process.env.AMAP_WEBSERVICE_KEY || ''

const fetchAmapJson = async (pathname, params = {}) => {
  const key = amapKey()
  if (!key) return { ok: false, error: 'missing_amap_webservice_key' }
  const search = new URLSearchParams()
  Object.entries(params).forEach(([field, value]) => {
    if (value === undefined || value === null || value === '') return
    search.set(field, String(value))
  })
  search.set('key', key)

  const response = await fetch(`https://restapi.amap.com${pathname}?${search.toString()}`)
  if (!response.ok) {
    return { ok: false, error: 'amap_request_failed', status: response.status, detail: (await response.text()).slice(0, 500) }
  }
  const data = await response.json()
  return { ok: String(data?.status) === '1', data, error: data?.info || data?.infocode || '' }
}

const parseAmapLocation = (value) => {
  const parts = String(value || '').split(',').map(Number)
  return parts.length === 2 && parts.every(Number.isFinite) ? [parts[0], parts[1]] : null
}

const amadeusConfig = () => ({
  apiKey: process.env.AMADEUS_API_KEY || process.env.AMADEUS_CLIENT_ID || '',
  apiSecret: process.env.AMADEUS_API_SECRET || process.env.AMADEUS_CLIENT_SECRET || '',
  baseUrl: (process.env.AMADEUS_BASE_URL || 'https://test.api.amadeus.com').replace(/\/$/, ''),
})

let amadeusToken = ''
let amadeusTokenExpiresAt = 0

const getAmadeusToken = async () => {
  const config = amadeusConfig()
  if (!config.apiKey || !config.apiSecret) return { ok: false, configured: false, error: 'missing_amadeus_credentials' }
  if (amadeusToken && Date.now() < amadeusTokenExpiresAt) return { ok: true, token: amadeusToken, baseUrl: config.baseUrl }

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: config.apiKey,
    client_secret: config.apiSecret,
  })
  const response = await fetch(`${config.baseUrl}/v1/security/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!response.ok) return { ok: false, configured: true, error: 'amadeus_auth_failed', status: response.status, detail: (await response.text()).slice(0, 600) }
  const data = await response.json()
  amadeusToken = String(data?.access_token || '')
  amadeusTokenExpiresAt = Date.now() + Math.max(60, Number(data?.expires_in || 1800) - 60) * 1000
  return amadeusToken ? { ok: true, token: amadeusToken, baseUrl: config.baseUrl } : { ok: false, configured: true, error: 'amadeus_missing_access_token' }
}

const fetchAmadeusJson = async (pathname, params = {}) => {
  const auth = await getAmadeusToken()
  if (!auth.ok) return auth
  const search = new URLSearchParams()
  Object.entries(params).forEach(([field, value]) => {
    if (value === undefined || value === null || value === '') return
    search.set(field, String(value))
  })
  const response = await fetch(`${auth.baseUrl}${pathname}?${search.toString()}`, {
    headers: { Authorization: `Bearer ${auth.token}` },
  })
  if (!response.ok) return { ok: false, configured: true, error: 'amadeus_request_failed', status: response.status, detail: (await response.text()).slice(0, 600) }
  return { ok: true, configured: true, data: await response.json() }
}

const searchFlights = async ({ originCode, destinationCode, departureDate, returnDate, adults }) => {
  const result = await fetchAmadeusJson('/v2/shopping/flight-offers', {
    originLocationCode: originCode,
    destinationLocationCode: destinationCode,
    departureDate,
    returnDate,
    adults,
    currencyCode: 'CNY',
    max: 8,
  })
  if (!result.ok) return result
  const flights = Array.isArray(result.data?.data)
    ? result.data.data.map((offer) => ({
        id: String(offer?.id || crypto.randomUUID()),
        source: 'amadeus',
        airlineCodes: Array.isArray(offer?.itineraries)
          ? [...new Set(offer.itineraries.flatMap((itinerary) => Array.isArray(itinerary?.segments) ? itinerary.segments.map((segment) => String(segment?.carrierCode || '')) : []))]
          : [],
        validatingAirlineCodes: Array.isArray(offer?.validatingAirlineCodes) ? offer.validatingAirlineCodes : [],
        totalPrice: Number(offer?.price?.grandTotal || offer?.price?.total || 0),
        currency: String(offer?.price?.currency || 'CNY'),
        bookableSeats: Number(offer?.numberOfBookableSeats || 0) || undefined,
        lastTicketingDate: offer?.lastTicketingDate || '',
        itineraries: Array.isArray(offer?.itineraries)
          ? offer.itineraries.map((itinerary) =>
              Array.isArray(itinerary?.segments)
                ? itinerary.segments.map((segment) => ({
                    carrierCode: String(segment?.carrierCode || ''),
                    flightNumber: `${String(segment?.carrierCode || '')}${String(segment?.number || '')}`,
                    departureIata: String(segment?.departure?.iataCode || ''),
                    arrivalIata: String(segment?.arrival?.iataCode || ''),
                    departureAt: String(segment?.departure?.at || ''),
                    arrivalAt: String(segment?.arrival?.at || ''),
                    duration: String(segment?.duration || ''),
                  }))
                : [],
            )
          : [],
      }))
    : []
  return { ok: true, configured: true, flights }
}

const searchHotels = async ({ cityCode, checkInDate, checkOutDate, adults, roomQuantity }) => {
  const list = await fetchAmadeusJson('/v1/reference-data/locations/hotels/by-city', {
    cityCode,
    radius: 8,
    radiusUnit: 'KM',
    hotelSource: 'ALL',
  })
  if (!list.ok) return list
  const hotelIds = Array.isArray(list.data?.data)
    ? list.data.data.map((hotel) => String(hotel?.hotelId || '')).filter(Boolean).slice(0, 12)
    : []
  if (hotelIds.length === 0) return { ok: true, configured: true, hotels: [], warnings: ['Amadeus 未返回可报价酒店列表。'] }

  const offers = await fetchAmadeusJson('/v3/shopping/hotel-offers', {
    hotelIds: hotelIds.join(','),
    adults,
    roomQuantity,
    checkInDate,
    checkOutDate,
    bestRateOnly: true,
  })
  if (!offers.ok) return offers
  const hotels = Array.isArray(offers.data?.data)
    ? offers.data.data.map((item) => {
        const offer = Array.isArray(item?.offers) ? item.offers[0] : null
        const cancellation = Array.isArray(offer?.policies?.cancellations) ? offer.policies.cancellations[0] : null
        const addressLines = Array.isArray(item?.hotel?.address?.lines) ? item.hotel.address.lines.filter(Boolean) : []
        return {
          id: `${String(item?.hotel?.hotelId || '')}-${String(offer?.id || 'offer')}`,
          hotelId: String(item?.hotel?.hotelId || ''),
          hotelName: String(item?.hotel?.name || '未命名酒店'),
          cityCode,
          address: addressLines.join(' ') || String(item?.hotel?.address?.cityName || ''),
          latitude: Number(item?.hotel?.geoCode?.latitude || 0) || undefined,
          longitude: Number(item?.hotel?.geoCode?.longitude || 0) || undefined,
          roomType: String(offer?.room?.typeEstimated?.category || offer?.room?.description?.text || '标准房型'),
          boardType: String(offer?.boardType || 'ROOM_ONLY'),
          refundable: Boolean(cancellation?.deadline),
          cancellationDeadline: cancellation?.deadline || '',
          totalPrice: Number(offer?.price?.total || 0),
          currency: String(offer?.price?.currency || 'CNY'),
          source: 'amadeus',
        }
      })
    : []
  return { ok: true, configured: true, hotels, warnings: [] }
}

const handleAmap = async (pathname, url, res) => {
  if (pathname === '/api/amap/verify') {
    const result = await fetchAmapJson('/v3/ip')
    return json(res, 200, { ok: result.ok, info: result.data?.info || result.error || '' })
  }
  if (pathname === '/api/amap/geocode') {
    const address = url.searchParams.get('address') || ''
    const city = url.searchParams.get('city') || ''
    if (!address.trim()) return json(res, 400, { ok: false, error: 'missing_address' })
    const result = await fetchAmapJson('/v3/geocode/geo', { address, city })
    if (!result.ok) return json(res, 200, result)
    const geocode = result.data?.geocodes?.[0]
    return json(res, 200, {
      ok: Boolean(parseAmapLocation(geocode?.location)),
      location: parseAmapLocation(geocode?.location),
      formattedAddress: geocode?.formatted_address || address,
      raw: geocode || null,
    })
  }
  if (pathname === '/api/amap/poi') {
    const keywords = url.searchParams.get('keywords') || ''
    const city = url.searchParams.get('city') || ''
    const types = url.searchParams.get('types') || ''
    const offset = Math.max(1, Math.min(10, Number(url.searchParams.get('offset') || 5)))
    if (!keywords.trim()) return json(res, 400, { ok: false, error: 'missing_keywords' })
    const result = await fetchAmapJson('/v3/place/text', { keywords, city, types, offset, page: 1, extensions: 'base' })
    if (!result.ok) return json(res, 200, result)
    const pois = Array.isArray(result.data?.pois)
      ? result.data.pois.map((poi) => ({
          id: poi.id,
          name: poi.name,
          type: poi.type,
          address: Array.isArray(poi.address) ? poi.address.join(' ') : poi.address,
          cityname: poi.cityname,
          adname: poi.adname,
          location: parseAmapLocation(poi.location),
        }))
      : []
    return json(res, 200, { ok: true, pois })
  }
  if (pathname === '/api/amap/route') {
    const origin = url.searchParams.get('origin') || ''
    const destination = url.searchParams.get('destination') || ''
    const mode = url.searchParams.get('mode') || 'walking'
    if (!origin || !destination) return json(res, 400, { ok: false, error: 'missing_origin_or_destination' })
    const endpoint = mode === 'driving' ? '/v3/direction/driving' : '/v3/direction/walking'
    const result = await fetchAmapJson(endpoint, { origin, destination, strategy: 0, output: 'json' })
    if (!result.ok) return json(res, 200, result)
    const path = result.data?.route?.paths?.[0]
    const steps = Array.isArray(path?.steps) ? path.steps : []
    const polyline = steps
      .flatMap((step) => String(step?.polyline || '').split(';'))
      .map(parseAmapLocation)
      .filter(Boolean)
    return json(res, 200, {
      ok: polyline.length > 1,
      route: polyline.length > 1 ? { distance: Number(path?.distance || 0), duration: Number(path?.duration || 0), polyline } : null,
    })
  }
  return json(res, 404, { error: 'not_found' })
}

const handlePricing = async (pathname, url, res) => {
  if (pathname === '/api/pricing/verify') return json(res, 200, await getAmadeusToken())
  if (pathname !== '/api/pricing/search') return json(res, 404, { error: 'not_found' })

  const originCode = (url.searchParams.get('originCode') || '').toUpperCase()
  const destinationCode = (url.searchParams.get('destinationCode') || '').toUpperCase()
  const cityCode = (url.searchParams.get('cityCode') || destinationCode).toUpperCase()
  const originCity = url.searchParams.get('originCity') || originCode
  const destinationCity = url.searchParams.get('destinationCity') || destinationCode
  const departureDate = url.searchParams.get('departureDate') || ''
  const returnDate = url.searchParams.get('returnDate') || ''
  const checkInDate = url.searchParams.get('checkInDate') || ''
  const checkOutDate = url.searchParams.get('checkOutDate') || ''
  const adults = Math.max(1, Math.min(8, Number(url.searchParams.get('adults') || 1)))
  const roomQuantity = Math.max(1, Math.min(4, Number(url.searchParams.get('roomQuantity') || 1)))
  const tripDays = Math.max(1, Math.min(14, Number(url.searchParams.get('tripDays') || 1)))
  const querySummary = url.searchParams.get('querySummary') || ''

  if (!originCode || !destinationCode || !departureDate || !returnDate || !checkInDate || !checkOutDate) {
    return json(res, 400, { ok: false, error: 'missing_pricing_params' })
  }

  const [flightResult, hotelResult] = await Promise.all([
    searchFlights({ originCode, destinationCode, departureDate, returnDate, adults }),
    searchHotels({ cityCode, checkInDate, checkOutDate, adults, roomQuantity }),
  ])
  const warnings = [
    ...(!flightResult.ok ? [`Amadeus 航班接口未返回结果：${flightResult.error}`] : []),
    ...(flightResult.warnings || []),
    ...(!hotelResult.ok ? [`Amadeus 酒店接口未返回结果：${hotelResult.error}`] : []),
    ...(hotelResult.warnings || []),
    '火车票真实供应商 API 尚未配置；当前云函数不会伪造火车票实时余票。',
  ]

  const flights = flightResult.ok ? flightResult.flights || [] : []
  const hotels = hotelResult.ok ? hotelResult.hotels || [] : []
  return json(res, 200, {
    ok: flights.length > 0 || hotels.length > 0,
    provider: 'amadeus',
    configured: Boolean(flightResult.configured || hotelResult.configured),
    query: {
      originCity,
      originCode,
      destinationCity,
      destinationCode,
      departureDate,
      returnDate,
      checkInDate,
      checkOutDate,
      adults,
      roomQuantity,
      tripDays,
      approximateDates: url.searchParams.get('approximateDates') === '1',
      querySummary,
    },
    flights,
    hotels,
    trains: [],
    warnings,
    fetchedAt: new Date().toISOString(),
    error: flights.length || hotels.length ? undefined : 'pricing_provider_unavailable',
  })
}

export default async function handler(req, res) {
  setCors(res)
  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.end()
    return
  }

  const url = new URL(req.url || '/', `https://${req.headers.host || 'localhost'}`)
  const pathname = url.pathname

  try {
    if (pathname === '/healthz') return json(res, 200, { ok: true })
    if (pathname === '/api/qwen/chat' && req.method === 'POST') {
      const body = parseJson(await readBody(req))
      if (!body || !body.prompt) return json(res, 400, { ok: false, error: 'missing_prompt' })
      return json(res, 200, await callQwen(body))
    }
    if (pathname.startsWith('/api/amap/')) return handleAmap(pathname, url, res)
    if (pathname.startsWith('/api/pricing/')) return handlePricing(pathname, url, res)
    return json(res, 404, { error: 'not_found' })
  } catch (error) {
    return json(res, String(error?.message) === 'payload_too_large' ? 413 : 500, {
      ok: false,
      error: String(error?.message || error),
    })
  }
}
