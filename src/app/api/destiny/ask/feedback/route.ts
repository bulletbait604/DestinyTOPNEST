import { NextRequest } from 'next/server'
import { normalizeQuestion } from '@/lib/ask/askSources'
import { saveAskFeedback, type AskFeedbackVote } from '@/lib/ask/askStore'
import { optionalAuth } from '@/lib/destiny/communityBuildAccess'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  let body: { question?: unknown; vote?: unknown; answerId?: unknown } = {}
  try {
    body = (await req.json()) as typeof body
  } catch {
    return Response.json({ error: 'Could not save that rating.' }, { status: 400 })
  }
  const question = normalizeQuestion(body.question)
  if (!question.ok) return Response.json({ error: question.error }, { status: 400 })
  if (body.vote !== 'up' && body.vote !== 'down') {
    return Response.json({ error: 'Choose thumbs up or thumbs down.' }, { status: 400 })
  }
  const answerId = typeof body.answerId === 'string' && body.answerId.trim() ? body.answerId.trim() : 'live'
  const user = await optionalAuth(req)
  const saved = await saveAskFeedback({
    question: question.value,
    answerId,
    vote: body.vote as AskFeedbackVote,
    userId: user?.id,
  })
  if (!saved) {
    return Response.json({ error: 'Feedback could not be saved. Try again after the database is connected.' }, { status: 503 })
  }
  return Response.json({ ok: true })
}
