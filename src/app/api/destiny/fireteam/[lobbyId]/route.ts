import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth/verifyAuth'
import { destinyAuthHandler } from '@/lib/destiny/apiHandler'
import { sendFireteamPlatformInvite } from '@/lib/destiny/bungieClient'
import { getDestinyUserBySiteUserId, getValidAccessToken } from '@/lib/destiny/destinyUserStore'
import { enrichLobbies } from '@/lib/destiny/enrich'
import {
  approveFlierTeamApplication,
  applyToFlierTeamRoom,
  flierTeamRoomMembers,
  getLobbyById,
  isFlierTeamRoomFull,
  joinFlierTeamRoom,
  leaveFlierTeamRoom,
} from '@/lib/destiny/fireteamLobbyService'
import { fetchSocialPresence } from '@/lib/destiny/socialPresence'

export const dynamic = 'force-dynamic'

interface ActionBody {
  action?: 'join' | 'apply' | 'approve' | 'leave' | 'invite-ingame'
  message?: string
  applicantUserId?: string
  bungieFireteamId?: string
}

export async function POST(
  req: NextRequest,
  { params }: { params: { lobbyId: string } }
) {
  return destinyAuthHandler(req, async () => {
    const authUser = await verifyAuth(req)
    const userId = authUser.username.toLowerCase()
    const stored = await getDestinyUserBySiteUserId(userId)
    const lobbyId = params.lobbyId

    if (!stored?.oauth) {
      return NextResponse.json({ error: 'Reconnect Bungie.' }, { status: 401 })
    }

    const body = (await req.json().catch(() => ({}))) as ActionBody
    const action = body.action

    if (action === 'join') {
      const result = await joinFlierTeamRoom(lobbyId, stored)
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
      const [lobby] = await enrichLobbies([result.lobby])
      return NextResponse.json({ lobby })
    }

    if (action === 'apply') {
      const result = await applyToFlierTeamRoom(lobbyId, stored, body.message)
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
      return NextResponse.json({ ok: true })
    }

    if (action === 'approve') {
      if (!body.applicantUserId) {
        return NextResponse.json({ error: 'applicantUserId required' }, { status: 400 })
      }
      const applicant = await getDestinyUserBySiteUserId(body.applicantUserId)
      const result = await approveFlierTeamApplication(
        lobbyId,
        userId,
        body.applicantUserId,
        applicant ?? undefined
      )
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
      const [lobby] = await enrichLobbies([result.lobby])
      return NextResponse.json({ lobby })
    }

    if (action === 'leave') {
      const result = await leaveFlierTeamRoom(lobbyId, userId)
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
      return NextResponse.json({ ok: true })
    }

    if (action === 'invite-ingame') {
      const lobby = await getLobbyById(lobbyId)
      if (!lobby) return NextResponse.json({ error: 'Room not found.' }, { status: 404 })

      const isHost = lobby.hostUserId === userId
      const isMember =
        isHost || lobby.memberRoster?.some((m) => m.userId === userId)
      if (!isMember) {
        return NextResponse.json({ error: 'You must be in this room.' }, { status: 403 })
      }

      if (!isFlierTeamRoomFull(lobby)) {
        return NextResponse.json(
          { error: 'Fill the FlierTeam room in-app before sending in-game invites.' },
          { status: 400 }
        )
      }

      const accessToken = await getValidAccessToken(stored)
      if (!accessToken) {
        return NextResponse.json({ error: 'Bungie session expired.' }, { status: 401 })
      }

      const social = await fetchSocialPresence(stored).catch(() => ({
        bungieFireteamId: null as string | null,
      }))
      const bungieFireteamId = body.bungieFireteamId ?? social.bungieFireteamId
      const clanId = stored.clanId

      if (!clanId || !bungieFireteamId) {
        return NextResponse.json({
          ok: false,
          fallback: true,
          message:
            'Open a Bungie.net fireteam first, then retry. Invite each member from Destiny 2 roster.',
        })
      }

      const members = flierTeamRoomMembers(lobby).filter((m) => m.userId !== userId)
      const results: Array<{ displayName: string; ok: boolean; message?: string }> = []

      for (const member of members) {
        if (!member.bungieMembershipId || member.destinyMembershipType == null) {
          results.push({ displayName: member.displayName, ok: false, message: 'No Bungie link' })
          continue
        }
        const invite = await sendFireteamPlatformInvite(
          clanId,
          bungieFireteamId,
          member.destinyMembershipType,
          member.bungieMembershipId,
          accessToken
        )
        results.push({
          displayName: member.displayName,
          ok: invite.ok,
          message: invite.message,
        })
      }

      const sent = results.filter((r) => r.ok).length
      return NextResponse.json({
        ok: sent > 0,
        sent,
        total: results.length,
        results,
        message:
          sent > 0
            ? `In-game invites sent to ${sent} guardian${sent === 1 ? '' : 's'}. Check Destiny 2.`
            : 'Could not send platform invites. Use Destiny 2 roster to invite manually.',
      })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  })
}

export async function GET(
  req: NextRequest,
  { params }: { params: { lobbyId: string } }
) {
  return destinyAuthHandler(req, async () => {
    const lobby = await getLobbyById(params.lobbyId)
    if (!lobby) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const [enriched] = await enrichLobbies([lobby])
    return NextResponse.json({ lobby: enriched })
  })
}
