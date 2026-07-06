import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth/verifyAuth'
import { destinyAuthHandler } from '@/lib/destiny/apiHandler'
import { getDestinyUserBySiteUserId } from '@/lib/destiny/destinyUserStore'
import { buildActivityRunsForVote } from '@/lib/destiny/mvpVoting'
import { enrichActivityRunsForVote } from '@/lib/destiny/enrich'
import {
  getMvpVotesByReviewer,
  getRunsForParticipant,
  loadUsersMap,
} from '@/lib/destiny/store'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  return destinyAuthHandler(req, async () => {
    const authUser = await verifyAuth(req)
    const userId = authUser.username.toLowerCase()
    const stored = await getDestinyUserBySiteUserId(userId)

    const [runs, usersById, votes] = await Promise.all([
      getRunsForParticipant(userId, stored?.bungieMembershipId, 50),
      loadUsersMap(),
      getMvpVotesByReviewer(userId),
    ])

    const votesByRun = new Map(votes.map((vote) => [vote.runId, vote]))
    const activities = await enrichActivityRunsForVote(
      buildActivityRunsForVote(
        userId,
        stored?.bungieMembershipId,
        runs,
        Array.from(usersById.values()),
        votesByRun
      )
    )

    return NextResponse.json({ activities })
  })
}
