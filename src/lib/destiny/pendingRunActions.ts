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
  const activities = buildActivityRunsForVote(
    viewerId,
    viewerMembershipId,
    runs,
    users,
    mvpVotes,
    trustReviews
  )

  const mvpRunCount = activities.filter((run) => {
    if (run.userHasVoted) return false
    return run.guardians.some((guardian) => guardian.canVoteFor)
  }).length

  const trustReviewCount = activities.reduce((total, run) => total + run.pendingTrustCount, 0)

  return {
    mvpRunCount,
    trustReviewCount,
    pendingCount: mvpRunCount + trustReviewCount,
  }
}
