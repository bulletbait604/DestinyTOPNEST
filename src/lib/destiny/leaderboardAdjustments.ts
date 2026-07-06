import crypto from 'crypto'
import clientPromise from '@/lib/mongodb'
import { getMongoDbName } from '@/lib/database'
import { DESTINY_COLLECTIONS } from '@/lib/destiny/collections'
import type { StoredDestinyUser } from '@/lib/destiny/destinyUserStore'
import {
  aggregateGuardianLeaderboard,
  aggregateLeaderboard,
  aggregatePantheonSquadLeaderboard,
} from '@/lib/destiny/leaderboards'
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
  const inBase = new Set(entries.map((e) => e.userId))

  const merged: LeaderboardEntry[] = entries
    .filter((e) => !adjMap.get(e.userId)?.excluded)
    .map((e) => {
      const adj = adjMap.get(e.userId)
      if (!adj) return e
      const points =
        adj.pointsOverride != null ? adj.pointsOverride : e.points + (adj.pointsDelta ?? 0)
      const verifiedClears =
        adj.verifiedClearsOverride ??
        Math.max(0, e.verifiedClears + (adj.verifiedClearsDelta ?? 0))
      return {
        ...e,
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
      isSquadEntry: category === 'pantheon',
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

export async function buildLeaderboardWithAdjustments(
  category: LeaderboardCategory,
  period: LeaderboardPeriod,
  season: Season,
  runs: RunRecord[],
  usersById: Map<string, StoredDestinyUser>,
  votes: MvpVote[]
): Promise<LeaderboardEntry[]> {
  const base =
    category === 'top_guardians'
      ? aggregateGuardianLeaderboard(votes, usersById, period, season)
      : category === 'pantheon'
        ? aggregatePantheonSquadLeaderboard(runs, usersById, period, season)
        : aggregateLeaderboard(runs, usersById, category, period, season)

  const adjustments = await loadLeaderboardAdjustments(category, period, season.id)
  return applyLeaderboardAdjustments(base, adjustments, usersById, category, period, season)
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
