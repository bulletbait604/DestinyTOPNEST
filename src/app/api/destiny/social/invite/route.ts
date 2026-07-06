import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth/verifyAuth'
import { destinyAuthHandler } from '@/lib/destiny/apiHandler'
import { sendFireteamPlatformInvite } from '@/lib/destiny/bungieClient'
import { getDestinyUserBySiteUserId, getValidAccessToken } from '@/lib/destiny/destinyUserStore'
import { getUserActiveLobby, inviteToAppLobby } from '@/lib/destiny/fireteamLobbyService'

export const dynamic = 'force-dynamic'

interface InviteBody {
  channel?: 'app' | 'game'
  membershipId?: string
  membershipType?: number
  displayName?: string
  bungieFireteamId?: string
}

export async function POST(req: NextRequest) {
  return destinyAuthHandler(req, async () => {
    const authUser = await verifyAuth(req)
    const userId = authUser.username.toLowerCase()
    const stored = await getDestinyUserBySiteUserId(userId)

    if (!stored?.oauth) {
      return NextResponse.json({ error: 'Reconnect Bungie to send invites.' }, { status: 401 })
    }

    const body = (await req.json().catch(() => ({}))) as InviteBody
    const channel = body.channel === 'game' ? 'game' : 'app'
    const membershipId = body.membershipId?.trim()
    const displayName = body.displayName?.trim() || 'Guardian'

    if (!membershipId) {
      return NextResponse.json({ error: 'membershipId required' }, { status: 400 })
    }

    if (channel === 'app') {
      const activeLobby = await getUserActiveLobby(userId)
      if (!activeLobby) {
        return NextResponse.json(
          { error: 'Join or host an open Top Nest lobby before sending app invites.' },
          { status: 400 }
        )
      }

      const result = await inviteToAppLobby({
        lobbyId: activeLobby.id,
        inviterUserId: userId,
        membershipId,
        membershipType: body.membershipType,
        displayName,
      })

      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 })
      }

      return NextResponse.json({
        ok: true,
        channel: 'app',
        lobbyId: activeLobby.id,
        message: `Invited ${displayName} to your Top Nest lobby (${activeLobby.activityName}).`,
      })
    }

    const accessToken = await getValidAccessToken(stored)
    if (!accessToken) {
      return NextResponse.json({ error: 'Bungie session expired. Reconnect and try again.' }, { status: 401 })
    }

    const clanId = stored.clanId
    const bungieFireteamId = body.bungieFireteamId?.trim()

    if (clanId && bungieFireteamId && body.membershipType != null) {
      const invite = await sendFireteamPlatformInvite(
        clanId,
        bungieFireteamId,
        body.membershipType,
        membershipId,
        accessToken
      )

      if (invite.ok) {
        return NextResponse.json({
          ok: true,
          channel: 'game',
          message: `In-game invite sent to ${displayName}. Check Destiny 2 for the notification.`,
          result: invite.result,
        })
      }
    }

    return NextResponse.json({
      ok: false,
      channel: 'game',
      fallback: true,
      bungieName: displayName,
      message:
        clanId && bungieFireteamId
          ? 'Could not send a platform invite from Bungie. Copy their Bungie name and invite from the Destiny 2 roster.'
          : 'Open a Bungie.net fireteam or be in an in-game fireteam to send platform invites. Copy their Bungie name and invite from Destiny 2.',
    })
  })
}
