import { ASK_INSTRUCTIONS } from '@/lib/ask/askPrompt'
import {
  askModelId,
  dedupeSources,
  geminiApiKey,
  parseGeminiChunk,
  type AskSource,
} from '@/lib/ask/askSources'

const GEMINI_MODEL = 'gemini-2.5-flash'

function geminiBody(prompt: string) {
  return {
    systemInstruction: { parts: [{ text: ASK_INSTRUCTIONS }] },
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    tools: [{ googleSearch: {} }],
  }
}

async function readGemini(
  url: string,
  key: string,
  prompt: string
): Promise<{ text: string; sources: AskSource[] } | null> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify(geminiBody(prompt)),
  })
  if (!response.ok) return null
  const payload = await response.json().catch(() => null)
  if (!payload) return null
  return parseGeminiChunk(payload)
}

export async function* streamGeminiAnswer(
  prompt: string,
  env: NodeJS.ProcessEnv = process.env
): AsyncGenerator<string, AskSource[]> {
  const key = geminiApiKey(env)
  if (!key) return []
  const model = env.GEMINI_MODEL?.trim() || GEMINI_MODEL
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}`
  const response = await fetch(`${endpoint}:streamGenerateContent?alt=sse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify(geminiBody(prompt)),
  })

  const sources: AskSource[] = []
  let yielded = false
  if (response.ok && response.body) {
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    while (true) {
      const step = await reader.read()
      if (step.done) break
      buffer += decoder.decode(step.value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data:')) continue
        const json = trimmed.slice(5).trim()
        if (!json || json === '[DONE]') continue
        try {
          const parsed = parseGeminiChunk(JSON.parse(json))
          if (parsed.text) {
            yielded = true
            yield parsed.text
          }
          sources.push(...parsed.sources)
        } catch {
          /* ignore a partial SSE line */
        }
      }
    }
  }

  if (!yielded) {
    const once = await readGemini(`${endpoint}:generateContent`, key, prompt)
    if (!once?.text) throw new Error('Gemini did not return an answer')
    yield once.text
    sources.push(...once.sources)
  }
  return dedupeSources(sources, 6)
}

export async function* streamGatewayAnswer(
  prompt: string,
  env: NodeJS.ProcessEnv = process.env
): AsyncGenerator<string, AskSource[]> {
  const key = env.AI_GATEWAY_API_KEY?.trim() || env.OPENAI_API?.trim() || env.VERCEL_OIDC_TOKEN?.trim()
  if (!key) return []
  const response = await fetch('https://ai-gateway.vercel.sh/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: askModelId(env),
      stream: true,
      messages: [
        { role: 'system', content: ASK_INSTRUCTIONS },
        { role: 'user', content: prompt },
      ],
    }),
  })
  if (!response.ok || !response.body) throw new Error('Gateway did not return an answer')
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const step = await reader.read()
    if (step.done) break
    buffer += decoder.decode(step.value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const json = trimmed.slice(5).trim()
      if (!json || json === '[DONE]') continue
      try {
        const payload = JSON.parse(json) as { choices?: Array<{ delta?: { content?: string } }> }
        const text = payload.choices?.[0]?.delta?.content
        if (text) yield text
      } catch {
        /* ignore a partial SSE line */
      }
    }
  }
  return []
}
