import type {
  ActivityRunForVote,
  ActivityRunGuardian,
  LeaderboardEntry,
  LeaderboardPeriod,
  MvpVote,
  RunRecord,
  Season,
  TrustReview,
} from '@/lib/destiny/types'
import type { StoredDestinyUser } from '@/lib/destiny/destinyUserStore'
import { trustReviewKey, userParticipatedInRun, usersByMembershipMap } from '@/lib/destiny/fireteamReputation'
import { getWeeklyResetState } from '@/lib/destiny/weeklyRotation'

export const MVP_VOTER_POINTS = 0
/** MVP selection no longer awards leaderboard points — Top Guardians ranks by crowns received. */
export const MVP_SELECTED_POINTS = 0
export const COMMANDER_RANK_LIMIT = 3

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

function voteMatchesPeriod(vote: MvpVote, period: LeaderboardPeriod, season: Season): boolean {
  const start = periodStart(period, season)
  const voteTime = new Date(vote.createdAt).getTime()
  if (!start) return true
  if (period === 'season') {
    const end = new Date(season.endDate).getTime()
    return voteTime >= start.getTime() && voteTime <= end
  }
  return voteTime >= start.getTime()
}

interface UserAgg {
  userId: string
  points: number
  mvpReceived: number
}

export function aggregateGuardianLeaderboard(
  votes: MvpVote[],
  usersById: Map<string, StoredDestinyUser>,
  period: LeaderboardPeriod,
  season: Season,
  limit = 10
): LeaderboardEntry[] {
  const agg = new Map<string, UserAgg>()

  for (const vote of votes) {
    if (!voteMatchesPeriod(vote, period, season)) continue

    const selectedRow = agg.get(vote.selectedUserId) ?? {
      userId: vote.selectedUserId,
      points: 0,
      mvpReceived: 0,
    }
    selectedRow.mvpReceived += 1
    selectedRow.points = selectedRow.mvpReceived
    agg.set(vote.selectedUserId, selectedRow)
  }

  return Array.from(agg.values())
    .sort((a, b) => b.mvpReceived - a.mvpReceived || b.points - a.points)
    .slice(0, limit)
    .map((row, index) => {
      const user = usersById.get(row.userId)
      return {
        userId: row.userId,
        bungieDisplayName: user?.bungieDisplayName ?? row.userId,
        emblemUrl: user?.emblemUrl,
        clanTag: user?.clanTag,
        platform: user?.platform ?? 'steam',
        guardianRank: user?.guardianRank,
        powerLevel: user?.powerLevel,
        category: 'top_guardians' as const,
        seasonId: season.id,
        period,
        points: row.points,
        verifiedClears: row.mvpReceived,
        rank: index + 1,
      }
    })
}

export function guardianPointsForUser(
  userId: string,
  votes: MvpVote[],
  period: LeaderboardPeriod,
  season: Season
): number {
  let mvpCrowns = 0
  for (const vote of votes) {
    if (!voteMatchesPeriod(vote, period, season)) continue
    if (vote.selectedUserId === userId) mvpCrowns += 1
  }
  return mvpCrowns
}

export function buildActivityRunsForVote(
  viewerId: string,
  viewerMembershipId: string | undefined,
  runs: RunRecord[],
  users: StoredDestinyUser[],
  votesByRun: Map<string, MvpVote>,
  trustReviews: TrustReview[] = []
): ActivityRunForVote[] {
  const usersByMembership = usersByMembershipMap(users)
  const reviewedKeys = new Set(
    trustReviews.map((review) => trustReviewKey(review.runId, review.reviewedMembershipId))
  )

  return runs
    .filter((run) => run.verificationStatus === 'verified')
    .filter((run) => userParticipatedInRun(viewerId, viewerMembershipId, run))
    .map((run) => {
      const existingVote = votesByRun.get(run.id)
      const guardians: ActivityRunGuardian[] = run.teamMembers.map((member) => {
        const linked = usersByMembership.get(member.membershipId)
        const isSelf = member.membershipId === viewerMembershipId
        const siteUserId = linked?.userId
        const canVoteFor = Boolean(siteUserId && siteUserId !== viewerId && !isSelf)
        const canReview = !isSelf
        const alreadyReviewed = canReview
          ? reviewedKeys.has(trustReviewKey(run.id, member.membershipId))
          : false
        return {
          membershipId: member.membershipId,
          displayName: linked?.bungieDisplayName || member.displayName,
          characterClass: member.characterClass,
          siteUserId,
          isSelf,
          canVoteFor,
          canReview,
          alreadyReviewed,
        }
      })

      const pendingTrustCount = guardians.filter((g) => g.canReview && !g.alreadyReviewed).length

      return {
        runId: run.id,
        activityName: run.activityName,
        type: run.type,
        completedAt: run.completedAt,
        durationSeconds: run.durationSeconds,
        pointsAwarded: run.pointsAwarded ?? 0,
        verificationStatus: run.verificationStatus,
        userHasVoted: Boolean(existingVote),
        selectedUserId: existingVote?.selectedUserId,
        selectedDisplayName: existingVote?.selectedDisplayName,
        pendingTrustCount,
        guardians,
      }
    })
}

export function validateMvpVoteSubmission(
  voterId: string,
  voterMembershipId: string | undefined,
  selectedUserId: string,
  runId: string,
  runs: RunRecord[],
  usersByMembership: Map<string, StoredDestinyUser>,
  existingVote?: MvpVote | null
): { ok: true; member: { membershipId: string; displayName: string } } | { ok: false; error: string } {
  if (existingVote) {
    return { ok: false, error: 'You already voted MVP for this activity' }
  }
  if (selectedUserId === voterId) {
    return { ok: false, error: 'You cannot vote for yourself' }
  }

  const run = runs.find((r) => r.id === runId)
  if (!run) return { ok: false, error: 'Run not found' }
  if (run.verificationStatus !== 'verified') {
    return { ok: false, error: 'Only verified activities can receive MVP votes' }
  }
  if (!userParticipatedInRun(voterId, voterMembershipId, run)) {
    return { ok: false, error: 'You must have been on this fireteam to vote' }
  }

  const member = run.teamMembers.find((m) => {
    const linked = usersByMembership.get(m.membershipId)
    return linked?.userId === selectedUserId
  })
  if (!member) {
    return { ok: false, error: 'Selected Guardian must be on Top Nest and on this fireteam' }
  }

  return {
    ok: true,
    member: {
      membershipId: member.membershipId,
      displayName: usersByMembership.get(member.membershipId)?.bungieDisplayName || member.displayName,
    },
  }
}
