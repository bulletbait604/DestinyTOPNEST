import clientPromise from '@/lib/mongodb'
import { getMongoDbName } from '@/lib/database'
import { DESTINY_COLLECTIONS } from '@/lib/destiny/collections'
import { getDestinyUserBySiteUserId } from '@/lib/destiny/destinyUserStore'
import { contextKey, type AskCharacterNote, type AskPlayerContext } from '@/lib/ask/askContext'
import { askCacheKey, type AskSource } from '@/lib/ask/askSources'

const CACHE_MS = 7 * 24 * 60 * 60 * 1000

export type AskCacheRecord = {
  answerId: string
  question: string
  answer: string
  sources: AskSource[]
  createdAt: string
}

export type AskFeedbackVote = 'up' | 'down'

async function collection(name: string) {
  const client = await clientPromise
  return client.db(getMongoDbName()).collection(name)
}

export async function readAskCache(question: string, context: string): Promise<AskCacheRecord | null> {
  if (!process.env.MONGODB_URI?.trim()) return null
  try {
    const answerId = askCacheKey(question, context)
    const doc = await (await collection(DESTINY_COLLECTIONS.askCache)).findOne({ _id: answerId })
    if (!doc || typeof doc.answer !== 'string') return null
    const createdAt = typeof doc.createdAt === 'string' ? doc.createdAt : ''
    if (!createdAt || Date.now() - Date.parse(createdAt) > CACHE_MS) return null
    return {
      answerId,
      question,
      answer: doc.answer,
      sources: Array.isArray(doc.sources) ? (doc.sources as AskSource[]) : [],
      createdAt,
    }
  } catch {
    return null
  }
}

export async function writeAskCache(input: {
  question: string
  context: string
  answer: string
  sources: AskSource[]
}): Promise<string | null> {
  if (!process.env.MONGODB_URI?.trim() || input.answer.trim().length < 20) return null
  const answerId = askCacheKey(input.question, input.context)
  try {
    await (await collection(DESTINY_COLLECTIONS.askCache)).updateOne(
      { _id: answerId },
      {
        $set: {
          question: input.question,
          answer: input.answer,
          sources: input.sources,
          createdAt: new Date().toISOString(),
        },
      },
      { upsert: true }
    )
    return answerId
  } catch {
    return null
  }
}

export async function saveAskFeedback(input: {
  question: string
  answerId: string
  vote: AskFeedbackVote
  userId?: string
}): Promise<boolean> {
  if (!process.env.MONGODB_URI?.trim()) return false
  try {
    await (await collection(DESTINY_COLLECTIONS.askFeedback)).insertOne({
      question: input.question.slice(0, 400),
      answerId: input.answerId.slice(0, 80),
      vote: input.vote,
      userId: input.userId ?? null,
      createdAt: new Date().toISOString(),
    })
    return true
  } catch {
    return false
  }
}

export async function listAskFeedback(limit = 40): Promise<
  { question: string; vote: string; createdAt: string; answerId: string }[]
> {
  if (!process.env.MONGODB_URI?.trim()) return []
  try {
    const rows = await (await collection(DESTINY_COLLECTIONS.askFeedback))
      .find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray()
    return rows.map((row) => ({
      question: String(row.question ?? ''),
      vote: String(row.vote ?? ''),
      createdAt: String(row.createdAt ?? ''),
      answerId: String(row.answerId ?? ''),
    }))
  } catch {
    return []
  }
}

export async function loadAskPlayerContext(user: { id: string; displayName: string }): Promise<AskPlayerContext> {
  const empty = { displayName: user.displayName, characters: [] as AskCharacterNote[] }
  if (!process.env.MONGODB_URI?.trim()) return empty
  try {
    const stored = await getDestinyUserBySiteUserId(user.id)
    const membershipId = stored?.bungieMembershipId
    if (!membershipId) return empty
    const rows = await (await collection(DESTINY_COLLECTIONS.characterSnapshots))
      .find({ membershipId })
      .sort({ day: -1 })
      .limit(12)
      .toArray()
    const seen = new Set<string>()
    const characters: AskCharacterNote[] = []
    for (const row of rows) {
      const characterId = String(row.characterId ?? '')
      if (!characterId || seen.has(characterId)) continue
      seen.add(characterId)
      characters.push({
        className: String(row.className ?? 'Guardian'),
        light: Number(row.light ?? 0),
        subclass: typeof row.subclassName === 'string' ? row.subclassName : undefined,
        title: typeof row.titleName === 'string' ? row.titleName : undefined,
      })
    }
    return { displayName: user.displayName, characters }
  } catch {
    return empty
  }
}

export { contextKey }
