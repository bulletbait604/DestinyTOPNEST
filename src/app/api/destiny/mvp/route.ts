import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth/verifyAuth'
import { destinyAuthHandler } from '@/lib/destiny/apiHandler'
import { getDestinyUserBySiteUserId } from '@/lib/destiny/destinyUserStore'
import { usersByMembershipMap } from '@/lib/destiny/fireteamReputation'
import {
  COMMANDER_RANK_LIMIT,
  MVP_SELECTED_POINTS,
  MVP_VOTER_POINTS,
  validateMvpVoteSubmission,
} from '@/lib/destiny/mvpVoting'
import { aggregateGuardianLeaderboard } from '@/lib/destiny/leaderboards'
import {
  findMvpVote,
  getMvpVotesByReviewer,
  getRunsForParticipant,
  getSeasonData,
  loadAllMvpVotes,
  loadUsersMap,
  saveMvpVote,
} from '@/lib/destiny/store'
import type { MvpVote } from '@/lib/destiny/types'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  return destinyAuthHandler(req, async () => {
    const authUser = await verifyAuth(req)
    const userId = authUser.username.toLowerCase()
    const { searchParams } = new URL(req.url)
    const period = searchParams.get('period') === 'season' ? 'season' : 'monthly'

    const [season, usersById, votes, myVotes] = await Promise.all([
      getSeasonData(),
      loadUsersMap(),
      loadAllMvpVotes(),
      getMvpVotesByReviewer(userId),
    ])

    const leaders = aggregateGuardianLeaderboard(votes, usersById, period, season, 10)
    const commanders = leaders.filter((entry) => entry.rank <= COMMANDER_RANK_LIMIT)

    return NextResponse.json({
      leaders,
      commanders,
      period,
      voterPoints: MVP_VOTER_POINTS,
      selectedPoints: MVP_SELECTED_POINTS,
      myVotes,
    })
  })
}

export async function POST(req: NextRequest) {
  return destinyAuthHandler(req, async () => {
    const authUser = await verifyAuth(req)
    const voterId = authUser.username.toLowerCase()
    const stored = await getDestinyUserBySiteUserId(voterId)
    const body = (await req.json().catch(() => ({}))) as { runId?: string; selectedUserId?: string }

    if (!body.runId || !body.selectedUserId) {
      return NextResponse.json({ error: 'runId and selectedUserId are required' }, { status: 400 })
    }

    const selectedUserId = body.selectedUserId.toLowerCase()
    const [runs, usersById, existing] = await Promise.all([
      getRunsForParticipant(voterId, stored?.bungieMembershipId, 50),
      loadUsersMap(),
      findMvpVote(voterId, body.runId),
    ])

    const usersByMembership = usersByMembershipMap(Array.from(usersById.values()))
    const validation = validateMvpVoteSubmission(
      voterId,
      stored?.bungieMembershipId,
      selectedUserId,
      body.runId,
      runs,
      usersByMembership,
      existing
    )

    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const vote: MvpVote = {
      id: `mvp-${voterId}-${body.runId}`,
      runId: body.runId,
      voterId,
      selectedUserId,
      selectedMembershipId: validation.member.membershipId,
      selectedDisplayName: validation.member.displayName,
      createdAt: new Date().toISOString(),
    }

    await saveMvpVote(vote)

    return NextResponse.json({
      ok: true,
      vote,
      message: `${validation.member.displayName} is your MVP for this run.`,
    })
  })
}
