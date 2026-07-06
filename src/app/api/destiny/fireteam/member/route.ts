import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth/verifyAuth'
import { destinyAuthHandler } from '@/lib/destiny/apiHandler'
import { getLobbyById, flierTeamRoomMembers } from '@/lib/destiny/fireteamLobbyService'
import { buildUserProfile } from '@/lib/destiny/profileService'

export const dynamic = 'force-dynamic'

function canViewMemberInLobby(
  lobby: NonNullable<Awaited<ReturnType<typeof getLobbyById>>>,
  memberUserId: string
): boolean {
  const members = flierTeamRoomMembers(lobby)
  if (members.some((m) => m.userId === memberUserId)) return true
  return (lobby.pendingApplications ?? []).some((a) => a.userId === memberUserId)
}

/** Guardian build card for FlierTeam room members and applicants. */
export async function GET(req: NextRequest) {
  return destinyAuthHandler(req, async () => {
    await verifyAuth(req)
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

    if (!canViewMemberInLobby(lobby, memberUserId)) {
      return NextResponse.json({ error: 'Guardian is not in this room.' }, { status: 404 })
    }

    const result = await buildUserProfile(memberUserId, 'full')
    return NextResponse.json(result)
  })
}
