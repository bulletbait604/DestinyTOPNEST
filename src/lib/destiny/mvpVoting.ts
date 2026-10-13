import type {
  ActivityRunForVote,
  ActivityRunGuardian,
  MvpVote,
  RunRecord,
  TrustReview,
} from '@/lib/destiny/types'
import type { StoredDestinyUser } from '@/lib/destiny/destinyUserStore'
import { trustReviewKey, userParticipatedInRun, usersByMembershipMap } from '@/lib/destiny/fireteamReputation'

export const MVP_VOTER_POINTS = 0
/** MVP votes credit sherpas. They do not score a leaderboard. */
export const MVP_SELECTED_POINTS = 0

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
