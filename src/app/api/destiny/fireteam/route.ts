import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth/verifyAuth'
import { destinyAuthHandler } from '@/lib/destiny/apiHandler'
import { enrichLobbies } from '@/lib/destiny/enrich'
import { getDestinyUserBySiteUserId } from '@/lib/destiny/destinyUserStore'
import {
  createFlierTeamRoom,
  getUserActiveLobby,
  listOpenLobbies,
} from '@/lib/destiny/fireteamLobbyService'
import type { FlierTeamActivityKind } from '@/lib/destiny/flierTeamActivities'
import type { FlierTeamRequirementSelection } from '@/lib/destiny/flierTeamRequirements'
import type { FireteamGoal, DestinyPlatform } from '@/lib/destiny/types'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  return destinyAuthHandler(req, async () => {
    const authUser = await verifyAuth(req)
    const userId = authUser.username.toLowerCase()
    const lobbies = await enrichLobbies(await listOpenLobbies())
    const myRoom = await getUserActiveLobby(userId)
    return NextResponse.json({ lobbies, myRoom })
  })
}

interface CreateBody {
  activityKind?: FlierTeamActivityKind
  activityId?: string
  encounterId?: string
  joinMode?: 'instant' | 'apply'
  requirementSelections?: FlierTeamRequirementSelection[]
  customRequirements?: string
  roomNotes?: string
  goal?: FireteamGoal
  platform?: string
  micRequired?: boolean
}

export async function POST(req: NextRequest) {
  return destinyAuthHandler(req, async () => {
    const authUser = await verifyAuth(req)
    const userId = authUser.username.toLowerCase()
    const stored = await getDestinyUserBySiteUserId(userId)

    if (!stored?.oauth) {
      return NextResponse.json({ error: 'Reconnect Bungie to create a FlierTeam room.' }, { status: 401 })
    }

    const body = (await req.json().catch(() => ({}))) as CreateBody
    const activityKind = body.activityKind
    if (!activityKind || !['raid', 'dungeon', 'pantheon'].includes(activityKind)) {
      return NextResponse.json({ error: 'Select Raid, Dungeon, or Pantheon.' }, { status: 400 })
    }
    if (!body.activityId || !body.encounterId) {
      return NextResponse.json({ error: 'Activity and encounter required.' }, { status: 400 })
    }

    const result = await createFlierTeamRoom({
      host: stored,
      activityKind,
      activityId: body.activityId,
      encounterId: body.encounterId,
      joinMode: body.joinMode === 'apply' ? 'apply' : 'instant',
      requirementSelections: body.requirementSelections ?? [],
      customRequirements: body.customRequirements,
      roomNotes: body.roomNotes,
      goal: body.goal,
      platform:
        (body.platform as DestinyPlatform | 'crossplay' | undefined) ??
        stored.platform ??
        'crossplay',
      micRequired: body.micRequired,
    })

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    const [enriched] = await enrichLobbies([result.lobby])
    return NextResponse.json({ lobby: enriched })
  })
}
