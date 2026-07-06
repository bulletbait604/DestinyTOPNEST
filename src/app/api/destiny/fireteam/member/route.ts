import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth/verifyAuth'
import { destinyAuthHandler } from '@/lib/destiny/apiHandler'
import { getLobbyById, flierTeamRoomMembers } from '@/lib/destiny/fireteamLobbyService'
import { buildUserProfile } from '@/lib/destiny/profileService'

export const dynamic = 'force-dynamic'

/** Guardian build card for FlierTeam room members (lobby members only). */
export async function GET(req: NextRequest) {
  return destinyAuthHandler(req, async () => {
    const authUser = await verifyAuth(req)
    const viewerId = authUser.username.toLowerCase()
    const params = new URL(req.url).searchParams
    const lobbyId = params.get('lobbyId')
    const memberUserId = params.get('userId')

    if (!lobbyId || !memberUserId) {
      return NextResponse.json({ error: 'lobbyId and userId required' }, { status: 400 })
    }

    const lobby = await getLobbyById(lobbyId)
    if (!lobby) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    const members = flierTeamRoomMembers(lobby)
    const viewerInRoom = members.some((m) => m.userId === viewerId)
    if (!viewerInRoom) {
      return NextResponse.json({ error: 'You must be in this room to view member builds.' }, { status: 403 })
    }

    if (!members.some((m) => m.userId === memberUserId)) {
      return NextResponse.json({ error: 'Not a member of this room.' }, { status: 404 })
    }

    const result = await buildUserProfile(memberUserId, 'full')
    return NextResponse.json(result)
  })
}
