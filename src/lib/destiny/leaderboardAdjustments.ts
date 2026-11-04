import crypto from 'crypto'
import clientPromise from '@/lib/mongodb'
import { getMongoDbName } from '@/lib/database'
import { DESTINY_COLLECTIONS } from '@/lib/destiny/collections'
import type { StoredDestinyUser } from '@/lib/destiny/destinyUserStore'
import { loadMembershipAliasMap } from '@/lib/destiny/identityNormalize'
import { bungieBoardKey, loadKickGuardianMembershipIds } from '@/lib/destiny/kickGuardians'
import { aggregateLeaderboard } from '@/lib/destiny/leaderboards'
import { mvpBoardBonus } from '@/lib/destiny/scoring'
import { emptyVoteCounts, tallyVoteCounts } from '@/lib/destiny/mvpVoting'
import { getVoteCountsMap } from '@/lib/destiny/voteCounts'
import type {
  LeaderboardAdjustment,
  LeaderboardCategory,
  LeaderboardEntry,
  LeaderboardPeriod,
  MvpVote,
  RunRecord,
  Season,
} from '@/lib/destiny/types'

async function db() {
  const client = await clientPromise
  return client.db(getMongoDbName())
}

export async function loadLeaderboardAdjustments(
  category: LeaderboardCategory,
  period: LeaderboardPeriod,
  seasonId: string
): Promise<LeaderboardAdjustment[]> {
  try {
    const rows = await (await db())
      .collection(DESTINY_COLLECTIONS.leaderboardAdjustments)
      .find({ category, period, seasonId })
      .toArray()
    return rows as unknown as LeaderboardAdjustment[]
  } catch {
    return []
  }
}

export function applyLeaderboardAdjustments(
  entries: LeaderboardEntry[],
  adjustments: LeaderboardAdjustment[],
  usersById: Map<string, StoredDestinyUser>,
  category: LeaderboardCategory,
  period: LeaderboardPeriod,
  season: Season
): LeaderboardEntry[] {
  if (!adjustments.length) return entries

  const adjMap = new Map(adjustments.map((a) => [a.entryKey, a]))
  const userIdsForMembership = new Map<string, string[]>()
  for (const user of Array.from(usersById.values())) {
    const ids = [user.bungieMembershipId, ...(user.linkedMembershipIds ?? [])]
    for (const id of ids) {
      const membershipId = id?.trim()
      if (!membershipId) continue
      const keys = userIdsForMembership.get(membershipId) ?? []
      keys.push(user.userId)
      userIdsForMembership.set(membershipId, keys)
    }
  }
  const keysFor = (entry: LeaderboardEntry) => {
    const keys = [entry.userId]
    if (entry.bungieMembershipId) {
      keys.push(entry.bungieMembershipId, bungieBoardKey(entry.bungieMembershipId))
      keys.push(...(userIdsForMembership.get(entry.bungieMembershipId) ?? []))
    }
    return keys.filter(Boolean)
  }
  const inBase = new Set(entries.flatMap((entry) => keysFor(entry)))

  const merged: LeaderboardEntry[] = entries
    .filter((entry) => !keysFor(entry).some((key) => adjMap.get(key)?.excluded))
    .map((entry) => {
      const adj = keysFor(entry).map((key) => adjMap.get(key)).find(Boolean)
      if (!adj) return entry
      const points =
        adj.pointsOverride != null ? adj.pointsOverride : entry.points + (adj.pointsDelta ?? 0)
      const verifiedClears =
        adj.verifiedClearsOverride ??
        Math.max(0, entry.verifiedClears + (adj.verifiedClearsDelta ?? 0))
      return {
        ...entry,
        points: Math.max(0, Math.round(points)),
        verifiedClears,
        hasManualAdjustment: true,
      }
    })

  for (const adj of adjustments) {
    if (adj.excluded) continue
    if (inBase.has(adj.entryKey)) continue

    const points = adj.pointsOverride ?? adj.pointsDelta ?? 0
    if (points <= 0 && adj.pointsOverride == null) continue

    const user = usersById.get(adj.entryKey)
    merged.push({
      userId: adj.entryKey,
      bungieDisplayName: adj.displayName ?? user?.bungieDisplayName ?? adj.entryKey,
      emblemUrl: user?.emblemUrl,
      clanTag: user?.clanTag,
      platform: user?.platform ?? 'steam',
      guardianRank: user?.guardianRank,
      powerLevel: user?.powerLevel,
      category,
      seasonId: season.id,
      period,
      points: Math.max(0, Math.round(points)),
      verifiedClears: Math.max(0, adj.verifiedClearsOverride ?? adj.verifiedClearsDelta ?? 0),
      rank: 0,
      hasManualAdjustment: true,
    })
  }

  merged.sort(
    (a, b) =>
      b.points - a.points ||
      b.verifiedClears - a.verifiedClears ||
      (a.fastestClearSeconds ?? Number.MAX_SAFE_INTEGER) -
        (b.fastestClearSeconds ?? Number.MAX_SAFE_INTEGER)
  )

  return merged.slice(0, 10).map((entry, index) => ({ ...entry, rank: index + 1 }))
}

async function attachVoteCounts(entries: LeaderboardEntry[], votes: MvpVote[]): Promise<LeaderboardEntry[]> {
  const ids = entries.map((entry) => entry.bungieMembershipId?.trim() ?? '').filter(Boolean)
  let counts = ids.length ? await getVoteCountsMap(ids) : new Map()
  if (counts.size === 0 && votes.length) counts = tallyVoteCounts(votes)
  return entries.map((entry) => {
    const bucket = entry.bungieMembershipId ? counts.get(entry.bungieMembershipId) : undefined
    const fallback = bucket ?? emptyVoteCounts()
    return {
      ...entry,
      mvpVotes: fallback.mvpVotes,
      newLightVotes: fallback.newLightVotes,
      uselessVotes: fallback.uselessVotes,
    }
  })
}

export async function buildLeaderboardWithAdjustments(
  category: LeaderboardCategory,
  period: LeaderboardPeriod,
  season: Season,
  runs: RunRecord[],
  usersById: Map<string, StoredDestinyUser>,
  votes: MvpVote[]
): Promise<LeaderboardEntry[]> {
  const [kickMembershipIds, aliases] = await Promise.all([loadKickGuardianMembershipIds(), loadMembershipAliasMap()])
  const base = aggregateLeaderboard(runs, usersById, category, period, season, kickMembershipIds, aliases)

  const adjustments = await loadLeaderboardAdjustments(category, period, season.id)
  const withVotes = await attachVoteCounts(
    applyLeaderboardAdjustments(base, adjustments, usersById, category, period, season),
    votes
  )
  return applyMvpBoardPoints(withVotes, category)
}

/** Raid and dungeon totals include +2 for every MVP vote. Ranks are rebuilt after that. */
export function applyMvpBoardPoints(entries: LeaderboardEntry[], category: LeaderboardCategory): LeaderboardEntry[] {
  if (category === 'new_bonds') return entries
  const scored = entries.map((entry) => ({
    ...entry,
    points: entry.points + mvpBoardBonus(entry.mvpVotes, category),
  }))
  scored.sort(
    (a, b) =>
      b.points - a.points ||
      b.verifiedClears - a.verifiedClears ||
      (a.fastestClearSeconds ?? Number.MAX_SAFE_INTEGER) - (b.fastestClearSeconds ?? Number.MAX_SAFE_INTEGER)
  )
  return scored.map((entry, index) => ({ ...entry, rank: index + 1 }))
}

export async function upsertLeaderboardAdjustment(input: {
  entryKey: string
  displayName?: string
  category: LeaderboardCategory
  period: LeaderboardPeriod
  seasonId: string
  adjustedBy: string
  pointsDelta?: number
  pointsOverride?: number
  verifiedClearsDelta?: number
  verifiedClearsOverride?: number
  excluded?: boolean
  notes?: string
}): Promise<LeaderboardAdjustment> {
  const entryKey = input.entryKey.trim().toLowerCase()
  if (!entryKey) throw new Error('entryKey is required')

  const now = new Date().toISOString()
  const existing = await (await db())
    .collection(DESTINY_COLLECTIONS.leaderboardAdjustments)
    .findOne({
      entryKey,
      category: input.category,
      period: input.period,
      seasonId: input.seasonId,
    })

  const record: LeaderboardAdjustment = {
    id: (existing?.id as string) ?? crypto.randomUUID(),
    entryKey,
    displayName: input.displayName?.trim() || undefined,
    category: input.category,
    period: input.period,
    seasonId: input.seasonId,
    pointsDelta: input.pointsDelta,
    pointsOverride: input.pointsOverride,
    verifiedClearsDelta: input.verifiedClearsDelta,
    verifiedClearsOverride: input.verifiedClearsOverride,
    excluded: input.excluded,
    notes: input.notes?.trim().slice(0, 500) || undefined,
    adjustedBy: input.adjustedBy.toLowerCase(),
    createdAt: (existing?.createdAt as string) ?? now,
    updatedAt: now,
  }

  await (await db())
    .collection(DESTINY_COLLECTIONS.leaderboardAdjustments)
    .updateOne({ id: record.id }, { $set: record }, { upsert: true })

  return record
}

export async function clearLeaderboardAdjustment(
  entryKey: string,
  category: LeaderboardCategory,
  period: LeaderboardPeriod,
  seasonId: string
): Promise<boolean> {
  const result = await (await db())
    .collection(DESTINY_COLLECTIONS.leaderboardAdjustments)
    .deleteOne({
      entryKey: entryKey.trim().toLowerCase(),
      category,
      period,
      seasonId,
    })
  return result.deletedCount > 0
}
