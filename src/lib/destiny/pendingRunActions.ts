import { buildReviewableRuns, usersByMembershipMap } from '@/lib/destiny/fireteamReputation'
import { buildActivityRunsForVote } from '@/lib/destiny/mvpVoting'
import type { StoredDestinyUser } from '@/lib/destiny/destinyUserStore'
import type { MvpVote, PendingRunActions, RunRecord, TrustReview } from '@/lib/destiny/types'

export type { PendingRunActions } from '@/lib/destiny/types'

export function computePendingRunActions(
  viewerId: string,
  viewerMembershipId: string | undefined,
  runs: RunRecord[],
  users: StoredDestinyUser[],
  mvpVotes: MvpVote[],
  trustReviews: TrustReview[]
): PendingRunActions {
  const votesByRun = new Map(mvpVotes.map((vote) => [vote.runId, vote]))
  const activities = buildActivityRunsForVote(
    viewerId,
    viewerMembershipId,
    runs,
    users,
    votesByRun
  )

  const mvpRunCount = activities.filter((run) => {
    if (run.userHasVoted) return false
    return run.guardians.some((guardian) => guardian.canVoteFor)
  }).length

  const reviewableRuns = buildReviewableRuns(
    viewerId,
    viewerMembershipId,
    runs,
    usersByMembershipMap(users),
    trustReviews
  )

  const trustReviewCount = reviewableRuns.reduce(
    (total, run) => total + run.teammates.filter((teammate) => !teammate.alreadyReviewed).length,
    0
  )

  return {
    mvpRunCount,
    trustReviewCount,
    pendingCount: mvpRunCount + trustReviewCount,
  }
}
