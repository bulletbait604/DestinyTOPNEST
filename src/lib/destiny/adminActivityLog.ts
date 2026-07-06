import crypto from 'crypto'
import clientPromise from '@/lib/mongodb'
import { getMongoDbName } from '@/lib/database'
import { DESTINY_COLLECTIONS } from '@/lib/destiny/collections'
import type { AdminActivityEntry, AdminActivityKind } from '@/lib/destiny/types'

export async function logAdminActivity(input: {
  kind: AdminActivityKind
  actorId: string
  actorLabel?: string
  targetUserId?: string
  targetLabel?: string
  summary: string
  detail?: string
  metadata?: Record<string, string | number | boolean>
}): Promise<void> {
  const entry: AdminActivityEntry = {
    id: crypto.randomUUID(),
    kind: input.kind,
    actorId: input.actorId.toLowerCase(),
    actorLabel: input.actorLabel,
    targetUserId: input.targetUserId?.toLowerCase(),
    targetLabel: input.targetLabel,
    summary: input.summary,
    detail: input.detail,
    metadata: input.metadata,
    createdAt: new Date().toISOString(),
  }

  try {
    const client = await clientPromise
    await client.db(getMongoDbName()).collection(DESTINY_COLLECTIONS.adminActivity).insertOne(entry)
  } catch (error) {
    console.error('[adminActivity]', error)
  }
}

export async function getAdminActivityFeed(limit = 50): Promise<AdminActivityEntry[]> {
  try {
    const client = await clientPromise
    const rows = await client
      .db(getMongoDbName())
      .collection(DESTINY_COLLECTIONS.adminActivity)
      .find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray()
    return rows as unknown as AdminActivityEntry[]
  } catch {
    return []
  }
}

export async function getAdminNotesForUser(userId: string, limit = 10): Promise<AdminActivityEntry[]> {
  try {
    const client = await clientPromise
    const rows = await client
      .db(getMongoDbName())
      .collection(DESTINY_COLLECTIONS.adminActivity)
      .find({ kind: 'user_note', targetUserId: userId.toLowerCase() })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray()
    return rows as unknown as AdminActivityEntry[]
  } catch {
    return []
  }
}
