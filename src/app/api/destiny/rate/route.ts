import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth/verifyAuth'
import { destinyAuthHandler } from '@/lib/destiny/apiHandler'
import { optionalAuth } from '@/lib/destiny/communityBuildAccess'
import { invalidateDestinySharedCaches, CACHE_TAGS } from '@/lib/destiny/dataCache'
import { getDestinyUserByBungieMembershipId, getDestinyUserBySiteUserId } from '@/lib/destiny/destinyUserStore'
import { searchGuardians } from '@/lib/destiny/guardianDirectoryData'
import { isMvpCategoryVote } from '@/lib/destiny/mvpVoting'
import { ensurePendingPlayerForUnlinkedMember } from '@/lib/destiny/pendingPlayers'
import {
  buildQuickRateWrite,
  countTags,
  isBungieMembershipId,
  normalizeRateNote,
  parseRateTags,
  pickSharedRun,
  recentTeammatesFromRuns,
  takeQuickRateLimit,
} from '@/lib/destiny/quickRate'
import { listQuickRatings, saveQuickRating } from '@/lib/destiny/quickRateStore'
import {
  findReputationReview,
  findTrustReview,
  countReceivedVotes,
  getMvpVotesByReviewer,
  getReputationReviewsByReviewer,
  getRunsForParticipant,
  getTrustReviewsByReviewer,
  loadUsersMap,
  saveMvpVote,
  saveReputationReview,
  saveTrustReview,
} from '@/lib/destiny/store'

export const dynamic = 'force-dynamic'

const VOTE_CACHE_TAGS = [CACHE_TAGS.mvp, CACHE_TAGS.overview, CACHE_TAGS.leaderboards]

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams
  if (params.has('suggest')) {
    const query = params.get('q') ?? ''
    if (query.trim().length > 40) {
      return NextResponse.json({ error: 'Search must be 40 characters or fewer.' }, { status: 400 })
    }
    const user = await optionalAuth(req).catch(() => null)
    const guardians = query.trim().length >= 2 ? await searchGuardians(query).catch(() => []) : []
    let teammates: { membershipId: string; displayName: string }[] = []
    if (user) {
      const stored = await getDestinyUserBySiteUserId(user.username.toLowerCase()).catch(() => null)
      const runs = await getRunsForParticipant(user.username.toLowerCase(), stored?.bungieMembershipId, 40)
      teammates = recentTeammatesFromRuns(runs, stored?.bungieMembershipId)
    }
    return NextResponse.json({ guardians: guardians.slice(0, 12), teammates })
  }

  const membershipId = params.get('membershipId')?.trim() ?? ''
  if (!isBungieMembershipId(membershipId)) {
    return NextResponse.json({ error: 'membershipId is required' }, { status: 400 })
  }
  const rows = await listQuickRatings(membershipId)
  const user = await optionalAuth(req).catch(() => null)
  const mine = user ? rows.find((row) => row.voterId === user.username.toLowerCase()) : undefined
  const mvpVotes = await countReceivedVotes('__none__', membershipId, 'mvp').catch(() => 0)
  return NextResponse.json({
    counts: countTags(rows),
    total: rows.length,
    mvpVotes,
    mine: mine ? { tags: mine.tags, note: mine.note ?? '' } : null,
  })
}

export async function POST(req: NextRequest) {
  return destinyAuthHandler(req, async () => {
    const authUser = await verifyAuth(req)
    const voterId = authUser.username.toLowerCase()
    const limited = takeQuickRateLimit({ userId: voterId })
    if (!limited.ok) {
      return NextResponse.json(
        { error: 'Too many ratings. Try again shortly.' },
        { status: 429, headers: { 'Retry-After': String(limited.retryAfterSec) } }
      )
    }

    const body = (await req.json().catch(() => ({}))) as {
      membershipId?: string
      displayName?: string
      tags?: unknown
      note?: unknown
      runId?: string
    }
    const targetMembershipId = body.membershipId?.trim() ?? ''
    const tags = parseRateTags(body.tags)
    const note = normalizeRateNote(body.note)
    const displayName = typeof body.displayName === 'string' ? body.displayName.trim().slice(0, 80) : ''
    const preferredRunId = body.runId?.trim() || undefined

    try {
      const stored = await getDestinyUserBySiteUserId(voterId)
      const linked = isBungieMembershipId(targetMembershipId)
        ? await getDestinyUserByBungieMembershipId(targetMembershipId).catch(() => null)
        : null
      const [runs, usersById, votes, trusts, reps] = await Promise.all([
        getRunsForParticipant(voterId, stored?.bungieMembershipId, 50),
        loadUsersMap(),
        getMvpVotesByReviewer(voterId),
        getTrustReviewsByReviewer(voterId),
        getReputationReviewsByReviewer(voterId),
      ])
      const run = pickSharedRun(runs, voterId, stored?.bungieMembershipId, targetMembershipId, preferredRunId)
      const existingMvp = run ? votes.find((vote) => vote.runId === run.id && isMvpCategoryVote(vote)) : undefined
      const existingKudos = run
        ? votes.filter((vote) => vote.runId === run.id && vote.category === 'kudos').map((vote) => vote.selectedMembershipId)
        : []
      const targetSiteUserId = linked?.userId && linked.accountStatus !== 'pending' ? linked.userId : undefined
      const existingTrust = run ? await findTrustReview(voterId, run.id, targetMembershipId) : null
      const existingReputation =
        run && targetSiteUserId ? await findReputationReview(voterId, targetSiteUserId, run.id) : null

      const built = buildQuickRateWrite({
        voterId,
        voterMembershipId: stored?.bungieMembershipId,
        targetMembershipId,
        targetDisplayName: linked?.bungieDisplayName || displayName,
        targetSiteUserId,
        tags,
        note,
        now: new Date().toISOString(),
        preferredRunId,
        runs,
        users: Array.from(usersById.values()),
        existingTrustRunIds: existingTrust && run ? [run.id] : trusts.filter((review) => review.reviewedMembershipId === targetMembershipId).map((review) => review.runId),
        existingReputationRunIds: existingReputation && run ? [run.id] : [],
        existingMvpMembershipId: existingMvp?.selectedMembershipId,
        existingKudosMembershipIds: existingKudos,
        createdAt: undefined,
      })
      if (!built.ok) return NextResponse.json({ error: built.error }, { status: 400 })

      const prior = (await listQuickRatings(targetMembershipId)).find((row) => row.voterId === voterId)
      if (prior?.createdAt) built.draft.rating.createdAt = prior.createdAt

      await saveQuickRating(built.draft.rating)
      if (built.draft.mvpVote) {
        if (!built.draft.mvpVote.selectedUserId) {
          await ensurePendingPlayerForUnlinkedMember({
            membershipId: built.draft.mvpVote.selectedMembershipId,
            displayName: built.draft.mvpVote.selectedDisplayName,
          })
        }
        await saveMvpVote(built.draft.mvpVote)
      }
      if (built.draft.kudosVote) {
        if (!built.draft.kudosVote.selectedUserId) {
          await ensurePendingPlayerForUnlinkedMember({
            membershipId: built.draft.kudosVote.selectedMembershipId,
            displayName: built.draft.kudosVote.selectedDisplayName,
          })
        }
        await saveMvpVote(built.draft.kudosVote)
      }
      if (built.draft.trustReview) await saveTrustReview(built.draft.trustReview)
      if (built.draft.reputationReview) await saveReputationReview(built.draft.reputationReview)
      invalidateDestinySharedCaches(VOTE_CACHE_TAGS)
      return NextResponse.json({
        ok: true,
        message: built.draft.message,
        mvpStatus: built.draft.mvpStatus,
        tags: built.draft.rating.tags,
      })
    } catch (error) {
      const text = error instanceof Error ? error.message : ''
      if (text.includes('database is not connected') || text.includes('not a valid connection')) {
        return NextResponse.json({ error: 'Ratings are unavailable until the database is connected.' }, { status: 503 })
      }
      throw error
    }
  })
}
