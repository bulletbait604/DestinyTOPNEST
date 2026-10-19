import clientPromise from '@/lib/mongodb'
import { getMongoDbName } from '@/lib/database'
import { DESTINY_COLLECTIONS } from '@/lib/destiny/collections'
import {
  dossierFromSnapshots,
  snapshotDocId,
  type CharacterSnapshotDoc,
  type GuardianDossier,
} from '@/lib/destiny/characterSnapshot'

async function collection() {
  const client = await clientPromise
  return client.db(getMongoDbName()).collection(DESTINY_COLLECTIONS.characterSnapshots)
}

let indexReady: Promise<void> | null = null

function ensureIndex(): Promise<void> {
  if (!indexReady) {
    indexReady = collection()
      .then((col) => col.createIndex({ membershipId: 1, day: -1 }))
      .then(() => undefined)
      .catch(() => undefined)
  }
  return indexReady
}

export async function latestSnapshotCapturedAt(membershipId: string): Promise<string | undefined> {
  try {
    const col = await collection()
    const row = await col.find({ membershipId }).sort({ capturedAt: -1 }).limit(1).next()
    const capturedAt = row?.capturedAt
    return typeof capturedAt === 'string' ? capturedAt : undefined
  } catch {
    return undefined
  }
}

export async function saveCharacterSnapshots(docs: CharacterSnapshotDoc[]): Promise<number> {
  if (!docs.length) return 0
  await ensureIndex()
  const col = await collection()
  for (const doc of docs) {
    const _id = snapshotDocId(doc.membershipId, doc.characterId, doc.day)
    const payload = JSON.parse(JSON.stringify(doc)) as Record<string, unknown>
    await col.updateOne({ _id }, { $set: payload }, { upsert: true })
  }
  return docs.length
}

/** Recent daily rows for one membership. Enough for about 40 days across three characters. */
export async function loadSnapshotDocs(membershipId: string): Promise<CharacterSnapshotDoc[]> {
  try {
    const col = await collection()
    const rows = await col.find({ membershipId }).sort({ day: -1 }).limit(120).toArray()
    return rows as unknown as CharacterSnapshotDoc[]
  } catch {
    return []
  }
}

export async function loadGuardianDossier(membershipId: string, sherpaPoints: number): Promise<GuardianDossier | null> {
  const docs = await loadSnapshotDocs(membershipId)
  return dossierFromSnapshots(docs, sherpaPoints)
}
