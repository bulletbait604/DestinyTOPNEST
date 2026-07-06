import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth/verifyAuth'
import { destinyStaffHandler } from '@/lib/destiny/apiHandler'
import { logAdminActivity } from '@/lib/destiny/adminActivityLog'
import { enrichLobbies } from '@/lib/destiny/enrich'
import {
  clearAllFlierTeamRooms,
  deleteFlierTeamRoomAsAdmin,
  listAllFlierTeamRooms,
} from '@/lib/destiny/fireteamLobbyService'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  return destinyStaffHandler(req, async () => {
    const rooms = await enrichLobbies(await listAllFlierTeamRooms())
    return NextResponse.json({ rooms, count: rooms.length })
  })
}

interface ActionBody {
  action?: 'delete' | 'clear_all'
  lobbyId?: string
}

export async function POST(req: NextRequest) {
  return destinyStaffHandler(req, async () => {
    const authUser = await verifyAuth(req)
    const actorId = authUser.username.toLowerCase()
    const body = (await req.json().catch(() => ({}))) as ActionBody

    if (body.action === 'clear_all') {
      const result = await clearAllFlierTeamRooms()
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 500 })
      }

      await logAdminActivity({
        kind: 'fireteam_rooms_clear',
        actorId,
        actorLabel: authUser.displayName,
        summary: `Cleared all FlierTeam rooms (${result.deletedCount})`,
        metadata: { deletedCount: result.deletedCount },
      })

      return NextResponse.json({
        ok: true,
        deletedCount: result.deletedCount,
        message: `Removed ${result.deletedCount} FlierTeam room${result.deletedCount === 1 ? '' : 's'}.`,
      })
    }

    if (body.action === 'delete') {
      if (!body.lobbyId) {
        return NextResponse.json({ error: 'lobbyId required' }, { status: 400 })
      }

      const result = await deleteFlierTeamRoomAsAdmin(body.lobbyId)
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 })
      }

      await logAdminActivity({
        kind: 'fireteam_room_delete',
        actorId,
        actorLabel: authUser.displayName,
        targetUserId: result.hostUserId,
        summary: `Deleted FlierTeam room ${body.lobbyId}`,
        metadata: { lobbyId: body.lobbyId },
      })

      return NextResponse.json({
        ok: true,
        message: 'Room deleted.',
      })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  })
}
