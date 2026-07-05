import type {
  LeaderboardCategory,
  LeaderboardEntry,
  LeaderboardPeriod,
  MvpVote,
  RunRecord,
  Season,
} from '@/lib/destiny/types'
import type { StoredDestinyUser } from '@/lib/destiny/destinyUserStore'
import { aggregateGuardianLeaderboard } from '@/lib/destiny/mvpVoting'
import { getWeeklyResetState } from '@/lib/destiny/weeklyRotation'

interface UserAgg {
  userId: string
  points: number
  verifiedClears: number
  fastestClearSeconds?: number
  fastestActivityName?: string
}

function periodStart(period: LeaderboardPeriod, season: Season): Date | null {
  const now = Date.now()
  switch (period) {
    case 'weekly': {
      const reset = getWeeklyResetState()
      return new Date(reset.resetAt)
    }
    case 'monthly':
      return new Date(now - 30 * 24 * 60 * 60 * 1000)
    case 'season':
      return new Date(season.startDate)
    case 'all_time':
      return null
  }
}

function runMatchesPeriod(run: RunRecord, period: LeaderboardPeriod, season: Season): boolean {
  const start = periodStart(period, season)
  if (!start) return true
  if (period === 'season') {
    const end = new Date(season.endDate).getTime()
    const t = new Date(run.completedAt).getTime()
    return t >= start.getTime() && t <= end
  }
  return new Date(run.completedAt).getTime() >= start.getTime()
}

function runMatchesCategory(run: RunRecord, category: LeaderboardCategory): boolean {
  if (run.verificationStatus !== 'verified') return false
  if (category === 'raid') return run.type === 'raid'
  if (category === 'dungeon') return run.type === 'dungeon'
  return false
}

export function aggregateLeaderboard(
  runs: RunRecord[],
  usersById: Map<string, StoredDestinyUser>,
  category: LeaderboardCategory,
  period: LeaderboardPeriod,
  season: Season
): LeaderboardEntry[] {
  const agg = new Map<string, UserAgg>()

  for (const run of runs) {
    if (!run.ownerUserId) continue
    if (!runMatchesPeriod(run, period, season)) continue
    if (!runMatchesCategory(run, category)) continue

    const pts = run.pointsAwarded ?? 0
    if (pts <= 0) continue

    const existing = agg.get(run.ownerUserId) ?? {
      userId: run.ownerUserId,
      points: 0,
      verifiedClears: 0,
    }

    existing.points += pts
    existing.verifiedClears += 1

    if (
      run.durationSeconds > 0 &&
      (existing.fastestClearSeconds == null || run.durationSeconds < existing.fastestClearSeconds)
    ) {
      existing.fastestClearSeconds = run.durationSeconds
      existing.fastestActivityName = run.activityName
    }

    agg.set(run.ownerUserId, existing)
  }

  const sorted = Array.from(agg.values()).sort((a, b) => b.points - a.points || b.verifiedClears - a.verifiedClears)

  return sorted.slice(0, 10).map((row, index) => {
    const user = usersById.get(row.userId)
    return {
      userId: row.userId,
      bungieDisplayName: user?.bungieDisplayName ?? runDisplayName(runs, row.userId),
      emblemUrl: user?.emblemUrl,
      clanTag: user?.clanTag,
      platform: user?.platform ?? 'steam',
      guardianRank: user?.guardianRank,
      powerLevel: user?.powerLevel,
      category,
      seasonId: season.id,
      period,
      points: row.points,
      verifiedClears: row.verifiedClears,
      rank: index + 1,
      fastestClearSeconds: row.fastestClearSeconds,
      fastestActivityName: row.fastestActivityName,
    }
  })
}

function runDisplayName(runs: RunRecord[], userId: string): string {
  const run = runs.find((r) => r.ownerUserId === userId)
  return run?.ownerDisplayName ?? userId
}

export { aggregateGuardianLeaderboard }
