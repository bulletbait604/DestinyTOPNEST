import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth/verifyAuth'
import { destinyAuthHandler } from '@/lib/destiny/apiHandler'
import { enrichClan } from '@/lib/destiny/enrich'
import { getDestinyUserBySiteUserId } from '@/lib/destiny/destinyUserStore'
import { fetchLiveClan } from '@/lib/destiny/liveBungieData'
import { fetchSocialPresence } from '@/lib/destiny/socialPresence'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  return destinyAuthHandler(req, async () => {
    const authUser = await verifyAuth(req)
    const stored = await getDestinyUserBySiteUserId(authUser.username.toLowerCase())

    if (!stored?.oauth) {
      return NextResponse.json({
        clan: null,
        message: 'Reconnect Bungie to view your clan.',
      })
    }

    const clan = await fetchLiveClan(stored)
    const refreshed = (await getDestinyUserBySiteUserId(authUser.username.toLowerCase())) ?? stored
    const social = await fetchSocialPresence(refreshed).catch(() => ({
      onlineClanMembers: [],
      onlineFriends: [],
      activeLobby: null,
      bungieFireteamId: null,
      friendGroups: [],
    }))

    if (!clan) {
      const hint = refreshed.clanName
        ? `Could not refresh ${refreshed.clanTag ? `${refreshed.clanTag} ` : ''}${refreshed.clanName} from Bungie.`
        : 'No clan found for your linked Bungie account.'
      return NextResponse.json({
        clan: null,
        message: hint,
        ...social,
      })
    }

    const enriched = await enrichClan({
      ...clan,
      onlineMembers: social.onlineClanMembers,
    })

    return NextResponse.json({
      clan: enriched,
      onlineFriends: social.onlineFriends,
      activeLobby: social.activeLobby,
      bungieFireteamId: social.bungieFireteamId,
      friendGroups: social.friendGroups ?? [],
    })
  })
}
