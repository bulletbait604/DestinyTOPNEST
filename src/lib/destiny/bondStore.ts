import clientPromise from '@/lib/mongodb'
import { getMongoDbName } from '@/lib/database'
import { DESTINY_COLLECTIONS } from '@/lib/destiny/collections'
import { bondPairKey, eligibleBondTeammates, scoreBondRun, type BondScore } from '@/lib/destiny/bonds'
import type { RunRecord } from '@/lib/destiny/types'

/** One document per pair of Destiny membership ids that have cleared together. */
export interface BondDoc {
  pairKey: string
  members: [string, string]
  names: Record<string, string>
  /** Owner (site user) whose sync first recorded the bond — used for the daily cap. */
  firstOwnerMembershipId: string
  firstPgcrId: string
  firstAt: string
  pgcrIds: string[]
  runsTogether: number
  lastAt: string
}

async function bonds() {
  const client = await clientPromise
  const col = client.db(getMongoDbName()).collection<BondDoc>(DESTINY_COLLECTIONS.bonds)
  return col
}

let indexesReady = false
async function ensureIndexes() {
  if (indexesReady) return
  const col = await bonds()
  await Promise.all([
    col.createIndex({ pairKey: 1 }, { unique: true }),
    col.createIndex({ members: 1, lastAt: -1 }),
    col.createIndex({ firstOwnerMembershipId: 1, firstAt: -1 }),
  ]).catch(() => undefined)
  indexesReady = true
}

/** Compute the New Bonds score for a freshly ingested run (read-only). */
export async function computeRunBondScore(run: RunRecord, ownerMembershipId: string): Promise<BondScore> {
  const teammates = eligibleBondTeammates(run.teamMembers, ownerMembershipId, run.durationSeconds)
  const col = await bonds()
  const keys = teammates.map((t) => bondPairKey(ownerMembershipId, t.membershipId))
  const existing = keys.length ? await col.find({ pairKey: { $in: keys } }).toArray() : []
  const prior = new Map<string, number>()
  for (const doc of existing) {
    const other = doc.members[0] === ownerMembershipId ? doc.members[1] : doc.members[0]
    // Re-syncing the same PGCR must not turn a new bond into a repeat.
    const runs = doc.pgcrIds.includes(run.pgcrId) ? doc.runsTogether - 1 : doc.runsTogether
    prior.set(other, Math.max(0, runs))
  }
  const since = new Date(new Date(run.completedAt).getTime() - 24 * 3600 * 1000).toISOString()
  const newBondsLast24h = await col.countDocuments({
    firstOwnerMembershipId: ownerMembershipId,
    firstAt: { $gte: since, $lte: run.completedAt },
    firstPgcrId: { $ne: run.pgcrId },
  })
  return scoreBondRun({
    activityType: run.type,
    durationSeconds: run.durationSeconds,
    teammates,
    priorRunsTogether: prior,
    newBondsLast24h,
  })
}

/** Persist bonds for a run that scored (verified, eligible). Idempotent per PGCR. */
export async function recordRunBonds(run: RunRecord, ownerMembershipId: string): Promise<void> {
  await ensureIndexes()
  const col = await bonds()
  const owner = run.teamMembers.find((m) => m.membershipId === ownerMembershipId)
  const teammates = eligibleBondTeammates(run.teamMembers, ownerMembershipId, run.durationSeconds)
  for (const mate of teammates) {
    const pairKey = bondPairKey(ownerMembershipId, mate.membershipId)
    const members = [ownerMembershipId, mate.membershipId].sort() as [string, string]
    await col.updateOne(
      { pairKey },
      {
        $setOnInsert: {
          pairKey,
          members,
          firstOwnerMembershipId: ownerMembershipId,
          firstPgcrId: run.pgcrId,
          firstAt: run.completedAt,
        },
        $set: {
          [`names.${mate.membershipId}`]: mate.displayName,
          [`names.${ownerMembershipId}`]: owner?.displayName ?? run.ownerDisplayName ?? 'Guardian',
          lastAt: run.completedAt,
        },
        $addToSet: { pgcrIds: run.pgcrId },
      },
      { upsert: true }
    )
    // runsTogether = size of pgcrIds (kept as a field for cheap sorting).
    const doc = await col.findOne({ pairKey }, { projection: { pgcrIds: 1 } })
    if (doc) await col.updateOne({ pairKey }, { $set: { runsTogether: doc.pgcrIds.length } })
  }
}

export interface PlayerMet {
  membershipId: string
  displayName: string
  runsTogether: number
  firstAt: string
  lastAt: string
}

/** "Players you've met" for the profile. */
export async function listPlayersMet(membershipId: string, limit = 50): Promise<PlayerMet[]> {
  if (!membershipId) return []
  const col = await bonds()
  const rows = await col.find({ members: membershipId }).sort({ lastAt: -1 }).limit(limit).toArray()
  return rows.map((doc) => {
    const other = doc.members[0] === membershipId ? doc.members[1] : doc.members[0]
    return {
      membershipId: other,
      displayName: doc.names?.[other] ?? 'Guardian',
      runsTogether: doc.runsTogether ?? doc.pgcrIds.length,
      firstAt: doc.firstAt,
      lastAt: doc.lastAt,
    }
  })
}

/** All membership ids the player has already bonded with (for LFG suggestions). */
export async function bondedMembershipIds(membershipId: string): Promise<Set<string>> {
  if (!membershipId) return new Set()
  const col = await bonds()
  const rows = await col.find({ members: membershipId }, { projection: { members: 1 } }).toArray()
  const out = new Set<string>()
  for (const r of rows) for (const m of r.members) if (m !== membershipId) out.add(m)
  return out
}
