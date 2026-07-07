import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth/verifyAuth'
import { destinyAuthHandler } from '@/lib/destiny/apiHandler'
import { getDestinyUserBySiteUserId, getDestinyUserByBungieMembershipId } from '@/lib/destiny/destinyUserStore'
import { enrichRunsWithActivityRefs } from '@/lib/destiny/enrich'
import {
  buildReviewableRuns,
  buildUnrankedRuns,
  usersByMembershipMap,
  validateReviewSubmission,
} from '@/lib/destiny/fireteamReputation'
import {
  findTrustReview,
  getRunsForParticipant,
  getTrustReviewsByReviewer,
  getTrustReviewsForUser,
  loadUsersMap,
  saveTrustReview,
} from '@/lib/destiny/store'
import {
  clampKnowledge,
  computeCompositeTrustScore,
  computeTrustRank,
  parseVibesLabel,
} from '@/lib/destiny/trustRank'
import type { TrustReview, UnrankedRun } from '@/lib/destiny/types'

export const dynamic = 'force-dynamic'

async function enrichUnrankedRuns(runs: UnrankedRun[]): Promise<UnrankedRun[]> {
  return enrichRunsWithActivityRefs(runs)
}

export async function GET(req: NextRequest) {
  return destinyAuthHandler(req, async () => {
    const authUser = await verifyAuth(req)
    const userId = authUser.username.toLowerCase()
    const { searchParams } = new URL(req.url)
    const scope = searchParams.get('scope')
    const target = (searchParams.get('user') ?? userId).toLowerCase()

    if (scope === 'unranked') {
      const stored = await getDestinyUserBySiteUserId(userId)
      const [runs, usersById, trustByReviewer] = await Promise.all([
        getRunsForParticipant(userId, stored?.bungieMembershipId, 50),
        loadUsersMap(),
        getTrustReviewsByReviewer(userId),
      ])
      const unrankedRuns = await enrichUnrankedRuns(
        buildUnrankedRuns(
          userId,
          stored?.bungieMembershipId,
          runs,
          usersByMembershipMap(Array.from(usersById.values())),
          trustByReviewer
        )
      )
      return NextResponse.json({ unrankedRuns })
    }

    if (scope === 'reviewable') {
      const stored = await getDestinyUserBySiteUserId(userId)
      const [runs, usersById, trustByReviewer] = await Promise.all([
        getRunsForParticipant(userId, stored?.bungieMembershipId, 30),
        loadUsersMap(),
        getTrustReviewsByReviewer(userId),
      ])
      const reviewableRuns = await enrichRunsWithActivityRefs(
        buildReviewableRuns(
          userId,
          stored?.bungieMembershipId,
          runs,
          usersByMembershipMap(Array.from(usersById.values())),
          trustByReviewer
        )
      )
      return NextResponse.json({ reviewableRuns })
    }

    if (scope === 'written') {
      const written = await getTrustReviewsByReviewer(userId)
      return NextResponse.json({ reviews: written })
    }

    const stored = await getDestinyUserBySiteUserId(target)
    const reviews = await getTrustReviewsForUser(target, stored?.bungieMembershipId)
    return NextResponse.json({
      trustRank: computeTrustRank(reviews),
      userId: target,
    })
  })
}

export async function POST(req: NextRequest) {
  return destinyAuthHandler(req, async () => {
    const authUser = await verifyAuth(req)
    const reviewerId = authUser.username.toLowerCase()
    const stored = await getDestinyUserBySiteUserId(reviewerId)
    const body = (await req.json().catch(() => ({}))) as Partial<TrustReview> & {
      reviewedBungieMembershipId?: string
    }

    const reviewedMembershipId =
      body.reviewedMembershipId ?? body.reviewedBungieMembershipId?.trim()
    if (!reviewedMembershipId) {
      return NextResponse.json({ error: 'reviewedMembershipId required' }, { status: 400 })
    }
    if (!body.runId) {
      return NextResponse.json({ error: 'runId required' }, { status: 400 })
    }

    let reviewedUserId = body.reviewedUserId?.toLowerCase()
    if (!reviewedUserId) {
      const linked = await getDestinyUserByBungieMembershipId(reviewedMembershipId)
      reviewedUserId = linked?.userId
    }

    if (reviewedUserId === reviewerId) {
      return NextResponse.json({ error: 'Cannot rank yourself' }, { status: 400 })
    }

    const vibes = parseVibesLabel(body.vibes)
    if (!vibes) {
      return NextResponse.json(
        { error: 'vibes required — quiet, loud, good, ego, or sherpa' },
        { status: 400 }
      )
    }

    const knowledge = clampKnowledge(body.knowledge)

    const [runs, usersById] = await Promise.all([
      getRunsForParticipant(reviewerId, stored?.bungieMembershipId, 50),
      loadUsersMap(),
    ])
    const validation = validateReviewSubmission(
      reviewerId,
      stored?.bungieMembershipId,
      reviewedMembershipId,
      body.runId,
      runs,
      usersByMembershipMap(Array.from(usersById.values()))
    )
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const existing = await findTrustReview(reviewerId, body.runId, reviewedMembershipId)
    if (existing) {
      return NextResponse.json({ error: 'You already ranked this player for this run' }, { status: 409 })
    }

    const compositeScore = computeCompositeTrustScore(knowledge, vibes)

    const review: TrustReview = {
      id: `trust-${reviewerId}-${body.runId}-${reviewedMembershipId}`,
      reviewerId,
      reviewedMembershipId,
      runId: body.runId,
      knowledge,
      vibes,
      compositeScore,
      createdAt: new Date().toISOString(),
    }
    if (reviewedUserId) {
      review.reviewedUserId = reviewedUserId
    }

    await saveTrustReview(review)
    return NextResponse.json({ ok: true })
  })
}
