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

    const [clan, social] = await Promise.all([
      fetchLiveClan(stored),
      fetchSocialPresence(stored).catch(() => ({
        onlineClanMembers: [],
        onlineFriends: [],
        activeLobby: null,
        bungieFireteamId: null,
      })),
    ])
    if (!clan) {
      return NextResponse.json({
        clan: null,
        message: 'No clan found for your linked Bungie account.',
        ...social,
      })
    }

    const enriched = await enrichClan({
      ...clan,
      onlineMembers: social.onlineClanMembers.length
        ? social.onlineClanMembers
        : clan.onlineMembers,
    })

    return NextResponse.json({
      clan: enriched,
      onlineFriends: social.onlineFriends,
      activeLobby: social.activeLobby,
      bungieFireteamId: social.bungieFireteamId,
    })
  })
}
