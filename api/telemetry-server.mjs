import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import { chromium } from 'playwright'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const PORT = Number(process.env.TELEMETRY_PORT || 8787)
const LOG_DIR = process.env.TELEMETRY_LOG_DIR || path.resolve(__dirname, '../logs')
const LOG_PATH = process.env.TELEMETRY_LOG_PATH || path.join(LOG_DIR, 'telemetry.ndjson')
const SECRETS_PATH = process.env.TELEMETRY_SECRETS_PATH || path.resolve(__dirname, '../secrets/local.keys.env')
const MAX_BODY_BYTES = 256 * 1024

fs.mkdirSync(LOG_DIR, { recursive: true })

const clients = new Set()

const sendJson = (res, statusCode, data) => {
  const payload = JSON.stringify(data)
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  })
  res.end(payload)
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

const safeJson = (value) => {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

const appendLog = (entry) => {
  const line = JSON.stringify(entry)
  fs.appendFileSync(LOG_PATH, `${line}\n`, 'utf-8')
  const payload = `data: ${line}\n\n`
  clients.forEach((client) => {
    try {
      client.write(payload)
    } catch {
      clients.delete(client)
    }
  })
}

const tailLines = (filePath, limit) => {
  if (!fs.existsSync(filePath)) return []
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.trim().split('\n')
  return lines.slice(-limit).map((line) => safeJson(line)).filter(Boolean)
}

const readSecrets = () => {
  const env = { ...process.env }
  if (fs.existsSync(SECRETS_PATH)) {
    try {
      Object.assign(env, dotenv.parse(fs.readFileSync(SECRETS_PATH)))
    } catch {
      return env
    }
  }
  return env
}

const verifyQwen = async () => {
  const env = readSecrets()
  const apiKey = env.VITE_GPT_API_KEY || ''
  const baseUrl = (env.VITE_GPT_BASE_URL || '').replace(/\/$/, '')
  const model = env.VITE_GPT_MODEL || 'qwen-turbo'
  if (!apiKey || !baseUrl) {
    return { ok: false, reason: 'missing_config' }
  }

  const startedAt = Date.now()
  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'ping' }],
        temperature: 0,
      }),
    })

    const elapsedMs = Date.now() - startedAt
    if (!response.ok) {
      const text = await response.text()
      return { ok: false, status: response.status, elapsedMs, body: text.slice(0, 600) }
    }
    const data = await response.json()
    const content = data?.choices?.[0]?.message?.content
    return { ok: Boolean(content), elapsedMs, model }
  } catch (error) {
    const elapsedMs = Date.now() - startedAt
    return { ok: false, elapsedMs, error: String(error?.message || error) }
  }
}

const verifyAmapWebService = async () => {
  const env = readSecrets()
  const key = env.VITE_AMAP_WEBSERVICE_KEY || ''
  if (!key) {
    return { ok: false, reason: 'missing_webservice_key' }
  }

  const startedAt = Date.now()
  try {
    const response = await fetch(`https://restapi.amap.com/v3/ip?key=${encodeURIComponent(key)}`, {
      method: 'GET',
    })
    const elapsedMs = Date.now() - startedAt
    if (!response.ok) {
      const text = await response.text()
      return { ok: false, status: response.status, elapsedMs, body: text.slice(0, 600) }
    }
    const data = await response.json()
    return { ok: String(data?.status) === '1', elapsedMs, info: data?.info || '' }
  } catch (error) {
    const elapsedMs = Date.now() - startedAt
    return { ok: false, elapsedMs, error: String(error?.message || error) }
  }
}

const fetchAmapJson = async (pathname, params = {}) => {
  const env = readSecrets()
  const key = env.VITE_AMAP_WEBSERVICE_KEY || ''
  if (!key) {
    return { ok: false, reason: 'missing_webservice_key' }
  }

  const search = new URLSearchParams()
  Object.entries(params).forEach(([field, value]) => {
    if (value === undefined || value === null || value === '') return
    search.set(field, String(value))
  })
  search.set('key', key)

  try {
    const response = await fetch(`https://restapi.amap.com${pathname}?${search.toString()}`, {
      method: 'GET',
    })
    if (!response.ok) {
      return { ok: false, status: response.status, body: (await response.text()).slice(0, 500) }
    }
    const data = await response.json()
    return { ok: String(data?.status) === '1', data }
  } catch (error) {
    return { ok: false, error: String(error?.message || error) }
  }
}

const amadeusTokenCache = {
  token: '',
  expiresAt: 0,
  baseUrl: '',
}

const BOOKING_CITY_PAGE_MAP = {
  东京: 'https://www.booking.com/city/jp/tokyo.zh-cn.html',
  成都: 'https://www.booking.com/city/cn/chengdu.zh-cn.html',
  新加坡: 'https://www.booking.com/city/sg/singapore.zh-cn.html',
  深圳: 'https://www.booking.com/city/cn/shenzhen.zh-cn.html',
  上海: 'https://www.booking.com/city/cn/shanghai.zh-cn.html',
  北京: 'https://www.booking.com/city/cn/beijing.zh-cn.html',
  广州: 'https://www.booking.com/city/cn/guangzhou.zh-cn.html',
  杭州: 'https://www.booking.com/city/cn/hangzhou.zh-cn.html',
  武汉: 'https://www.booking.com/city/cn/wuhan.zh-cn.html',
  珠海: 'https://www.booking.com/city/cn/zhuhai.zh-cn.html',
  重庆: 'https://www.booking.com/city/cn/chongqing.zh-cn.html',
  西安: 'https://www.booking.com/city/cn/xian.zh-cn.html',
  三亚: 'https://www.booking.com/city/cn/sanya.zh-cn.html',
  香港: 'https://www.booking.com/city/hk/hong-kong.zh-cn.html',
  澳门: 'https://www.booking.com/city/mo/macau.zh-cn.html',
  台北: 'https://www.booking.com/city/tw/taipei.zh-cn.html',
  大阪: 'https://www.booking.com/city/jp/osaka.zh-cn.html',
  京都: 'https://www.booking.com/city/jp/kyoto.zh-cn.html',
  首尔: 'https://www.booking.com/city/kr/seoul.zh-cn.html',
  釜山: 'https://www.booking.com/city/kr/busan.zh-cn.html',
  曼谷: 'https://www.booking.com/city/th/bangkok.zh-cn.html',
  吉隆坡: 'https://www.booking.com/city/my/kuala-lumpur.zh-cn.html',
  巴黎: 'https://www.booking.com/city/fr/paris.zh-cn.html',
  伦敦: 'https://www.booking.com/city/gb/london.zh-cn.html',
  罗马: 'https://www.booking.com/city/it/rome.zh-cn.html',
  米兰: 'https://www.booking.com/city/it/milan.zh-cn.html',
  柏林: 'https://www.booking.com/city/de/berlin.zh-cn.html',
  巴塞罗那: 'https://www.booking.com/city/es/barcelona.zh-cn.html',
  纽约: 'https://www.booking.com/city/us/new-york.zh-cn.html',
  洛杉矶: 'https://www.booking.com/city/us/los-angeles.zh-cn.html',
  旧金山: 'https://www.booking.com/city/us/san-francisco.zh-cn.html',
  拉斯维加斯: 'https://www.booking.com/city/us/las-vegas.zh-cn.html',
  迪拜: 'https://www.booking.com/city/ae/dubai.zh-cn.html',
  悉尼: 'https://www.booking.com/city/au/sydney.zh-cn.html',
  墨尔本: 'https://www.booking.com/city/au/melbourne.zh-cn.html',
}

const normalizePricingCity = (value = '') => value.replace(/市|特别行政区|自治区|省/g, '').trim()

const TRIP_TRAIN_CITY_MAP = {
  北京: 'Beijing',
  上海: 'Shanghai',
  广州: 'Guangzhou',
  深圳: 'Shenzhen',
  杭州: 'Hangzhou',
  成都: 'Chengdu',
  重庆: 'Chongqing',
  西安: "Xi'an",
  珠海: 'Zhuhai',
  青岛: 'Qingdao',
  厦门: 'Xiamen',
  南京: 'Nanjing',
  武汉: 'Wuhan',
  长沙: 'Changsha',
  天津: 'Tianjin',
  苏州: 'Suzhou',
  宁波: 'Ningbo',
}

const parseCurrencyAmount = (value) => {
  const match = String(value || '').replace(/\s+/g, '').match(/(¥|US\$|CNY|USD)(\d+(?:\.\d+)?)/i) || String(value || '').replace(/\s+/g, '').match(/(\d+(?:\.\d+)?)(元|CNY|USD)/i)
  if (!match) return null
  const first = match[1]
  const second = match[2]
  const amount = Number(/^\d/.test(first) ? first : second)
  if (!Number.isFinite(amount)) return null
  const currencyRaw = /^\d/.test(first) ? second : first
  const currencyMap = { '¥': 'CNY', 元: 'CNY', 'US$': 'USD' }
  return {
    totalPrice: amount,
    currency: currencyMap[currencyRaw] || String(currencyRaw).toUpperCase(),
  }
}

const withTimeOnDate = (isoDate, time) => {
  if (!isoDate || !time) return ''
  return `${isoDate}T${time}:00`
}

const minutesBetweenTimes = (departureTime, arrivalTime) => {
  const [depHour, depMinute] = String(departureTime || '0:0').split(':').map(Number)
  const [arrHour, arrMinute] = String(arrivalTime || '0:0').split(':').map(Number)
  if (![depHour, depMinute, arrHour, arrMinute].every((item) => Number.isFinite(item))) return 0
  let diff = arrHour * 60 + arrMinute - (depHour * 60 + depMinute)
  if (diff <= 0) diff += 24 * 60
  return diff
}

const minutesToIsoDuration = (minutes) => {
  if (!minutes || minutes <= 0) return ''
  const hours = Math.floor(minutes / 60)
  const remain = minutes % 60
  if (hours && remain) return `PT${hours}H${remain}M`
  if (hours) return `PT${hours}H`
  return `PT${remain}M`
}

const parseBookingPrice = (value) => {
  const normalized = String(value || '').replace(/\s+/g, '')
  const amountMatch = normalized.match(/([\d,.]+)(元|CNY|USD|GBP|EUR|SGD|HKD|JPY)/i)
  if (!amountMatch) return null
  const amount = Number(amountMatch[1].replace(/,/g, ''))
  if (!Number.isFinite(amount)) return null
  const currencyMap = {
    元: 'CNY',
  }
  return {
    totalPrice: amount,
    currency: currencyMap[amountMatch[2]] || amountMatch[2].toUpperCase(),
  }
}

const scrapePageText = async (url, locale = 'zh-CN', waitMs = 5000) => {
  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage({ locale })
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForTimeout(waitMs)
    return {
      ok: true,
      text: await page.locator('body').innerText(),
      title: await page.title(),
      url: page.url(),
    }
  } catch (error) {
    return { ok: false, error: String(error?.message || error) }
  } finally {
    await browser.close()
  }
}

const parseCtripOneWayFlights = (text, travelDate) => {
  const lines = String(text || '').split('\n').map((line) => line.trim()).filter(Boolean)
  const offers = []
  for (let index = 0; index < lines.length; index += 1) {
    const airline = lines[index]
    if (!/航空|Airlines/i.test(airline) || /航空公司|携程|登录|注册|客服|低价优先|排序/.test(airline)) continue

    const flightLine = lines.slice(index + 1, index + 5).find((line) => /[A-Z0-9]{2}\d{3,4}/.test(line)) || ''
    const flightNumberMatch = flightLine.match(/([A-Z0-9]{2}\d{3,4})/)
    const departureIndex = lines.slice(index + 1, index + 8).findIndex((line) => /^\d{2}:\d{2}$/.test(line))
    if (departureIndex < 0) continue
    const depIndex = index + 1 + departureIndex
    const departureTime = lines[depIndex]
    const departureAirport = lines[depIndex + 1] || ''
    const arrivalTime = lines[depIndex + 2] || ''
    const arrivalAirport = lines[depIndex + 3] || ''
    if (!/^\d{2}:\d{2}$/.test(arrivalTime) || !departureAirport || !arrivalAirport) continue

    const priceLine = lines.slice(depIndex + 1, depIndex + 10).find((line) => /¥\d+/.test(line)) || ''
    const price = parseCurrencyAmount(priceLine)
    if (!price) continue

    const durationMinutes = minutesBetweenTimes(departureTime, arrivalTime)
    const flightNumber = flightNumberMatch?.[1] || `${airline.slice(0, 2).toUpperCase()}${offers.length + 1}`
    const carrierCode = flightNumber.slice(0, 2).toUpperCase()
    offers.push({
      id: `ctrip-${flightNumber}-${departureTime}`,
      source: 'ctrip',
      airlineCodes: [carrierCode],
      validatingAirlineCodes: [airline],
      totalPrice: price.totalPrice,
      currency: price.currency,
      itineraries: [[
        {
          carrierCode,
          flightNumber,
          departureIata: departureAirport,
          arrivalIata: arrivalAirport,
          departureAt: withTimeOnDate(travelDate, departureTime),
          arrivalAt: withTimeOnDate(travelDate, arrivalTime),
          duration: minutesToIsoDuration(durationMinutes),
        },
      ]],
    })
    index = depIndex + 4
    if (offers.length >= 8) break
  }
  return offers
}

const searchCtripFlights = async ({ originCode, destinationCode, departureDate, returnDate }) => {
  const outboundUrl = `https://flights.ctrip.com/online/list/oneway-${originCode.toLowerCase()}-${destinationCode.toLowerCase()}?depdate=${departureDate}`
  const inboundUrl = `https://flights.ctrip.com/online/list/oneway-${destinationCode.toLowerCase()}-${originCode.toLowerCase()}?depdate=${returnDate}`
  const [outboundPage, inboundPage] = await Promise.all([
    scrapePageText(outboundUrl, 'zh-CN', 5000),
    scrapePageText(inboundUrl, 'zh-CN', 5000),
  ])

  if (!outboundPage.ok) {
    return { ok: false, configured: true, error: outboundPage.error || 'ctrip_outbound_unavailable' }
  }

  const outboundOffers = parseCtripOneWayFlights(outboundPage.text, departureDate)
  const inboundOffers = inboundPage.ok ? parseCtripOneWayFlights(inboundPage.text, returnDate) : []
  if (outboundOffers.length === 0) {
    return { ok: false, configured: true, error: 'ctrip_flights_empty' }
  }

  if (inboundOffers.length === 0) {
    return {
      ok: true,
      configured: true,
      flights: outboundOffers.slice(0, 6),
      warnings: ['当前航班结果来自携程公开航班页；返程页暂未解析出可用结果，因此当前先展示去程参考价。'],
    }
  }

  const combos = []
  outboundOffers.slice(0, 4).forEach((outbound, outboundIndex) => {
    inboundOffers.slice(0, 3).forEach((inbound, inboundIndex) => {
      combos.push({
        id: `ctrip-roundtrip-${outboundIndex + 1}-${inboundIndex + 1}`,
        source: 'ctrip',
        airlineCodes: [...new Set([...(outbound.airlineCodes || []), ...(inbound.airlineCodes || [])])],
        validatingAirlineCodes: [...new Set([...(outbound.validatingAirlineCodes || []), ...(inbound.validatingAirlineCodes || [])])],
        totalPrice: Number(outbound.totalPrice || 0) + Number(inbound.totalPrice || 0),
        currency: outbound.currency || inbound.currency || 'CNY',
        itineraries: [outbound.itineraries[0] || [], inbound.itineraries[0] || []],
      })
    })
  })

  return {
    ok: true,
    configured: true,
    flights: combos.sort((left, right) => left.totalPrice - right.totalPrice).slice(0, 6),
    warnings: ['当前航班总价来自携程公开页的去返程组合参考，不同舱位和税费可能在下单页有细微差异。'],
  }
}

const parseTripTrainOffers = (text, departureDate) => {
  const lines = String(text || '').split('\n').map((line) => line.replace(/\s+/g, ' ').trim()).filter(Boolean)
  const offers = []
  for (let index = 0; index < lines.length - 7; index += 1) {
    if (!/^\d{2}:\d{2}$/.test(lines[index])) continue
    if (!/^\d{2}:\d{2}$/.test(lines[index + 2])) continue
    const departureTime = lines[index]
    const departureStation = lines[index + 1]
    const arrivalTime = lines[index + 2]
    const arrivalStation = lines[index + 3]
    const trainNumber = lines.slice(index + 4, index + 10).find((line) => /^[GDCZTKSYL]\d+$/i.test(line)) || ''
    const duration = lines.slice(index + 4, index + 10).find((line) => /\d+h/.test(line)) || ''
    const priceLine = lines.slice(index + 4, index + 10).find((line) => /(US\$|¥)\d+/.test(line)) || ''
    if (!trainNumber || !duration || !priceLine) continue
    const availability =
      lines.slice(index + 4, index + 10).find((line) => /sale|Available|Sold|候补|售罄/i.test(line)) ||
      '可前往平台查看余票'
    const price = parseCurrencyAmount(priceLine)
    if (!price) continue
    offers.push({
      id: `trip-train-${trainNumber}-${departureTime}`,
      source: 'trip',
      trainNumber,
      departureStation,
      arrivalStation,
      departureAt: withTimeOnDate(departureDate, departureTime),
      arrivalAt: withTimeOnDate(departureDate, arrivalTime),
      duration,
      seatType: trainNumber.startsWith('G') || trainNumber.startsWith('D') ? '高铁/动车二等座参考' : '普通列车二等/硬座参考',
      availability,
      totalPrice: price.totalPrice,
      currency: price.currency,
    })
    index += 4
    if (offers.length >= 8) break
  }
  return offers
}

const searchTripTrains = async ({ originCity, destinationCity, departureDate }) => {
  const fromCity = TRIP_TRAIN_CITY_MAP[normalizePricingCity(originCity)]
  const toCity = TRIP_TRAIN_CITY_MAP[normalizePricingCity(destinationCity)]
  if (!fromCity || !toCity) {
    return {
      ok: false,
      configured: true,
      error: 'trip_train_city_not_supported',
      warnings: [`暂时还没有为“${originCity} -> ${destinationCity}”配置火车票抓取所需的英文站点映射。`],
    }
  }

  const url = `https://www.trip.com/trains/china/list?departureStation=${encodeURIComponent(fromCity)}&arrivalStation=${encodeURIComponent(toCity)}&departureDate=${departureDate}`
  const page = await scrapePageText(url, 'en-US', 7000)
  if (!page.ok) return { ok: false, configured: true, error: page.error || 'trip_trains_unavailable' }
  const trains = parseTripTrainOffers(page.text, departureDate)
  if (trains.length === 0) {
    return {
      ok: false,
      configured: true,
      error: 'trip_trains_empty',
      warnings: ['当前火车票页未返回可展示的车次，可能是暂无直达列车、超出可售窗口，或平台页面未展示该线路。'],
    }
  }
  return {
    ok: true,
    configured: true,
    trains,
    warnings: ['火车票结果来自 Trip.com 公开火车页，价格通常为当前可见席别的参考起价。'],
  }
}

const parseJsonObject = (value) => {
  const text = String(value || '').trim()
  if (!text) return null
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]
  const candidate = fenced || text
  try {
    return JSON.parse(candidate)
  } catch {
    const start = candidate.indexOf('{')
    const end = candidate.lastIndexOf('}')
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(candidate.slice(start, end + 1))
      } catch {
        return null
      }
    }
    return null
  }
}

const callQwenJson = async ({ system, prompt, temperature = 0.35 }) => {
  const env = readSecrets()
  const apiKey = env.VITE_GPT_API_KEY || ''
  const baseUrl = (env.VITE_GPT_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1').replace(/\/$/, '')
  const model = env.VITE_GPT_MODEL || 'qwen-turbo'
  if (!apiKey || !baseUrl) return { ok: false, error: 'missing_qwen_credentials' }

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: prompt },
        ],
        temperature,
        response_format: { type: 'json_object' },
      }),
    })

    if (!response.ok) {
      return { ok: false, error: 'qwen_request_failed', status: response.status, body: (await response.text()).slice(0, 600) }
    }

    const data = await response.json()
    const content = data?.choices?.[0]?.message?.content
    const parsed = parseJsonObject(content)
    return parsed ? { ok: true, data: parsed } : { ok: false, error: 'qwen_json_parse_failed' }
  } catch (error) {
    return { ok: false, error: String(error?.message || error) }
  }
}

const fallbackSystemPrompt = [
  '你是中文旅行报价兜底助手。',
  '供应商检索失败时，你只能给出“参考方案”，不能声称实时可售、真实余票或真实房价。',
  '请基于常识生成合理、保守、可核验的候选项，用于用户后续去 OTA/航司/铁路平台确认。',
  '必须只输出 JSON 对象，不要 Markdown，不要解释。',
].join('\n')

const normalizeIsoDateTime = (date, time) => {
  if (!date || !/^\d{2}:\d{2}$/.test(String(time || ''))) return ''
  return `${date}T${time}:00`
}

const buildLlmFallbackPrompt = ({ originCity, destinationCity, originCode, destinationCode, departureDate, returnDate, checkInDate, checkOutDate, adults, roomQuantity, missingKinds }) => `
请为一次旅行生成兜底参考报价 JSON。

行程：
- 出发地：${originCity} (${originCode})
- 目的地：${destinationCity} (${destinationCode})
- 去程日期：${departureDate}
- 返程日期：${returnDate}
- 酒店入住：${checkInDate}
- 酒店离店：${checkOutDate}
- 成人数：${adults}
- 房间数：${roomQuantity}

需要补齐的类别：${missingKinds.join(', ')}

输出格式必须是：
{
  "flights": [
    {
      "airline": "航司中文名或代码",
      "flightNumber": "合理航班号",
      "departureTime": "HH:mm",
      "arrivalTime": "HH:mm",
      "returnFlightNumber": "合理返程航班号",
      "returnDepartureTime": "HH:mm",
      "returnArrivalTime": "HH:mm",
      "priceCny": 1200,
      "notes": "参考说明"
    }
  ],
  "hotels": [
    {
      "hotelName": "酒店名或区域型酒店名",
      "address": "商圈/区域",
      "roomType": "房型",
      "boardType": "餐食",
      "priceCny": 1800,
      "notes": "参考说明"
    }
  ],
  "trains": [
    {
      "trainNumber": "G1234",
      "departureStation": "站名",
      "arrivalStation": "站名",
      "departureTime": "HH:mm",
      "arrivalTime": "HH:mm",
      "duration": "5h 0m",
      "seatType": "二等座参考",
      "priceCny": 550,
      "notes": "参考说明"
    }
  ]
}

每个需要补齐的类别必须正好 5 条；不需要补齐的类别输出空数组。价格为总价或单人常见参考价都可以，但 notes 必须说明“AI 参考，需到平台核验”。`

const padToFive = (items) => {
  const normalized = Array.isArray(items) ? items.slice(0, 5) : []
  while (normalized.length < 5) normalized.push({})
  return normalized
}

const createFallbackFlights = (items, { originCode, destinationCode, departureDate, returnDate }) =>
  padToFive(items).map((item, index) => {
    const airline = String(item?.airline || '航司待确认').trim()
    const flightNumber = String(item?.flightNumber || `AI${100 + index}`).replace(/\s+/g, '')
    const returnFlightNumber = String(item?.returnFlightNumber || `AI${200 + index}`).replace(/\s+/g, '')
    const departureAt = normalizeIsoDateTime(departureDate, item?.departureTime) || `${departureDate}T09:00:00`
    const arrivalAt = normalizeIsoDateTime(departureDate, item?.arrivalTime) || `${departureDate}T11:00:00`
    const returnDepartureAt = normalizeIsoDateTime(returnDate, item?.returnDepartureTime) || `${returnDate}T17:00:00`
    const returnArrivalAt = normalizeIsoDateTime(returnDate, item?.returnArrivalTime) || `${returnDate}T19:00:00`
    return {
      id: `llm-flight-${index + 1}`,
      source: 'llm',
      airlineCodes: [airline],
      validatingAirlineCodes: [airline],
      totalPrice: Math.max(1, Number(item?.priceCny || 0)) || 1200 + index * 120,
      currency: 'CNY',
      itineraries: [
        [{
          carrierCode: airline,
          flightNumber,
          departureIata: originCode,
          arrivalIata: destinationCode,
          departureAt,
          arrivalAt,
          duration: minutesToIsoDuration(Math.max(45, Math.round((new Date(arrivalAt) - new Date(departureAt)) / 60000) || 120)),
        }],
        [{
          carrierCode: airline,
          flightNumber: returnFlightNumber,
          departureIata: destinationCode,
          arrivalIata: originCode,
          departureAt: returnDepartureAt,
          arrivalAt: returnArrivalAt,
          duration: minutesToIsoDuration(Math.max(45, Math.round((new Date(returnArrivalAt) - new Date(returnDepartureAt)) / 60000) || 120)),
        }],
      ],
      lastTicketingDate: '',
      notes: String(item?.notes || 'AI 参考，需到平台核验。'),
    }
  })

const createFallbackHotels = (items, { destinationCity, destinationCode, checkInDate, checkOutDate }) =>
  padToFive(items).map((item, index) => ({
    id: `llm-hotel-${index + 1}`,
    hotelId: `llm-hotel-${index + 1}`,
    hotelName: String(item?.hotelName || `${destinationCity}市区参考酒店 ${index + 1}`),
    cityCode: destinationCode,
    address: String(item?.address || `${destinationCity}核心商圈`),
    roomType: String(item?.roomType || `标准房 · ${checkInDate} 入住 / ${checkOutDate} 离店`),
    boardType: String(item?.boardType || '餐食以平台为准'),
    refundable: false,
    cancellationDeadline: '',
    totalPrice: Math.max(1, Number(item?.priceCny || 0)) || 1600 + index * 180,
    currency: 'CNY',
    source: 'llm',
    notes: String(item?.notes || 'AI 参考，需到平台核验。'),
  }))

const createFallbackTrains = (items, { originCity, destinationCity, departureDate }) =>
  padToFive(items).map((item, index) => ({
    id: `llm-train-${index + 1}`,
    source: 'llm',
    trainNumber: String(item?.trainNumber || `G${1000 + index}`),
    departureStation: String(item?.departureStation || `${originCity}站`),
    arrivalStation: String(item?.arrivalStation || `${destinationCity}站`),
    departureAt: normalizeIsoDateTime(departureDate, item?.departureTime) || `${departureDate}T08:00:00`,
    arrivalAt: normalizeIsoDateTime(departureDate, item?.arrivalTime) || `${departureDate}T13:00:00`,
    duration: String(item?.duration || '约5h'),
    seatType: String(item?.seatType || '二等座参考'),
    availability: 'AI 参考，需到平台核验',
    totalPrice: Math.max(1, Number(item?.priceCny || 0)) || 550 + index * 30,
    currency: 'CNY',
    notes: String(item?.notes || 'AI 参考，需到平台核验。'),
  }))

const searchLlmFallbackOffers = async (context, missingKinds) => {
  if (missingKinds.length === 0) return { ok: true, configured: true, flights: [], hotels: [], trains: [], warnings: [] }
  const result = await callQwenJson({
    system: fallbackSystemPrompt,
    prompt: buildLlmFallbackPrompt({ ...context, missingKinds }),
  })
  if (!result.ok) {
    return {
      ok: false,
      configured: false,
      error: result.error || 'llm_fallback_failed',
      warnings: [`供应商报价未返回完整结果，且 AI 兜底生成失败：${result.error || 'llm_fallback_failed'}`],
    }
  }

  return {
    ok: true,
    configured: true,
    flights: missingKinds.includes('flights') ? createFallbackFlights(result.data?.flights, context) : [],
    hotels: missingKinds.includes('hotels') ? createFallbackHotels(result.data?.hotels, context) : [],
    trains: missingKinds.includes('trains') ? createFallbackTrains(result.data?.trains, context) : [],
    warnings: ['部分报价由 AI 参考兜底生成，不代表实时可售、真实余票或最终含税价，请以航司、OTA、铁路平台确认结果为准。'],
  }
}

const searchBookingHotels = async ({ destinationCity, checkInDate, checkOutDate, adults }) => {
  const normalizedCity = normalizePricingCity(destinationCity)
  const cityPageUrl = BOOKING_CITY_PAGE_MAP[normalizedCity]
  if (!cityPageUrl) {
    return {
      ok: false,
      configured: true,
      error: 'booking_city_not_supported',
      warnings: [`暂时还没有为“${destinationCity}”配置 Booking 城市页抓取映射。`],
    }
  }

  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage({ locale: 'zh-CN' })
    await page.goto(cityPageUrl, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForTimeout(3500)

    const hotels = await page.locator('[data-testid="card"]').evaluateAll(
      (cards, meta) => {
        return cards
          .slice(0, 8)
          .map((card, index) => {
            const titleLink = card.querySelector('a[data-testid="titleLink"], a[data-testid="hotelLink"]')
            const text = (card.innerText || '').split('\n').map((line) => line.trim()).filter(Boolean)
            const title = text[0] || card.querySelector('h3')?.textContent?.trim() || ''
            const addressLine = text.find((line) => /酒店（.+）/.test(line) || /Hotel in /.test(line)) || ''
            const priceLine = text.find((line) => /(?:元|CNY|USD|GBP|EUR|SGD|HKD|JPY)/i.test(line)) || ''
            return {
              id: `${meta.city}-${index + 1}`,
              hotelName: title.replace(/\s+/g, ' '),
              hotelUrl: titleLink?.href || '',
              addressLine,
              priceLine,
            }
          })
          .filter((hotel) => hotel.hotelName && hotel.priceLine)
      },
      { city: normalizedCity },
    )

    const normalizedHotels = hotels
      .map((hotel, index) => {
        const price = parseBookingPrice(hotel.priceLine)
        if (!price) return null
        return {
          id: hotel.id || `booking-${normalizedCity}-${index + 1}`,
          hotelId: hotel.hotelUrl || `booking-${normalizedCity}-${index + 1}`,
          hotelName: hotel.hotelName,
          cityCode: normalizedCity,
          address: hotel.addressLine || `${normalizedCity} 市区`,
          roomType: `Booking 城市公开报价 · ${checkInDate} 入住 / ${checkOutDate} 离店`,
          boardType: '以 Booking 页面实际详情为准',
          refundable: false,
          cancellationDeadline: '',
          totalPrice: price.totalPrice,
          currency: price.currency,
          source: 'booking',
        }
      })
      .filter(Boolean)

    if (normalizedHotels.length === 0) {
      return {
        ok: false,
        configured: true,
        error: 'booking_hotels_empty',
        warnings: [`Booking 已打开“${destinationCity}”城市页，但暂未解析出可展示的酒店价格。`],
      }
    }

    return {
      ok: true,
      configured: true,
      hotels: normalizedHotels,
      warnings: [
        `当前酒店结果来自 Booking 公开城市榜单页，已返回真实酒店名和公开价格；日期文本已按 ${checkInDate} 至 ${checkOutDate} 标注，但精确房型报价仍建议以详情页为准。`,
        adults > 2 ? 'Booking 城市页公开报价不一定会完全反映多人入住后的最终总价，建议作为第一轮筛选参考。' : '',
      ].filter(Boolean),
    }
  } catch (error) {
    return { ok: false, configured: true, error: String(error?.message || error) }
  } finally {
    await browser.close()
  }
}

const readAmadeusConfig = () => {
  const env = readSecrets()
  return {
    apiKey: env.AMADEUS_API_KEY || env.AMADEUS_CLIENT_ID || '',
    apiSecret: env.AMADEUS_API_SECRET || env.AMADEUS_CLIENT_SECRET || '',
    baseUrl: (env.AMADEUS_BASE_URL || 'https://test.api.amadeus.com').replace(/\/$/, ''),
  }
}

const getAmadeusAccessToken = async () => {
  const config = readAmadeusConfig()
  if (!config.apiKey || !config.apiSecret) {
    return { ok: false, configured: false, error: 'missing_amadeus_credentials' }
  }

  if (amadeusTokenCache.token && Date.now() < amadeusTokenCache.expiresAt && amadeusTokenCache.baseUrl === config.baseUrl) {
    return { ok: true, configured: true, token: amadeusTokenCache.token, baseUrl: config.baseUrl }
  }

  try {
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: config.apiKey,
      client_secret: config.apiSecret,
    })
    const response = await fetch(`${config.baseUrl}/v1/security/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    })

    if (!response.ok) {
      return {
        ok: false,
        configured: true,
        error: 'amadeus_auth_failed',
        status: response.status,
        body: (await response.text()).slice(0, 600),
      }
    }

    const data = await response.json()
    const expiresIn = Number(data?.expires_in || 1800)
    amadeusTokenCache.token = String(data?.access_token || '')
    amadeusTokenCache.expiresAt = Date.now() + Math.max(60, expiresIn - 60) * 1000
    amadeusTokenCache.baseUrl = config.baseUrl

    if (!amadeusTokenCache.token) {
      return { ok: false, configured: true, error: 'amadeus_missing_access_token' }
    }

    return { ok: true, configured: true, token: amadeusTokenCache.token, baseUrl: config.baseUrl }
  } catch (error) {
    return { ok: false, configured: true, error: String(error?.message || error) }
  }
}

const fetchAmadeusJson = async (pathname, params = {}) => {
  const auth = await getAmadeusAccessToken()
  if (!auth.ok) return auth

  const search = new URLSearchParams()
  Object.entries(params).forEach(([field, value]) => {
    if (value === undefined || value === null || value === '') return
    search.set(field, String(value))
  })

  try {
    const response = await fetch(`${auth.baseUrl}${pathname}?${search.toString()}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${auth.token}`,
      },
    })
    if (!response.ok) {
      return {
        ok: false,
        configured: true,
        error: 'amadeus_request_failed',
        status: response.status,
        body: (await response.text()).slice(0, 600),
      }
    }
    return { ok: true, configured: true, data: await response.json() }
  } catch (error) {
    return { ok: false, configured: true, error: String(error?.message || error) }
  }
}

const verifyAmadeus = async () => {
  const startedAt = Date.now()
  const auth = await getAmadeusAccessToken()
  return {
    ...auth,
    elapsedMs: Date.now() - startedAt,
  }
}

const searchAmadeusFlights = async ({ originCode, destinationCode, departureDate, returnDate, adults }) => {
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

  const offers = Array.isArray(result.data?.data)
    ? result.data.data.map((offer) => ({
        id: String(offer?.id || ''),
        airlineCodes: Array.isArray(offer?.itineraries)
          ? offer.itineraries.flatMap((itinerary) => Array.isArray(itinerary?.segments) ? itinerary.segments.map((segment) => String(segment?.carrierCode || '')) : [])
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

  return { ok: true, configured: true, flights: offers }
}

const searchAmadeusHotels = async ({ cityCode, checkInDate, checkOutDate, adults, roomQuantity }) => {
  const hotelList = await fetchAmadeusJson('/v1/reference-data/locations/hotels/by-city', {
    cityCode,
    radius: 8,
    radiusUnit: 'KM',
    hotelSource: 'ALL',
  })

  if (!hotelList.ok) return hotelList

  const hotelIds = Array.isArray(hotelList.data?.data)
    ? hotelList.data.data
        .map((hotel) => String(hotel?.hotelId || ''))
        .filter(Boolean)
        .slice(0, 12)
    : []

  if (hotelIds.length === 0) {
    return { ok: true, configured: true, hotels: [], warnings: ['未查到可报价的酒店列表。'] }
  }

  const offersResult = await fetchAmadeusJson('/v3/shopping/hotel-offers', {
    hotelIds: hotelIds.join(','),
    adults,
    roomQuantity,
    checkInDate,
    checkOutDate,
    bestRateOnly: true,
  })

  if (!offersResult.ok) return offersResult

  const hotels = Array.isArray(offersResult.data?.data)
    ? offersResult.data.data.map((item) => {
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
          source: String(item?.hotel?.chainCode || 'amadeus'),
        }
      })
    : []

  return { ok: true, configured: true, hotels, warnings: [] }
}

const renderAdmin = (events) => `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>旅游助手 Telemetry</title>
    <style>
      :root { color-scheme: light; font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif; }
      body { margin: 0; background: #f5efe7; color: #2f2618; }
      header { position: sticky; top: 0; background: rgba(255,255,255,0.85); backdrop-filter: blur(14px); border-bottom: 1px solid rgba(140,112,63,0.2); padding: 18px 20px; }
      h1 { margin: 0; font-size: 16px; letter-spacing: 0.12em; text-transform: uppercase; }
      .hint { margin-top: 8px; font-size: 12px; color: rgba(47,38,24,0.7); line-height: 1.7; }
      main { padding: 18px 20px 40px; max-width: 980px; margin: 0 auto; }
      .grid { display: grid; grid-template-columns: 1fr; gap: 12px; }
      .card { background: rgba(255,255,255,0.88); border: 1px solid rgba(255,255,255,0.9); border-radius: 18px; padding: 14px 14px; box-shadow: 0 18px 35px rgba(82,64,28,0.08); }
      .meta { display: flex; flex-wrap: wrap; gap: 10px; font-size: 11px; color: rgba(47,38,24,0.65); letter-spacing: 0.08em; text-transform: uppercase; }
      .role { font-weight: 700; color: rgba(179,30,60,0.9); }
      pre { white-space: pre-wrap; margin: 10px 0 0; font-size: 13px; line-height: 1.7; }
      .badge { display: inline-flex; align-items: center; gap: 6px; border-radius: 999px; padding: 6px 10px; background: rgba(138,90,21,0.12); color: rgba(138,90,21,0.9); font-size: 11px; }
      button { border: 0; border-radius: 999px; padding: 8px 12px; background: #2f2618; color: #fff; font-size: 12px; cursor: pointer; }
      button:hover { opacity: 0.92; }
      .actions { display: flex; gap: 10px; margin-top: 10px; flex-wrap: wrap; }
      .danger { background: #b31e3c; }
      .muted { color: rgba(47,38,24,0.55); font-size: 11px; margin-left: 8px; letter-spacing: 0.06em; text-transform: uppercase; }
    </style>
  </head>
  <body>
    <header>
      <h1>旅游助手 Telemetry</h1>
      <div class="hint">页面会自动实时刷新。此页面会展示你在前端输入的内容，请不要在公开环境开启。</div>
      <div class="actions">
        <span class="badge">日志文件：${LOG_PATH}</span>
        <span class="badge">连接状态：<span id="status">connecting</span></span>
        <span class="muted" id="clock"></span>
        <button onclick="location.reload()">重载</button>
        <button class="danger" onclick="fetch('/api/telemetry/clear',{method:'POST'}).then(()=>location.reload())">清空日志</button>
      </div>
    </header>
    <main>
      <div class="grid" id="events"></div>
    </main>
    <script>
      const initialEvents = ${JSON.stringify(events)}
      const eventsRoot = document.getElementById('events')
      const statusNode = document.getElementById('status')
      const clockNode = document.getElementById('clock')

      function escapeHtml(str) {
        return str.replace(/[&<>\"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]))
      }

      function renderEvent(event) {
        const article = document.createElement('article')
        article.className = 'card'
        const meta = document.createElement('div')
        meta.className = 'meta'
        meta.innerHTML = '<span>' + escapeHtml(event.time || '') + '</span>' +
          '<span class=\"role\">' + escapeHtml(event.event || '') + '</span>' +
          '<span>' + escapeHtml(event.sessionId || '') + '</span>'
        const body = document.createElement('pre')
        body.innerHTML = escapeHtml(JSON.stringify(event.payload, null, 2))
        article.appendChild(meta)
        article.appendChild(body)
        return article
      }

      function setClock() {
        const now = new Date()
        clockNode.textContent = 'last tick ' + now.toLocaleTimeString()
      }

      function prependEvent(event) {
        const node = renderEvent(event)
        eventsRoot.prepend(node)
        while (eventsRoot.children.length > 160) {
          eventsRoot.lastChild.remove()
        }
      }

      initialEvents.slice().reverse().forEach(prependEvent)

      const source = new EventSource('/api/telemetry/stream')
      source.onopen = () => {
        statusNode.textContent = 'connected'
        setClock()
      }
      source.onerror = () => {
        statusNode.textContent = 'reconnecting'
        setClock()
      }
      source.onmessage = (event) => {
        if (!event.data) return
        try {
          const parsed = JSON.parse(event.data)
          prependEvent(parsed)
          setClock()
        } catch {}
      }
    </script>
  </body>
</html>`

function escapeHtml(str) {
  return str.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
  const pathname = url.pathname

  if (pathname === '/healthz') {
    return sendJson(res, 200, { ok: true })
  }

  if (pathname === '/admin') {
    const events = tailLines(LOG_PATH, 80)
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' })
    res.end(renderAdmin(events))
    return
  }

  if (pathname === '/api/telemetry/stream' && req.method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-store',
      Connection: 'keep-alive',
    })
    res.write('retry: 1500\n\n')
    tailLines(LOG_PATH, 40).forEach((event) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`)
    })
    clients.add(res)
    req.on('close', () => {
      clients.delete(res)
    })
    return
  }

  if (pathname === '/api/telemetry/recent' && req.method === 'GET') {
    const limit = Math.max(1, Math.min(200, Number(url.searchParams.get('limit') || 50)))
    return sendJson(res, 200, { events: tailLines(LOG_PATH, limit) })
  }

  if (pathname === '/api/amap/verify' && req.method === 'GET') {
    return sendJson(res, 200, await verifyAmapWebService())
  }

  if (pathname === '/api/amap/geocode' && req.method === 'GET') {
    const address = url.searchParams.get('address') || ''
    const city = url.searchParams.get('city') || ''
    if (!address.trim()) {
      return sendJson(res, 400, { ok: false, error: 'missing_address' })
    }
    const result = await fetchAmapJson('/v3/geocode/geo', { address, city })
    if (!result.ok) return sendJson(res, 200, result)
    const geocode = result.data?.geocodes?.[0]
    const location = typeof geocode?.location === 'string' ? geocode.location.split(',').map(Number) : []
    appendLog({
      time: new Date().toISOString(),
      event: 'backend.amap.geocode',
      sessionId: '',
      payload: { address, city, ok: location.length === 2 && location.every((item) => Number.isFinite(item)) },
      meta: { ua: 'server' },
    })
    return sendJson(res, 200, {
      ok: location.length === 2 && location.every((item) => Number.isFinite(item)),
      location: location.length === 2 ? [location[0], location[1]] : null,
      formattedAddress: geocode?.formatted_address || address,
      raw: geocode || null,
    })
  }

  if (pathname === '/api/amap/poi' && req.method === 'GET') {
    const keywords = url.searchParams.get('keywords') || ''
    const city = url.searchParams.get('city') || ''
    const types = url.searchParams.get('types') || ''
    const offset = Math.max(1, Math.min(10, Number(url.searchParams.get('offset') || 5)))
    if (!keywords.trim()) {
      return sendJson(res, 400, { ok: false, error: 'missing_keywords' })
    }
    const result = await fetchAmapJson('/v3/place/text', { keywords, city, types, offset, page: 1, extensions: 'base' })
    if (!result.ok) return sendJson(res, 200, result)
    const pois = Array.isArray(result.data?.pois)
      ? result.data.pois.map((poi) => {
          const location = typeof poi.location === 'string' ? poi.location.split(',').map(Number) : []
          return {
            id: poi.id,
            name: poi.name,
            type: poi.type,
            address: poi.address,
            cityname: poi.cityname,
            adname: poi.adname,
            location: location.length === 2 ? [location[0], location[1]] : null,
          }
        })
      : []
    appendLog({
      time: new Date().toISOString(),
      event: 'backend.amap.poi',
      sessionId: '',
      payload: { keywords, city, ok: true, count: pois.length },
      meta: { ua: 'server' },
    })
    return sendJson(res, 200, { ok: true, pois })
  }

  if (pathname === '/api/amap/route' && req.method === 'GET') {
    const origin = url.searchParams.get('origin') || ''
    const destination = url.searchParams.get('destination') || ''
    const mode = url.searchParams.get('mode') || 'walking'
    if (!origin || !destination) {
      return sendJson(res, 400, { ok: false, error: 'missing_origin_or_destination' })
    }
    const endpoint = mode === 'driving' ? '/v3/direction/driving' : '/v3/direction/walking'
    const result = await fetchAmapJson(endpoint, { origin, destination, strategy: 0, output: 'json' })
    if (!result.ok) return sendJson(res, 200, result)
    const route = result.data?.route
    const path = Array.isArray(route?.paths) ? route.paths[0] : route?.paths?.[0]
    const steps = Array.isArray(path?.steps) ? path.steps : []
    const polyline = steps
      .flatMap((step) => String(step?.polyline || '').split(';'))
      .map((item) => item.split(',').map(Number))
      .filter((pair) => pair.length === 2 && pair.every((value) => Number.isFinite(value)))
      .map((pair) => [pair[0], pair[1]])
    appendLog({
      time: new Date().toISOString(),
      event: 'backend.amap.route',
      sessionId: '',
      payload: { mode, ok: polyline.length > 1, points: polyline.length },
      meta: { ua: 'server' },
    })
    return sendJson(res, 200, {
      ok: polyline.length > 1,
      route: polyline.length > 1
        ? {
            distance: Number(path?.distance || 0),
            duration: Number(path?.duration || 0),
            polyline,
          }
        : null,
    })
  }

  if (pathname === '/api/pricing/verify' && req.method === 'GET') {
    return sendJson(res, 200, await verifyAmadeus())
  }

  if (pathname === '/api/pricing/search' && req.method === 'GET') {
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
      return sendJson(res, 400, { ok: false, error: 'missing_pricing_params' })
    }

    const [amadeusFlightResult, amadeusHotelResult, tripTrainResult] = await Promise.all([
      searchAmadeusFlights({ originCode, destinationCode, departureDate, returnDate, adults }),
      searchAmadeusHotels({ cityCode, checkInDate, checkOutDate, adults, roomQuantity }),
      searchTripTrains({ originCity, destinationCity, departureDate }),
    ])

    let flightResult = amadeusFlightResult
    let hotelResult = amadeusHotelResult
    let trainResult = tripTrainResult
    let provider = 'amadeus'
    const warnings = []
    const activeProviders = new Set()

    if (!amadeusFlightResult.ok || !Array.isArray(amadeusFlightResult.flights) || amadeusFlightResult.flights.length === 0) {
      const ctripFlightResult = await searchCtripFlights({ originCode, destinationCode, departureDate, returnDate })
      if (ctripFlightResult.ok) {
        flightResult = ctripFlightResult
        activeProviders.add('ctrip')
      } else {
        warnings.push(`真实航班报价暂不可用：${amadeusFlightResult.error || ctripFlightResult.error || 'flight_search_failed'}`)
      }
    } else {
      activeProviders.add('amadeus')
    }

    if (!amadeusHotelResult.ok || !Array.isArray(amadeusHotelResult.hotels) || amadeusHotelResult.hotels.length === 0) {
      const bookingHotelResult = await searchBookingHotels({ destinationCity, checkInDate, checkOutDate, adults })
      if (bookingHotelResult.ok) {
        hotelResult = bookingHotelResult
        activeProviders.add('booking')
      } else {
        warnings.push(...(bookingHotelResult.warnings || []))
      }
    } else {
      activeProviders.add('amadeus')
    }

    if (trainResult.ok && Array.isArray(trainResult.trains) && trainResult.trains.length > 0) {
      activeProviders.add('trip')
    } else {
      warnings.push(...(trainResult.warnings || []))
    }

    warnings.push(...(flightResult.warnings || []), ...(hotelResult.warnings || []))

    const missingKinds = [
      !flightResult.ok || !Array.isArray(flightResult.flights) || flightResult.flights.length === 0 ? 'flights' : '',
      !hotelResult.ok || !Array.isArray(hotelResult.hotels) || hotelResult.hotels.length === 0 ? 'hotels' : '',
      !trainResult.ok || !Array.isArray(trainResult.trains) || trainResult.trains.length === 0 ? 'trains' : '',
    ].filter(Boolean)

    if (missingKinds.length > 0) {
      const fallbackResult = await searchLlmFallbackOffers(
        {
          originCity,
          destinationCity,
          originCode,
          destinationCode,
          departureDate,
          returnDate,
          checkInDate,
          checkOutDate,
          adults,
          roomQuantity,
        },
        missingKinds,
      )

      if (fallbackResult.ok) {
        if (missingKinds.includes('flights') && fallbackResult.flights.length > 0) {
          flightResult = { ok: true, configured: true, flights: fallbackResult.flights }
          activeProviders.add('llm')
        }
        if (missingKinds.includes('hotels') && fallbackResult.hotels.length > 0) {
          hotelResult = { ok: true, configured: true, hotels: fallbackResult.hotels }
          activeProviders.add('llm')
        }
        if (missingKinds.includes('trains') && fallbackResult.trains.length > 0) {
          trainResult = { ok: true, configured: true, trains: fallbackResult.trains }
          activeProviders.add('llm')
        }
      }
      warnings.push(...(fallbackResult.warnings || []))
    }

    provider =
      activeProviders.size <= 1 && activeProviders.has('amadeus')
        ? 'amadeus'
        : activeProviders.size === 1 && activeProviders.has('booking')
          ? 'booking'
          : 'mixed'

    if (
      (!flightResult.ok || !Array.isArray(flightResult.flights) || flightResult.flights.length === 0) &&
      (!hotelResult.ok || !Array.isArray(hotelResult.hotels) || hotelResult.hotels.length === 0) &&
      (!trainResult.ok || !Array.isArray(trainResult.trains) || trainResult.trains.length === 0)
    ) {
      appendLog({
        time: new Date().toISOString(),
        event: 'backend.pricing.search',
        sessionId: '',
        payload: {
          ok: false,
          originCode,
          destinationCode,
          error: warnings[0] || flightResult.error || hotelResult.error || 'pricing_failed',
        },
        meta: { ua: 'server' },
      })
      return sendJson(res, 200, {
        ok: false,
        configured: Boolean(flightResult.configured || hotelResult.configured || trainResult.configured),
        error: flightResult.error || hotelResult.error || trainResult.error || 'pricing_failed',
        detail: flightResult.body || hotelResult.body || '',
        warnings,
      })
    }

    const payload = {
      ok: true,
      provider,
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
      flights: flightResult.ok ? flightResult.flights || [] : [],
      hotels: hotelResult.hotels || [],
      trains: trainResult.ok ? trainResult.trains || [] : [],
      warnings,
      fetchedAt: new Date().toISOString(),
    }

    appendLog({
      time: new Date().toISOString(),
      event: 'backend.pricing.search',
      sessionId: '',
      payload: {
        ok: true,
        originCode,
        destinationCode,
        flights: payload.flights.length,
        hotels: payload.hotels.length,
        trains: payload.trains.length,
      },
      meta: { ua: 'server' },
    })

    return sendJson(res, 200, payload)
  }

  if (pathname === '/api/telemetry/clear' && req.method === 'POST') {
    fs.writeFileSync(LOG_PATH, '', 'utf-8')
    return sendJson(res, 200, { ok: true })
  }

  if (pathname === '/api/telemetry' && req.method === 'POST') {
    try {
      const body = await readBody(req)
      const data = safeJson(body)
      if (!data || typeof data !== 'object') {
        return sendJson(res, 400, { error: 'invalid_json' })
      }

      const entry = {
        time: new Date().toISOString(),
        event: String(data.event || 'unknown'),
        sessionId: typeof data.sessionId === 'string' ? data.sessionId.slice(0, 64) : '',
        payload: data.payload ?? null,
        meta: {
          ua: String(req.headers['user-agent'] || ''),
        },
      }

      appendLog(entry)

      if (entry.event === 'qwen.call.end') {
        verifyQwen().then((result) => {
          appendLog({
            time: new Date().toISOString(),
            event: 'backend.verify.qwen',
            sessionId: entry.sessionId,
            payload: result,
            meta: { ua: 'server' },
          })
        })
      }

      if (entry.event === 'amap.load.end') {
        verifyAmapWebService().then((result) => {
          appendLog({
            time: new Date().toISOString(),
            event: 'backend.verify.amap',
            sessionId: entry.sessionId,
            payload: result,
            meta: { ua: 'server' },
          })
        })
      }

      process.stdout.write(`[telemetry] ${entry.time} ${entry.event} ${entry.sessionId}\n`)
      return sendJson(res, 200, { ok: true })
    } catch (error) {
      if (String(error?.message) === 'payload_too_large') {
        return sendJson(res, 413, { error: 'payload_too_large' })
      }
      return sendJson(res, 500, { error: 'server_error' })
    }
  }

  sendJson(res, 404, { error: 'not_found' })
})

server.listen(PORT, () => {
  process.stdout.write(`[telemetry] server listening on http://localhost:${PORT}\n`)
  process.stdout.write(`[telemetry] admin page: http://localhost:${PORT}/admin\n`)
})
