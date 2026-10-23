import { NextRequest, NextResponse } from 'next/server'
import { getCachedLeaderboardPayload } from '@/lib/destiny/dataCache'
import { scheduleScoringHistoryBackfill } from '@/lib/destiny/historyBackfill'
import { isActiveLeaderboardCategory } from '@/lib/destiny/leaderboards'
import { cacheControlUntilWeeklyReset } from '@/lib/destiny/weeklyRotation'
import type { LeaderboardPeriod } from '@/lib/destiny/types'

export const dynamic = 'force-dynamic'

const PERIODS = new Set<LeaderboardPeriod>(['weekly', 'monthly', 'season', 'all_time'])

/** Public Raid, Dungeon, and New Bonds boards. No Pantheon or Commander categories. */
export async function GET(req: NextRequest) {
  const requested = req.nextUrl.searchParams.get('category') || 'raid'
  if (!isActiveLeaderboardCategory(requested)) {
    return NextResponse.json({ error: 'Unknown leaderboard category' }, { status: 400 })
  }
  const periodRaw = req.nextUrl.searchParams.get('period') || 'season'
  if (!PERIODS.has(periodRaw as LeaderboardPeriod)) {
    return NextResponse.json({ error: 'Unknown leaderboard period' }, { status: 400 })
  }
  const period = periodRaw as LeaderboardPeriod
  scheduleScoringHistoryBackfill()
  const payload = await getCachedLeaderboardPayload(requested, period)
  const res = NextResponse.json(payload)
  res.headers.set(
    'Cache-Control',
    cacheControlUntilWeeklyReset(new Date(), {
      scope: 'public',
      maxAge: 45,
      staleWhileRevalidate: period === 'weekly' ? 0 : 120,
    })
  )
  return res
}
