type TelemetryEvent = {
  event: string
  sessionId: string
  payload: unknown
}

const getStorage = () => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

const sessionId = (() => {
  const key = 'voya-session-id'
  const storage = getStorage()
  const existing = storage?.getItem(key)
  if (existing) return existing
  const next = `session-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`
  storage?.setItem(key, next)
  return next
})()

export const getTelemetrySessionId = () => sessionId

export const telemetryEnabled = () => {
  const value = getStorage()?.getItem('voya-telemetry-enabled')
  return value !== '0'
}

export const setTelemetryEnabled = (enabled: boolean) => {
  getStorage()?.setItem('voya-telemetry-enabled', enabled ? '1' : '0')
}

export async function emitTelemetry(event: string, payload: unknown) {
  if (!telemetryEnabled()) return

  const body: TelemetryEvent = {
    event,
    sessionId,
    payload,
  }

  try {
    const key = 'voya-static-telemetry'
    const storage = getStorage()
    if (!storage) return
    const current = JSON.parse(storage.getItem(key) || '[]') as TelemetryEvent[]
    storage.setItem(key, JSON.stringify([...current.slice(-49), body]))
  } catch {
    return
  }
}
