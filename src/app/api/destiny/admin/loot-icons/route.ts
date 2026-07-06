import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth/verifyAuth'
import { destinyStaffHandler } from '@/lib/destiny/apiHandler'
import { logAdminActivity } from '@/lib/destiny/adminActivityLog'
import { invalidateOverviewCache } from '@/lib/destiny/overviewCache'
import { getWeeklyResetState } from '@/lib/destiny/weeklyRotation'
import {
  getWeeklyLootIconsStatus,
  rebuildWeeklyLootIcons,
} from '@/lib/destiny/weeklyLootIcons'

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
    const status = await getWeeklyLootIconsStatus(state.weekStart)
    return NextResponse.json({
      ...status,
      weekLabel: state.weekLabel,
      featuredActivities: featuredActivityNames(),
    })
  })
}

export async function POST(req: NextRequest) {
  return destinyStaffHandler(req, async () => {
    const authUser = await verifyAuth(req)
    const actorId = authUser.username.toLowerCase()
    const body = (await req.json().catch(() => ({}))) as { action?: string }

    if (body.action !== 'rebuild') {
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }

    const state = getWeeklyResetState()
    const activityNames = featuredActivityNames()
    const { builtAt } = await rebuildWeeklyLootIcons(state.weekStart, state.resetAt, activityNames)
    invalidateOverviewCache()

    const status = await getWeeklyLootIconsStatus(state.weekStart)

    await logAdminActivity({
      kind: 'loot_icons_rebuild',
      actorId,
      actorLabel: authUser.displayName,
      summary: `Rebuilt weekly loot icons for ${state.weekLabel}`,
      metadata: {
        weekStart: state.weekStart,
        activityCount: status.activityCount,
        dropCount: status.dropCount,
        missingIconCount: status.missingIconCount,
      },
    })

    return NextResponse.json({
      ok: true,
      message: 'Weekly loot icons rebuilt.',
      builtAt,
      ...status,
      weekLabel: state.weekLabel,
      featuredActivities: activityNames,
    })
  })
}
