import type {
  ActivityRunForVote,
  ActivityRunGuardian,
  MvpVote,
  MvpVoteCategory,
  RunRecord,
  RunTeamMember,
  TrustReview,
} from '@/lib/destiny/types'
import type { StoredDestinyUser } from '@/lib/destiny/destinyUserStore'
import { trustReviewKey, userParticipatedInRun, usersByMembershipMap } from '@/lib/destiny/fireteamReputation'
import { isPendingAccount } from '@/lib/destiny/playerIdentity'

export const MVP_VOTER_POINTS = 0
/** MVP votes credit sherpas. They do not score a leaderboard. */
export const MVP_SELECTED_POINTS = 0

/**
 * One changeable MVP per voter per run, plus optional kudos for every other
 * carnage-report guardian. Both are keyed by Bungie membership id.
 * Kudos do not grant sherpa points.
 */
export type MvpVoteAction = 'set' | 'clear'

export interface ResolvedVoteTarget {
  membershipId: string
  displayName: string
  siteUserId?: string
  characterClass?: RunTeamMember['characterClass']
  platform?: RunTeamMember['platform']
}

export function isMvpCategoryVote(vote: { category?: string | null }): boolean {
  return vote.category == null || vote.category === 'mvp'
}

export function mvpCategoryFilter(): { $or: Array<Record<string, unknown>> } {
  return { $or: [{ category: 'mvp' }, { category: { $exists: false } }, { category: null }] }
}

export function parseMvpVoteCategory(value: unknown): MvpVoteCategory | null {
  if (value == null || value === 'mvp') return 'mvp'
  if (value === 'kudos') return 'kudos'
  return null
}

export function normalizeMembershipId(value: string | undefined | null): string {
  return typeof value === 'string' ? value.trim() : ''
}

/** Unique guardians on the stored post-game carnage report. */
export function pgcrRoster(run: RunRecord): Map<string, RunTeamMember> {
  const roster = new Map<string, RunTeamMember>()
  for (const member of run.teamMembers) {
    const membershipId = normalizeMembershipId(member.membershipId)
    if (!membershipId || roster.has(membershipId)) continue
    roster.set(membershipId, { ...member, membershipId })
  }
  return roster
}

export function mvpVoteId(voterId: string, runId: string): string {
  return `mvp-${voterId}-${runId}`
}

export function kudosVoteId(voterId: string, runId: string, membershipId: string): string {
  return `kudos-${voterId}-${runId}-${membershipId}`
}

function votesForRun(votes: MvpVote[], runId: string): { mvp?: MvpVote; kudos: MvpVote[] } {
  const mvpCandidates: MvpVote[] = []
  const kudos: MvpVote[] = []
  for (const vote of votes) {
    if (vote.runId !== runId) continue
    if (vote.category === 'kudos') kudos.push(vote)
    else if (isMvpCategoryVote(vote)) mvpCandidates.push(vote)
  }
  const mvp = mvpCandidates.find((vote) => vote.category === 'mvp') ?? mvpCandidates[0]
  return { mvp, kudos }
}

function linkedSiteUserId(
  usersByMembership: Map<string, StoredDestinyUser>,
  membershipId: string
): string | undefined {
  const linked = usersByMembership.get(membershipId)
  if (!linked?.userId || isPendingAccount(linked)) return undefined
  return linked.userId
}

export function buildActivityRunsForVote(
  viewerId: string,
  viewerMembershipId: string | undefined,
  runs: RunRecord[],
  users: StoredDestinyUser[],
  votes: MvpVote[],
  trustReviews: TrustReview[] = []
): ActivityRunForVote[] {
  const usersByMembership = usersByMembershipMap(users)
  const viewerMembership = normalizeMembershipId(viewerMembershipId)
  const reviewedKeys = new Set(
    trustReviews.map((review) => trustReviewKey(review.runId, review.reviewedMembershipId))
  )

  return runs
    .filter((run) => run.verificationStatus === 'verified')
    .filter((run) => userParticipatedInRun(viewerId, viewerMembershipId, run))
    .map((run) => {
      const { mvp, kudos } = votesForRun(votes, run.id)
      const kudosMembershipIds = kudos
        .map((vote) => normalizeMembershipId(vote.selectedMembershipId))
        .filter(Boolean)
      const kudosSet = new Set(kudosMembershipIds)
      const guardians: ActivityRunGuardian[] = Array.from(pgcrRoster(run).values()).map((member) => {
        const siteUserId = linkedSiteUserId(usersByMembership, member.membershipId)
        const isSelf = member.membershipId === viewerMembership || siteUserId === viewerId
        const canVoteFor = !isSelf
        const canReview = !isSelf
        const alreadyReviewed = canReview
          ? reviewedKeys.has(trustReviewKey(run.id, member.membershipId))
          : false
        return {
          membershipId: member.membershipId,
          displayName: usersByMembership.get(member.membershipId)?.bungieDisplayName || member.displayName,
          characterClass: member.characterClass,
          siteUserId,
          isSelf,
          canVoteFor,
          kudosGiven: kudosSet.has(member.membershipId),
          canReview,
          alreadyReviewed,
        }
      })

      const pendingTrustCount = guardians.filter((guardian) => guardian.canReview && !guardian.alreadyReviewed).length
      const selectedMembershipId = normalizeMembershipId(mvp?.selectedMembershipId) || undefined

      return {
        runId: run.id,
        activityName: run.activityName,
        type: run.type,
        completedAt: run.completedAt,
        durationSeconds: run.durationSeconds,
        pointsAwarded: run.pointsAwarded ?? 0,
        verificationStatus: run.verificationStatus,
        userHasVoted: Boolean(mvp),
        selectedUserId: mvp?.selectedUserId || undefined,
        selectedMembershipId,
        selectedDisplayName: mvp?.selectedDisplayName,
        kudosMembershipIds,
        pendingTrustCount,
        guardians,
      }
    })
}

export interface GuardianVoteState {
  showMvpBadge: boolean
  mvpButton: 'hidden' | 'vote' | 'change'
  kudosButton: 'hidden' | 'give' | 'clear'
}

export function guardianVoteState(run: ActivityRunForVote, guardian: ActivityRunGuardian): GuardianVoteState {
  if (guardian.isSelf || !guardian.canVoteFor) {
    return { showMvpBadge: false, mvpButton: 'hidden', kudosButton: 'hidden' }
  }
  const crowned =
    Boolean(run.selectedMembershipId) && run.selectedMembershipId === guardian.membershipId
  return {
    showMvpBadge: crowned,
    mvpButton: crowned ? 'hidden' : run.userHasVoted ? 'change' : 'vote',
    kudosButton: guardian.kudosGiven ? 'clear' : 'give',
  }
}

export function resolveVoteTargetMembershipId(input: {
  membershipId?: string
  selectedUserId?: string
  usersByMembership: Map<string, StoredDestinyUser>
}): { ok: true; membershipId: string } | { ok: false; error: string } {
  const membershipId = normalizeMembershipId(input.membershipId)
  if (membershipId) return { ok: true, membershipId }

  const selectedUserId = input.selectedUserId?.trim().toLowerCase()
  if (!selectedUserId) {
    return { ok: false, error: 'membershipId or selectedUserId is required' }
  }

  for (const user of Array.from(input.usersByMembership.values())) {
    if (isPendingAccount(user)) continue
    if (user.userId?.toLowerCase() === selectedUserId && user.bungieMembershipId) {
      return { ok: true, membershipId: user.bungieMembershipId }
    }
  }

  return {
    ok: false,
    error: 'Could not resolve that guardian. Vote with their Bungie membership id from the activity.',
  }
}

export function validateMvpVoteSubmission(input: {
  voterId: string
  voterMembershipId: string | undefined
  targetMembershipId: string
  category: MvpVoteCategory
  action?: MvpVoteAction
  runId: string
  runs: RunRecord[]
  usersByMembership: Map<string, StoredDestinyUser>
}): { ok: true; target: ResolvedVoteTarget; pending: boolean } | { ok: false; error: string } {
  const action = input.action ?? 'set'
  if (action === 'clear' && input.category !== 'kudos') {
    return { ok: false, error: 'Change your MVP by choosing another guardian' }
  }

  const voterMembershipId = normalizeMembershipId(input.voterMembershipId)
  const targetMembershipId = normalizeMembershipId(input.targetMembershipId)
  if (!voterMembershipId) {
    return { ok: false, error: 'Link Bungie so we can confirm you were in this activity' }
  }
  if (!targetMembershipId) {
    return { ok: false, error: 'A Bungie membership id is required' }
  }

  const run = input.runs.find((candidate) => candidate.id === input.runId)
  if (!run) return { ok: false, error: 'Run not found' }
  if (run.verificationStatus !== 'verified') {
    return { ok: false, error: 'Only verified activities can receive votes' }
  }
  if (!userParticipatedInRun(input.voterId, voterMembershipId, run)) {
    return { ok: false, error: 'You must have been on this fireteam to vote' }
  }

  const roster = pgcrRoster(run)
  if (!roster.has(voterMembershipId)) {
    return { ok: false, error: 'You were not on this activity’s post-game carnage report' }
  }

  const member = roster.get(targetMembershipId)
  if (!member) {
    return { ok: false, error: 'That guardian was not on this activity’s post-game carnage report' }
  }

  const siteUserId = linkedSiteUserId(input.usersByMembership, targetMembershipId)
  const votingForSelf = targetMembershipId === voterMembershipId || siteUserId === input.voterId
  if (votingForSelf) {
    return { ok: false, error: 'You cannot vote for yourself' }
  }

  const linked = input.usersByMembership.get(targetMembershipId)
  return {
    ok: true,
    pending: !siteUserId,
    target: {
      membershipId: targetMembershipId,
      displayName: linked?.bungieDisplayName || member.displayName || targetMembershipId,
      siteUserId,
      characterClass: member.characterClass,
      platform: member.platform,
    },
  }
}

/** Votes already on a membership id, including ones cast before the player joined. */
export function mvpVotesReceivedQuery(
  userId: string,
  membershipId: string | undefined,
  category: MvpVoteCategory
): Record<string, unknown> {
  const normalizedUserId = userId.trim().toLowerCase()
  const normalizedMembershipId = normalizeMembershipId(membershipId)
  const identity = normalizedMembershipId
    ? { $or: [{ selectedMembershipId: normalizedMembershipId }, { selectedUserId: normalizedUserId }] }
    : { selectedUserId: normalizedUserId }
  const categoryFilter = category === 'kudos' ? { category: 'kudos' } : mvpCategoryFilter()
  return { $and: [identity, categoryFilter] }
}

/** Fill selectedUserId only where the membership was voted before an account existed. */
export function unclaimedVoteAttachmentQuery(membershipId: string): Record<string, unknown> {
  return {
    selectedMembershipId: normalizeMembershipId(membershipId),
    $or: [{ selectedUserId: { $exists: false } }, { selectedUserId: null }, { selectedUserId: '' }],
  }
}
