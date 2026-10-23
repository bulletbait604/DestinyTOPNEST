import type {
  DestinyPlatform,
  LeaderboardCategory,
  LeaderboardEntry,
  LeaderboardPeriod,
  RunRecord,
  RunTeamMember,
  Season,
} from '@/lib/destiny/types'
import type { StoredDestinyUser } from '@/lib/destiny/destinyUserStore'
import { bungieBoardKey, isKickGuardiansClan } from '@/lib/destiny/kickGuardians'
import { isRunAtOrAfterNestLaunch, nestLaunchUtcMs } from '@/lib/destiny/runDates'
import { getWeeklyResetState } from '@/lib/destiny/weeklyRotation'

/** Boards that are still scored, shown, and accepted by the leaderboard APIs. */
export const ACTIVE_LEADERBOARD_CATEGORIES = ['raid', 'dungeon', 'new_bonds'] as const satisfies readonly LeaderboardCategory[]

export function isActiveLeaderboardCategory(value: string | null | undefined): value is LeaderboardCategory {
  return value === 'raid' || value === 'dungeon' || value === 'new_bonds'
}

interface UserAgg {
  userId: string
  points: number
  verifiedClears: number
  fastestClearSeconds?: number
  fastestActivityName?: string
  displayName: string
  membershipId?: string
  platform: DestinyPlatform
  emblemUrl?: string
  clanTag?: string
  guardianRank?: number
  powerLevel?: number
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
  if (run.scoredInActiveSeason && (period === 'season' || period === 'all_time')) {
    if (period === 'all_time') return true
    return new Date(run.completedAt).getTime() <= new Date(season.endDate).getTime()
  }
  if (!isRunAtOrAfterNestLaunch(run.completedAt)) return false
  const start = periodStart(period, season)
  if (!start) return true
  if (period === 'season') {
    const seasonStartMs = Math.max(start.getTime(), nestLaunchUtcMs())
    const end = new Date(season.endDate).getTime()
    const t = new Date(run.completedAt).getTime()
    return t >= seasonStartMs && t <= end
  }
  const effectiveStart = Math.max(start.getTime(), nestLaunchUtcMs())
  return new Date(run.completedAt).getTime() >= effectiveStart
}

function runMatchesCategory(run: RunRecord, category: LeaderboardCategory): boolean {
  if (run.verificationStatus !== 'verified') return false
  if (category === 'raid') return run.type === 'raid'
  if (category === 'dungeon') return run.type === 'dungeon'
  if (category === 'new_bonds') return (run.bondPoints ?? 0) > 0
  return false
}

function activeUser(user: StoredDestinyUser | undefined): user is StoredDestinyUser {
  return user != null && user.accountStatus !== 'pending'
}

function usersByMembership(usersById: Map<string, StoredDestinyUser>): Map<string, StoredDestinyUser> {
  const byMembership = new Map<string, StoredDestinyUser>()
  for (const user of Array.from(usersById.values())) {
    const membershipId = user.bungieMembershipId?.trim()
    if (!membershipId) continue
    const current = byMembership.get(membershipId)
    if (!current || (!activeUser(current) && activeUser(user))) byMembership.set(membershipId, user)
  }
  return byMembership
}

/** A signed-in TopNest account. Pending placeholders are not registered. Unknown site ids still count so public boards can rank stored clears. */
function registeredOwner(run: RunRecord, usersById: Map<string, StoredDestinyUser>): StoredDestinyUser | undefined {
  const ownerUserId = run.ownerUserId?.trim()
  if (!ownerUserId || ownerUserId.startsWith('bungie:')) return undefined
  const owner = usersById.get(ownerUserId)
  if (owner?.accountStatus === 'pending') return undefined
  if (owner) return owner
  return {
    userId: ownerUserId,
    bungieMembershipId: run.ownerMembershipId?.trim() || '',
    bungieDisplayName: run.ownerDisplayName?.trim() || ownerUserId,
    platform: 'steam',
  }
}

function completedMembers(run: RunRecord): RunTeamMember[] {
  return run.teamMembers.filter((member) => member.completed !== false && Boolean(member.membershipId?.trim()))
}

function runQualifies(
  run: RunRecord,
  usersById: Map<string, StoredDestinyUser>,
  byMembership: Map<string, StoredDestinyUser>,
  kickMembershipIds: ReadonlySet<string> | undefined
): boolean {
  if (registeredOwner(run, usersById)) return true
  const ownerMembership = run.ownerMembershipId?.trim()
  if (ownerMembership && kickMembershipIds?.has(ownerMembership)) return true
  const ownerRecord = run.ownerUserId ? usersById.get(run.ownerUserId) : undefined
  if (isKickGuardiansClan(ownerRecord?.clanName)) return true
  for (const member of completedMembers(run)) {
    const membershipId = member.membershipId.trim()
    const linked = byMembership.get(membershipId)
    const linkedClan = linked?.clanName
    if (activeUser(linked)) return true
    if (kickMembershipIds?.has(membershipId)) return true
    if (isKickGuardiansClan(member.clanName) || isKickGuardiansClan(linkedClan)) return true
  }
  return false
}

function betterRun(current: RunRecord, next: RunRecord, category: LeaderboardCategory): RunRecord {
  const score = (run: RunRecord) => {
    if (run.verificationStatus !== 'verified') return -1
    return category === 'new_bonds' ? (run.bondPoints ?? 0) : (run.pointsAwarded ?? 0)
  }
  return score(next) > score(current) ? next : current
}

/** One row per PGCR so the same clear ingested for two accounts is not scored twice. */
function dedupeRuns(runs: RunRecord[], category: LeaderboardCategory): RunRecord[] {
  const byPgcr = new Map<string, RunRecord>()
  for (const run of runs) {
    const key = (run.pgcrId || run.id).trim()
    if (!key) continue
    const current = byPgcr.get(key)
    byPgcr.set(key, current ? betterRun(current, run, category) : run)
  }
  return Array.from(byPgcr.values())
}

function remember(
  agg: Map<string, UserAgg>,
  key: string,
  points: number,
  run: RunRecord,
  meta: {
    displayName: string
    membershipId?: string
    platform?: DestinyPlatform
    user?: StoredDestinyUser
  }
) {
  const existing = agg.get(key) ?? {
    userId: key,
    points: 0,
    verifiedClears: 0,
    displayName: meta.displayName,
    membershipId: meta.membershipId,
    platform: meta.platform ?? 'steam',
  }
  existing.points += points
  existing.verifiedClears += 1
  if (meta.displayName && (existing.displayName === key || existing.displayName.startsWith('bungie:'))) {
    existing.displayName = meta.displayName
  }
  if (!existing.membershipId && meta.membershipId) existing.membershipId = meta.membershipId
  if (meta.platform) existing.platform = meta.platform
  if (meta.user) {
    existing.displayName = meta.user.bungieDisplayName || existing.displayName
    existing.emblemUrl = meta.user.emblemUrl ?? existing.emblemUrl
    existing.clanTag = meta.user.clanTag ?? existing.clanTag
    existing.guardianRank = meta.user.guardianRank ?? existing.guardianRank
    existing.powerLevel = meta.user.powerLevel ?? existing.powerLevel
    existing.platform = meta.user.platform ?? existing.platform
    existing.membershipId = meta.user.bungieMembershipId || existing.membershipId
  }
  if (
    run.durationSeconds > 0 &&
    (existing.fastestClearSeconds == null || run.durationSeconds < existing.fastestClearSeconds)
  ) {
    existing.fastestClearSeconds = run.durationSeconds
    existing.fastestActivityName = run.activityName
  }
  agg.set(key, existing)
}

export function aggregateLeaderboard(
  runs: RunRecord[],
  usersById: Map<string, StoredDestinyUser>,
  category: LeaderboardCategory,
  period: LeaderboardPeriod,
  season: Season,
  kickMembershipIds?: ReadonlySet<string>
): LeaderboardEntry[] {
  const agg = new Map<string, UserAgg>()
  const byMembership = usersByMembership(usersById)

  for (const run of dedupeRuns(runs, category)) {
    if (!runMatchesPeriod(run, period, season)) continue
    if (!runMatchesCategory(run, category)) continue
    if (!runQualifies(run, usersById, byMembership, kickMembershipIds)) continue

    const points = category === 'new_bonds' ? (run.bondPoints ?? 0) : (run.pointsAwarded ?? 0)
    if (points <= 0) continue

    const owner = registeredOwner(run, usersById)
    const ownerMembership = (owner?.bungieMembershipId || run.ownerMembershipId || '').trim()
    const seen = new Set<string>()

    for (const member of completedMembers(run)) {
      const membershipId = member.membershipId.trim()
      const linked = byMembership.get(membershipId)
      const active = activeUser(linked) ? linked : undefined
      const key = active?.userId ?? (owner && membershipId === ownerMembership ? owner.userId : bungieBoardKey(membershipId))
      if (seen.has(key)) continue
      seen.add(key)
      const profile = active ?? (key === owner?.userId ? owner : undefined)
      remember(agg, key, points, run, {
        displayName: member.displayName || profile?.bungieDisplayName || membershipId,
        membershipId,
        platform: member.platform,
        user: profile,
      })
    }

    const ownerListed = ownerMembership
      ? run.teamMembers.find((member) => member.membershipId.trim() === ownerMembership)
      : undefined
    const ownerFinished = !ownerListed || ownerListed.completed !== false
    if (owner && ownerFinished && !seen.has(owner.userId)) {
      remember(agg, owner.userId, points, run, {
        displayName: owner.bungieDisplayName,
        membershipId: ownerMembership || undefined,
        platform: owner.platform,
        user: owner,
      })
    }
  }

  const sorted = Array.from(agg.values()).sort((a, b) => b.points - a.points || b.verifiedClears - a.verifiedClears)

  return sorted.slice(0, 10).map((row, index) => ({
    userId: row.userId,
    bungieDisplayName: row.displayName,
    emblemUrl: row.emblemUrl,
    clanTag: row.clanTag,
    platform: row.platform,
    guardianRank: row.guardianRank,
    powerLevel: row.powerLevel,
    category,
    seasonId: season.id,
    period,
    points: row.points,
    verifiedClears: row.verifiedClears,
    rank: index + 1,
    fastestClearSeconds: row.fastestClearSeconds,
    fastestActivityName: row.fastestActivityName,
    bungieMembershipId: row.membershipId,
  }))
}
