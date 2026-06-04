import { emitTelemetry } from '@/services/telemetry'
import { apiUrl, hasApiBaseUrl } from '@/services/apiBase'

type GPTRequest = {
  prompt: string
  fallback: string
}

const getConfig = () => ({
  apiKey: import.meta.env.VITE_GPT_API_KEY ?? '',
  baseUrl: import.meta.env.VITE_GPT_BASE_URL ?? 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  model: import.meta.env.VITE_GPT_MODEL ?? 'qwen-turbo',
})

export const hasGPTConfig = () => hasApiBaseUrl() || Boolean(getConfig().apiKey)

export async function chatCompletion(prompt: string, system: string, temperature = 0.7) {
  if (hasApiBaseUrl()) {
    const startedAt = performance.now()
    void emitTelemetry('qwen.call.start', { model: 'server-proxy', endpoint: apiUrl('/api/qwen/chat') })
    try {
      const response = await fetch(apiUrl('/api/qwen/chat'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt, system, temperature }),
      })
      const elapsedMs = Math.round(performance.now() - startedAt)
      if (!response.ok) {
        void emitTelemetry('qwen.call.end', { ok: false, status: response.status, elapsedMs })
        return null
      }
      const data = await response.json()
      const content = data?.content
      const ok = typeof content === 'string' && content.trim()
      void emitTelemetry('qwen.call.end', { ok: Boolean(ok), status: 200, elapsedMs })
      return ok ? content.trim() : null
    } catch (error) {
      const elapsedMs = Math.round(performance.now() - startedAt)
      void emitTelemetry('qwen.call.end', { ok: false, elapsedMs, error: String(error?.message || error) })
      return null
    }
  }

  const { apiKey, baseUrl, model } = getConfig()
  if (!apiKey) {
    return null
  }

  const endpoint = `${baseUrl.replace(/\/$/, '')}/chat/completions`
  const startedAt = performance.now()
  void emitTelemetry('qwen.call.start', { model, endpoint })

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: system,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature,
      }),
    })

    const elapsedMs = Math.round(performance.now() - startedAt)
    if (!response.ok) {
      const text = await response.text()
      void emitTelemetry('qwen.call.end', {
        ok: false,
        status: response.status,
        elapsedMs,
        body: text.slice(0, 400),
      })
      return null
    }

    const data = await response.json()
    const content = data?.choices?.[0]?.message?.content
    const ok = typeof content === 'string' && content.trim()
    void emitTelemetry('qwen.call.end', { ok: Boolean(ok), status: 200, elapsedMs })
    return ok ? content.trim() : null
  } catch (error) {
    const elapsedMs = Math.round(performance.now() - startedAt)
    void emitTelemetry('qwen.call.end', { ok: false, elapsedMs, error: String(error?.message || error) })
    return null
  }
}

export async function maybeRefineReply({ prompt, fallback }: GPTRequest): Promise<string> {
  try {
    const content = await chatCompletion(
      prompt,
      '你是一位中文旅行规划助手，请用自然、简洁、可信的语气回复用户。不要编造政策或价格来源。',
      0.7,
    )
    return content ?? fallback
  } catch {
    return fallback
  }
}
