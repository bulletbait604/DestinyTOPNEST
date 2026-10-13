import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth/verifyAuth'
import { destinyAuthHandler } from '@/lib/destiny/apiHandler'
import { getCachedSeasonShared } from '@/lib/destiny/dataCache'
import { prizeEligibleTracks } from '@/lib/destiny/fireteamReputation'
import { buildUserPrizeTrack } from '@/lib/destiny/seasonPrizes'
import { getDestinyUserBySiteUserId } from '@/lib/destiny/destinyUserStore'
import { seasonPrizesEnabled } from '@/lib/destiny/featureFlags'
import { loadFireteamProgress } from '@/lib/destiny/fireteamProgressService'
import { getPrizeClaimsForUser, getSeasonStandingForUser } from '@/lib/destiny/store'
import { cacheControlUntilWeeklyReset } from '@/lib/destiny/weeklyRotation'

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
    const prizesEnabled = seasonPrizesEnabled()
    const prizeClaims = prizesEnabled ? await getPrizeClaimsForUser(siteUserId, shared.season.id) : []
    const prizeEligible = prizesEnabled
      ? prizeEligibleTracks(prizeTrack, shared.season, shared.hallOfFame, siteUserId)
      : []

    let weeklyContracts = null
    let sherpa = null
    let clanWars = null
    let nightOps = null
    let chemistry = null
    if (stored?.bungieMembershipId) {
      try {
        const progress = await loadFireteamProgress(stored)
        weeklyContracts = progress.weeklyContracts
        sherpa = progress.sherpa
        clanWars = progress.clanWars
        nightOps = progress.nightOps
        chemistry = progress.chemistry
      } catch (err) {
        console.warn('[season] fireteam HQ progress failed', err)
      }
    }

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
      seasonPrizesEnabled: prizesEnabled,
      weeklyContracts,
      sherpa,
      clanWars,
      nightOps,
      chemistry,
    })
    // Personalized fields — browser may soft-cache; never CDN-public.
    res.headers.set(
      'Cache-Control',
      cacheControlUntilWeeklyReset(new Date(), { scope: 'private', maxAge: 30, staleWhileRevalidate: 60 })
    )
    return res
  })
}
