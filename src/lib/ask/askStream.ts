import { buildAskPrompt } from '@/lib/ask/askPrompt'
import { UNCONFIGURED_MESSAGE, type AskSource } from '@/lib/ask/askSources'

export type AskEvent =
  | { type: 'meta'; sources: AskSource[]; configured: boolean; cached: boolean; answerId: string }
  | { type: 'delta'; text: string }
  | { type: 'done' }
  | { type: 'error'; message: string }

export function encodeAskEvent(event: AskEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`
}

export function parseAskEvents(body: string): AskEvent[] {
  return body
    .split('\n\n')
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.startsWith('data:'))
    .map((chunk) => JSON.parse(chunk.slice(5).trim()) as AskEvent)
}

export function createAskStream(input: {
  question: string
  sources: AskSource[]
  contextText: string
  configured: boolean
  cachedText?: string | null
  answerId: string
  complete?: (prompt: string) => AsyncIterable<string>
  onDone?: (text: string) => Promise<void>
}): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  return new ReadableStream({
    async start(controller) {
      const send = (event: AskEvent) => controller.enqueue(encoder.encode(encodeAskEvent(event)))
      try {
        send({
          type: 'meta',
          sources: input.sources,
          configured: input.configured || Boolean(input.cachedText),
          cached: Boolean(input.cachedText),
          answerId: input.answerId,
        })
        let text = input.cachedText ?? ''
        if (text) {
          send({ type: 'delta', text })
        } else if (!input.configured || !input.complete) {
          text = UNCONFIGURED_MESSAGE
          send({ type: 'delta', text })
        } else {
          const prompt = buildAskPrompt(input.question, input.sources, input.contextText)
          for await (const delta of input.complete(prompt)) {
            text += delta
            send({ type: 'delta', text: delta })
          }
          if (input.onDone) await input.onDone(text)
        }
        send({ type: 'done' })
        controller.close()
      } catch {
        send({ type: 'error', message: 'Ask TopNest could not finish that answer. Try again in a moment.' })
        controller.close()
      }
    },
  })
}

export async function collectAskText(input: {
  question: string
  sources: AskSource[]
  contextText: string
  configured: boolean
  cachedText?: string | null
  complete?: (prompt: string) => AsyncIterable<string>
}): Promise<{ text: string; events: AskEvent[]; answerId: string }> {
  const answerId = input.cachedText ? 'cached' : 'live'
  const events: AskEvent[] = [
    {
      type: 'meta',
      sources: input.sources,
      configured: input.configured || Boolean(input.cachedText),
      cached: Boolean(input.cachedText),
      answerId,
    },
  ]
  let text = input.cachedText ?? ''
  if (!text) {
    if (!input.configured || !input.complete) {
      text = UNCONFIGURED_MESSAGE
    } else {
      const prompt = buildAskPrompt(input.question, input.sources, input.contextText)
      for await (const delta of input.complete(prompt)) {
        text += delta
        events.push({ type: 'delta', text: delta })
      }
    }
  }
  if (!events.some((event) => event.type === 'delta') && text) {
    events.push({ type: 'delta', text })
  }
  events.push({ type: 'done' })
  return { text, events, answerId }
}
