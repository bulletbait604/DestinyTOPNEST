import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth/verifyAuth'
import { destinyAuthHandler } from '@/lib/destiny/apiHandler'
import { getDestinyUserBySiteUserId, getDestinyUserByBungieMembershipId } from '@/lib/destiny/destinyUserStore'
import { resolveActivityRef } from '@/lib/destiny/manifest'
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
  return Promise.all(
    runs.map(async (run) => ({
      ...run,
      activityRef: run.activityRef ?? (await resolveActivityRef(run.activityName)),
    }))
  )
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
      const reviewableRuns = buildReviewableRuns(
        userId,
        stored?.bungieMembershipId,
        runs,
        usersByMembershipMap(Array.from(usersById.values())),
        trustByReviewer
      )
      return NextResponse.json({ reviewableRuns })
    }

    if (scope === 'written') {
      const written = await getTrustReviewsByReviewer(userId)
      return NextResponse.json({ reviews: written })
    }

    const reviews = await getTrustReviewsForUser(target)
    const trustRank = computeTrustRank(reviews)

    if (target === userId) {
      return NextResponse.json({ trustRank, userId: target })
    }

    return NextResponse.json({
      trustRank,
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

    let reviewedUserId = body.reviewedUserId?.toLowerCase()
    if (!reviewedUserId && body.reviewedBungieMembershipId) {
      const linked = await getDestinyUserByBungieMembershipId(body.reviewedBungieMembershipId)
      reviewedUserId = linked?.userId
    }

    if (!reviewedUserId) {
      return NextResponse.json(
        { error: 'reviewedUserId required — rando must be linked on Top Nest' },
        { status: 400 }
      )
    }
    if (reviewedUserId === reviewerId) {
      return NextResponse.json({ error: 'Cannot rank yourself' }, { status: 400 })
    }
    if (!body.runId) {
      return NextResponse.json({ error: 'runId required' }, { status: 400 })
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
      reviewedUserId,
      body.runId,
      runs,
      usersByMembershipMap(Array.from(usersById.values()))
    )
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const existing = await findTrustReview(reviewerId, reviewedUserId, body.runId)
    if (existing) {
      return NextResponse.json({ error: 'You already ranked this player for this run' }, { status: 409 })
    }

    const compositeScore = computeCompositeTrustScore(knowledge, vibes)

    const review: TrustReview = {
      id: `trust-${reviewerId}-${reviewedUserId}-${body.runId}`,
      reviewerId,
      reviewedUserId,
      runId: body.runId,
      knowledge,
      vibes,
      compositeScore,
      createdAt: new Date().toISOString(),
    }

    await saveTrustReview(review)
    return NextResponse.json({ ok: true })
  })
}
