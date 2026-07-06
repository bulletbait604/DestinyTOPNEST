import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth/verifyAuth'
import { destinyStaffHandler } from '@/lib/destiny/apiHandler'
import { logAdminActivity } from '@/lib/destiny/adminActivityLog'
import {
  getMetaBuildWeeklySyncStatus,
  rebuildWeeklyMetaBuilds,
} from '@/lib/destiny/metaBuildWeeklySync'
import { getWeeklyResetState } from '@/lib/destiny/weeklyRotation'

export const dynamic = 'force-dynamic'

function featuredActivityNames(): string[] {
  const state = getWeeklyResetState()
  return [
    ...state.featuredRaids.map((r) => r.name),
    ...state.featuredDungeons.map((d) => d.name),
  ]
}

export async function GET(req: NextRequest) {
  return destinyStaffHandler(req, async () => {
    const state = getWeeklyResetState()
    const status = await getMetaBuildWeeklySyncStatus(state.weekStart)
    return NextResponse.json({
      ...status,
      weekLabel: state.weekLabel,
      featuredActivities: featuredActivityNames(),
      resetTimeLabel: state.resetTimeLabel,
    })
  })
}

export async function POST(req: NextRequest) {
  return destinyStaffHandler(req, async () => {
    const authUser = await verifyAuth(req)
    const actorId = authUser.username.toLowerCase()
    const body = (await req.json().catch(() => ({}))) as { action?: string }

    if (body.action !== 'sync') {
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }

    const state = getWeeklyResetState()
    const featuredActivities = featuredActivityNames()
    const result = await rebuildWeeklyMetaBuilds(state.weekStart, state.resetAt, featuredActivities)

    await logAdminActivity({
      kind: 'meta_builds_sync',
      actorId,
      actorLabel: authUser.displayName,
      summary: `Weekly meta build sync for ${state.weekLabel}`,
      metadata: {
        weekStart: state.weekStart,
        buildsRefreshed: result.buildsRefreshed,
        buildsAdded: result.buildsAdded,
        buildCount: result.buildCount,
      },
    })

    return NextResponse.json({
      ...result,
      weekLabel: state.weekLabel,
      featuredActivities,
    })
  })
}
