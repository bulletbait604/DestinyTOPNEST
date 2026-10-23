import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth/verifyAuth'
import { destinyAuthHandler } from '@/lib/destiny/apiHandler'
import { invalidateDestinySharedCaches, CACHE_TAGS } from '@/lib/destiny/dataCache'
import { getDestinyUserBySiteUserId } from '@/lib/destiny/destinyUserStore'
import { usersByMembershipMap } from '@/lib/destiny/fireteamReputation'
import {
  kudosVoteId,
  mvpVoteId,
  parseGuardianVoteType,
  parseMvpVoteCategory,
  quickVoteId,
  resolveVoteTargetMembershipId,
  validateMvpVoteSubmission,
} from '@/lib/destiny/mvpVoting'
import { takeMvpVoteRateLimit } from '@/lib/destiny/mvpVoteRateLimit'
import { ensurePendingPlayerForUnlinkedMember } from '@/lib/destiny/pendingPlayers'
import {
  DuplicateMvpVoteError,
  deleteKudosVote,
  findGuardianVote,
  findMvpVote,
  getRunsForParticipant,
  loadUsersMap,
  saveMvpVote,
} from '@/lib/destiny/store'
import type { MvpVote, MvpVoteCategory } from '@/lib/destiny/types'

export const dynamic = 'force-dynamic'

const VOTE_CACHE_TAGS = [CACHE_TAGS.mvp, CACHE_TAGS.overview, CACHE_TAGS.leaderboards]

export async function POST(req: NextRequest) {
  return destinyAuthHandler(req, async () => {
    const authUser = await verifyAuth(req)
    const voterId = authUser.username.toLowerCase()
    const stored = await getDestinyUserBySiteUserId(voterId)
    const body = (await req.json().catch(() => ({}))) as {
      runId?: string
      membershipId?: string
      selectedMembershipId?: string
      selectedUserId?: string
      category?: string
      action?: string
      voteType?: unknown
    }

    if (body.voteType != null && body.voteType !== '' && parseGuardianVoteType(body.voteType) == null) {
      return NextResponse.json({ error: 'voteType must be mvp, new_light, or useless' }, { status: 400 })
    }
    const voteType = parseGuardianVoteType(body.voteType, 'mvp') ?? 'mvp'

    const runId = body.runId?.trim()
    if (!runId) {
      return NextResponse.json({ error: 'runId is required' }, { status: 400 })
    }

    const category = parseMvpVoteCategory(body.category)
    if (!category) {
      return NextResponse.json({ error: 'category must be mvp or kudos' }, { status: 400 })
    }

    const action = body.action ?? 'set'
    if (action !== 'set' && action !== 'clear') {
      return NextResponse.json({ error: 'action must be set or clear' }, { status: 400 })
    }

    const limited = takeMvpVoteRateLimit({ userId: voterId })
    if (!limited.ok) {
      return NextResponse.json(
        { error: 'Too many votes. Try again shortly.' },
        { status: 429, headers: { 'Retry-After': String(limited.retryAfterSec) } }
      )
    }

    const [runs, usersById, existingMvp] = await Promise.all([
      getRunsForParticipant(voterId, stored?.bungieMembershipId, 50),
      loadUsersMap(),
      category === 'mvp' ? findMvpVote(voterId, runId) : Promise.resolve(null),
    ])
    const usersByMembership = usersByMembershipMap(Array.from(usersById.values()))
    const resolved = resolveVoteTargetMembershipId({
      membershipId: body.membershipId ?? body.selectedMembershipId,
      selectedUserId: body.selectedUserId,
      usersByMembership,
    })
    if (!resolved.ok) {
      return NextResponse.json({ error: resolved.error }, { status: 400 })
    }

    const validation = validateMvpVoteSubmission({
      voterId,
      voterMembershipId: stored?.bungieMembershipId,
      targetMembershipId: resolved.membershipId,
      category,
      action,
      runId,
      runs,
      usersByMembership,
    })
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    if (action === 'clear') {
      await deleteKudosVote(voterId, runId, validation.target.membershipId)
      invalidateDestinySharedCaches(VOTE_CACHE_TAGS)
      return NextResponse.json({
        ok: true,
        vote: null,
        message: `Kudos removed from ${validation.target.displayName}.`,
      })
    }

    if (validation.pending) {
      await ensurePendingPlayerForUnlinkedMember(validation.target)
    }

    const now = new Date().toISOString()
    if (category === 'mvp' && (voteType === 'new_light' || voteType === 'useless')) {
      const already = Boolean(await findGuardianVote(voterId, validation.target.membershipId, voteType))
      if (!already) {
        await saveMvpVote({
          id: quickVoteId(voterId, validation.target.membershipId, voteType),
          runId,
          voterId,
          voterMembershipId: stored?.bungieMembershipId,
          voteType,
          selectedUserId: validation.target.siteUserId,
          selectedMembershipId: validation.target.membershipId,
          selectedDisplayName: validation.target.displayName,
          createdAt: now,
          updatedAt: now,
        })
      }
      const label = voteType === 'new_light' ? 'New Light' : 'Useless'
      invalidateDestinySharedCaches(VOTE_CACHE_TAGS)
      return NextResponse.json({
        ok: true,
        already,
        voteType,
        message: already
          ? `${label} is already saved for ${validation.target.displayName}.`
          : `${label} saved for ${validation.target.displayName}.`,
      })
    }

    const vote: MvpVote = {
      id: category === 'mvp' ? mvpVoteId(voterId, runId) : kudosVoteId(voterId, runId, validation.target.membershipId),
      runId,
      voterId,
      voterMembershipId: stored?.bungieMembershipId,
      category: category satisfies MvpVoteCategory,
      voteType: category === 'mvp' ? 'mvp' : undefined,
      selectedUserId: validation.target.siteUserId,
      selectedMembershipId: validation.target.membershipId,
      selectedDisplayName: validation.target.displayName,
      createdAt: existingMvp?.createdAt ?? now,
      updatedAt: now,
    }

    try {
      await saveMvpVote(vote)
    } catch (error) {
      if (error instanceof DuplicateMvpVoteError) {
        return NextResponse.json({ error: 'You already voted in this category for this activity' }, { status: 409 })
      }
      throw error
    }

    invalidateDestinySharedCaches(VOTE_CACHE_TAGS)
    const changedMvp =
      category === 'mvp' &&
      Boolean(existingMvp?.selectedMembershipId) &&
      existingMvp?.selectedMembershipId !== validation.target.membershipId
    const message =
      category === 'kudos'
        ? `Kudos sent to ${validation.target.displayName}.`
        : changedMvp
          ? `${validation.target.displayName} is now your MVP for this run.`
          : `${validation.target.displayName} is your MVP for this run.`

    return NextResponse.json({ ok: true, vote, message })
  })
}
