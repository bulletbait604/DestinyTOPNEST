import { NextRequest } from 'next/server'
import { streamText } from 'ai'
import { formatAskContext, contextKey } from '@/lib/ask/askContext'
import { ASK_INSTRUCTIONS } from '@/lib/ask/askPrompt'
import { takeAskRateLimit } from '@/lib/ask/askRateLimit'
import { retrieveTrustedSources } from '@/lib/ask/askRetrieve'
import { askGatewayConfigured, askModelId, normalizeQuestion } from '@/lib/ask/askSources'
import { loadAskPlayerContext, readAskCache, writeAskCache } from '@/lib/ask/askStore'
import { createAskStream } from '@/lib/ask/askStream'
import { optionalAuth } from '@/lib/destiny/communityBuildAccess'

export const dynamic = 'force-dynamic'

function actorFor(req: NextRequest, userId?: string): string {
  if (userId) return `user:${userId}`
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return `ip:${forwarded || 'local'}`
}

export async function POST(req: NextRequest) {
  let body: { question?: unknown } = {}
  try {
    body = (await req.json()) as { question?: unknown }
  } catch {
    return Response.json({ error: 'Type a question.' }, { status: 400 })
  }
  const question = normalizeQuestion(body.question)
  if (!question.ok) return Response.json({ error: question.error }, { status: 400 })

  const user = await optionalAuth(req)
  const limited = takeAskRateLimit({ actor: actorFor(req, user?.id) })
  if (!limited.ok) {
    return Response.json(
      { error: 'Too many questions. Wait a few minutes and try again.' },
      { status: 429, headers: { 'Retry-After': String(limited.retryAfterSec) } }
    )
  }

  const player = user ? await loadAskPlayerContext(user) : null
  const contextText = formatAskContext(player)
  const cacheContext = contextKey(player)
  const cached = await readAskCache(question.value, cacheContext)
  const sources = cached?.sources?.length ? cached.sources : await retrieveTrustedSources(question.value)
  const configured = askGatewayConfigured()

  const stream = createAskStream({
    question: question.value,
    sources,
    contextText,
    configured,
    cachedText: cached?.answer ?? null,
    answerId: cached?.answerId ?? 'live',
    complete: configured
      ? async function* (prompt: string) {
          const result = streamText({
            model: askModelId(),
            instructions: ASK_INSTRUCTIONS,
            prompt,
          })
          for await (const delta of result.textStream) yield delta
        }
      : undefined,
    onDone: async (text) => {
      if (!configured || cached) return
      await writeAskCache({ question: question.value, context: cacheContext, answer: text, sources })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  })
}
