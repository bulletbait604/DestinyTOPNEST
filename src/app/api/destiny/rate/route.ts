import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth/verifyAuth'
import { destinyAuthHandler } from '@/lib/destiny/apiHandler'
import { optionalAuth } from '@/lib/destiny/communityBuildAccess'
import { invalidateDestinySharedCaches, CACHE_TAGS } from '@/lib/destiny/dataCache'
import { getDestinyUserByBungieMembershipId, getDestinyUserBySiteUserId } from '@/lib/destiny/destinyUserStore'
import { searchGuardians } from '@/lib/destiny/guardianDirectoryData'
import {
  buildQuickRateWrite,
  countTags,
  isBungieMembershipId,
  normalizeRateNote,
  parseRateTags,
  quickRateId,
  recentTeammatesFromRuns,
  takeQuickRateLimit,
  toggleRateTag,
} from '@/lib/destiny/quickRate'
import { listQuickRatings, saveQuickRating } from '@/lib/destiny/quickRateStore'
import {
  getReputationReviewsByReviewer,
  getRunsForParticipant,
  getTrustReviewsByReviewer,
  loadUsersMap,
  saveReputationReview,
  saveTrustReview,
} from '@/lib/destiny/store'
import { voteCountsForMembership } from '@/lib/destiny/voteCounts'

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
  const counts = countTags(rows)
  const received = await voteCountsForMembership(membershipId)
  return NextResponse.json({
    counts,
    total: rows.length,
    mvpVotes: received.mvpVotes,
    newLightVotes: counts.new_light,
    uselessVotes: counts.useless,
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
      toggle?: boolean
      voteType?: unknown
    }
    if (body.voteType === 'mvp') {
      return NextResponse.json({ error: 'MVP is one pick per run. Use the run crown, not a rank tag.' }, { status: 400 })
    }
    if (body.voteType === 'new_light' || body.voteType === 'useless') {
      body.tags = [body.voteType]
      body.toggle = true
    }
    const targetMembershipId = body.membershipId?.trim() ?? ''
    let tags = parseRateTags(body.tags)
    const note = normalizeRateNote(body.note)
    const displayName = typeof body.displayName === 'string' ? body.displayName.trim().slice(0, 80) : ''
    const preferredRunId = body.runId?.trim() || undefined

    try {
      const stored = await getDestinyUserBySiteUserId(voterId)
      const linked = isBungieMembershipId(targetMembershipId)
        ? await getDestinyUserByBungieMembershipId(targetMembershipId).catch(() => null)
        : null
      const prior = (await listQuickRatings(targetMembershipId)).find((row) => row.voterId === voterId)
      if (body.toggle) {
        const tag = tags[0]
        if (!tag) return NextResponse.json({ error: 'Pick a rank' }, { status: 400 })
        tags = toggleRateTag(parseRateTags(prior?.tags), tag)
      }
      const targetSiteUserId = linked?.userId && linked.accountStatus !== 'pending' ? linked.userId : undefined
      const now = new Date().toISOString()
      if (!tags.length) {
        await saveQuickRating({
          id: quickRateId(voterId, targetMembershipId),
          voterId,
          voterMembershipId: stored?.bungieMembershipId,
          targetMembershipId,
          targetDisplayName: linked?.bungieDisplayName || displayName || targetMembershipId,
          tags: [],
          createdAt: prior?.createdAt ?? now,
          updatedAt: now,
        })
        const counts = countTags(await listQuickRatings(targetMembershipId))
        const received = await voteCountsForMembership(targetMembershipId)
        invalidateDestinySharedCaches(VOTE_CACHE_TAGS)
        return NextResponse.json({
          ok: true,
          tags: [],
          counts,
          message: 'Rank cleared.',
          mvpVotes: received.mvpVotes,
          newLightVotes: counts.new_light,
          uselessVotes: counts.useless,
        })
      }

      const [runs, usersById, trusts, reps] = await Promise.all([
        getRunsForParticipant(voterId, stored?.bungieMembershipId, 50),
        loadUsersMap(),
        getTrustReviewsByReviewer(voterId),
        getReputationReviewsByReviewer(voterId),
      ])
      const existingTrust = trusts.find((review) => review.reviewedMembershipId === targetMembershipId)
      const existingReputation = reps.find((review) => review.reviewedUserId === targetSiteUserId)

      const built = buildQuickRateWrite({
        voterId,
        voterMembershipId: stored?.bungieMembershipId,
        targetMembershipId,
        targetDisplayName: linked?.bungieDisplayName || displayName,
        targetSiteUserId,
        tags,
        note,
        now,
        preferredRunId,
        runs,
        users: Array.from(usersById.values()),
        existingTrustRunIds: existingTrust ? [existingTrust.runId] : [],
        existingReputationRunIds: existingReputation?.runId ? [existingReputation.runId] : [],
        createdAt: prior?.createdAt,
      })
      if (!built.ok) return NextResponse.json({ error: built.error }, { status: 400 })

      await saveQuickRating(built.draft.rating)
      if (built.draft.trustReview) await saveTrustReview(built.draft.trustReview)
      if (built.draft.reputationReview) await saveReputationReview(built.draft.reputationReview)
      invalidateDestinySharedCaches(VOTE_CACHE_TAGS)
      const counts = countTags(await listQuickRatings(targetMembershipId))
      const received = await voteCountsForMembership(targetMembershipId)
      return NextResponse.json({
        ok: true,
        message: built.draft.message,
        tags: built.draft.rating.tags,
        counts,
        mvpVotes: received.mvpVotes,
        newLightVotes: counts.new_light,
        uselessVotes: counts.useless,
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
