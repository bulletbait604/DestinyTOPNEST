import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth/verifyAuth'
import { destinyAuthHandler } from '@/lib/destiny/apiHandler'
import { getCachedSeasonShared } from '@/lib/destiny/dataCache'
import { prizeEligibleTracks } from '@/lib/destiny/fireteamReputation'
import { buildUserPrizeTrack } from '@/lib/destiny/seasonPrizes'
import { getDestinyUserBySiteUserId } from '@/lib/destiny/destinyUserStore'
import { getPrizeClaimsForUser, getSeasonStandingForUser } from '@/lib/destiny/store'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  return destinyAuthHandler(req, async () => {
    const authUser = await verifyAuth(req)
    const siteUserId = authUser.username.toLowerCase()

    const [shared, myStandings, stored] = await Promise.all([
      getCachedSeasonShared(),
      getSeasonStandingForUser(siteUserId),
      getDestinyUserBySiteUserId(siteUserId),
    ])

    const prizeTrack = buildUserPrizeTrack(myStandings, shared.season)
    const prizeClaims = await getPrizeClaimsForUser(siteUserId, shared.season.id)
    const prizeEligible = prizeEligibleTracks(
      prizeTrack,
      shared.season,
      shared.hallOfFame,
      siteUserId
    )

    const res = NextResponse.json({
      season: shared.season,
      countdown: shared.countdown,
      weeklyReset: shared.weeklyReset,
      eligibility: shared.eligibility,
      hallOfFame: shared.hallOfFame,
      myStandings,
      prizeTrack,
      prizeEligible,
      prizeClaims,
      seasonEnded: shared.seasonEnded,
      bungieLinked: Boolean(stored?.oauth),
    })
    // Personalized fields — browser may soft-cache; never CDN-public.
    res.headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=60')
    return res
  })
}
