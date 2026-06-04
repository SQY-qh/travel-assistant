type TelemetryEvent = {
  event: string
  sessionId: string
  payload: unknown
}

const sessionId = (() => {
  const key = 'voya-session-id'
  const existing = localStorage.getItem(key)
  if (existing) return existing
  const next = `session-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`
  localStorage.setItem(key, next)
  return next
})()

export const getTelemetrySessionId = () => sessionId

export const telemetryEnabled = () => {
  const value = localStorage.getItem('voya-telemetry-enabled')
  return value !== '0'
}

export const setTelemetryEnabled = (enabled: boolean) => {
  localStorage.setItem('voya-telemetry-enabled', enabled ? '1' : '0')
}

export async function emitTelemetry(event: string, payload: unknown) {
  if (!telemetryEnabled()) return

  const body: TelemetryEvent = {
    event,
    sessionId,
    payload,
  }

  try {
    await fetch('/api/telemetry', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      keepalive: true,
    })
  } catch {
    return
  }
}

