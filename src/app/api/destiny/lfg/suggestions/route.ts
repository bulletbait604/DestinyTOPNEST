import { NextRequest, NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'
import { getMongoDbName } from '@/lib/database'
import { verifyAuth } from '@/lib/auth/verifyAuth'
import { destinyAuthHandler } from '@/lib/destiny/apiHandler'
import { DESTINY_COLLECTIONS } from '@/lib/destiny/collections'
import { bondedMembershipIds } from '@/lib/destiny/bondStore'
import { getDestinyUserBySiteUserId } from '@/lib/destiny/destinyUserStore'
import { listOpenLobbies } from '@/lib/destiny/fireteamLobbyService'
import { pickNewFriendCandidates, rankLobbiesForNewBonds } from '@/lib/destiny/lfgSuggestions'

export const dynamic = 'force-dynamic'

/** LFG discovery tuned for New Bonds: open rooms full of strangers + recently active unbonded players. */
export async function GET(req: NextRequest) {
  return destinyAuthHandler(req, async () => {
    const authUser = await verifyAuth(req)
    const userId = authUser.username.toLowerCase()
    const me = await getDestinyUserBySiteUserId(userId)
    const myMembership = me?.bungieMembershipId ?? ''
    const bonded = await bondedMembershipIds(myMembership)

    const db = (await clientPromise).db(getMongoDbName())
    const since = new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString()
    const recent = (await db
      .collection(DESTINY_COLLECTIONS.users)
      .find({ updatedAt: { $gte: since }, bungieMembershipId: { $nin: ['', null] } })
      .project({ userId: 1, bungieMembershipId: 1, bungieDisplayName: 1, updatedAt: 1 })
      .limit(300)
      .toArray()) as unknown as { userId: string; bungieMembershipId: string; bungieDisplayName: string; updatedAt?: string }[]

    const siteIdByMembership = new Map(recent.map((r) => [r.bungieMembershipId, r.userId]))
    const bondedSiteIds = new Set(Array.from(bonded).map((m) => siteIdByMembership.get(m)).filter((x): x is string => Boolean(x)))

    const lobbies = await listOpenLobbies().catch(() => [])
    return NextResponse.json({
      lobbies: rankLobbiesForNewBonds(lobbies, userId, bondedSiteIds).slice(0, 10),
      players: pickNewFriendCandidates(recent, myMembership, bonded),
      bondedCount: bonded.size,
    })
  })
}
