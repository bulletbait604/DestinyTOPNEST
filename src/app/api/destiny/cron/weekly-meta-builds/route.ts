import { NextRequest, NextResponse } from 'next/server'
import { cronSecret } from '@/lib/destiny/env'
import { runWeeklyMetaBuildSync } from '@/lib/destiny/metaBuildWeeklySync'
import { getWeeklyResetState } from '@/lib/destiny/weeklyRotation'

export const dynamic = 'force-dynamic'

/**
 * Vercel cron — runs after weekly reset (Tuesday 17:30 UTC).
 * Set CRON_SECRET in env and configure Authorization: Bearer <CRON_SECRET>.
 */
export async function GET(req: NextRequest) {
  const secret = cronSecret()
  const auth = req.headers.get('authorization')
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const state = getWeeklyResetState()
  const featuredActivities = [
    ...state.featuredRaids.map((r) => r.name),
    ...state.featuredDungeons.map((d) => d.name),
  ]

  try {
    const result = await runWeeklyMetaBuildSync({
      weekStart: state.weekStart,
      resetAt: state.resetAt,
      featuredActivities,
    })
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Weekly meta build sync failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
