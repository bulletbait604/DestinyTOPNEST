import { NextRequest, NextResponse } from 'next/server'
import { destinyAuthHandler } from '@/lib/destiny/apiHandler'
import { getCachedLeaderboardPayload } from '@/lib/destiny/dataCache'
import { isActiveLeaderboardCategory } from '@/lib/destiny/leaderboards'
import { cacheControlUntilWeeklyReset } from '@/lib/destiny/weeklyRotation'
import type { LeaderboardCategory, LeaderboardPeriod } from '@/lib/destiny/types'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  return destinyAuthHandler(req, async () => {
    const { searchParams } = new URL(req.url)
    const requested = searchParams.get('category') || 'raid'
    if (!isActiveLeaderboardCategory(requested)) {
      return NextResponse.json({ error: 'Unknown leaderboard category' }, { status: 400 })
    }
    const category = requested satisfies LeaderboardCategory
    const period = (searchParams.get('period') || 'season') as LeaderboardPeriod
    const payload = await getCachedLeaderboardPayload(category, period)
    const res = NextResponse.json(payload)
    // Shared payload after auth — Data Cache is the main win; private avoids CDN 401 poisoning.
    res.headers.set(
      'Cache-Control',
      cacheControlUntilWeeklyReset(new Date(), {
        scope: 'private',
        maxAge: 45,
        staleWhileRevalidate: period === 'weekly' ? 0 : 120,
      })
    )
    return res
  })
}
