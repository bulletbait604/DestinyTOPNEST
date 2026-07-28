import { NextRequest, NextResponse } from 'next/server'
import { destinyAuthHandler } from '@/lib/destiny/apiHandler'
import { getCachedLeaderboardPayload } from '@/lib/destiny/dataCache'
import type { LeaderboardCategory, LeaderboardPeriod } from '@/lib/destiny/types'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  return destinyAuthHandler(req, async () => {
    const { searchParams } = new URL(req.url)
    const category = (searchParams.get('category') || 'raid') as LeaderboardCategory
    const period = (searchParams.get('period') || 'season') as LeaderboardPeriod
    const payload = await getCachedLeaderboardPayload(category, period)
    const res = NextResponse.json(payload)
    // Shared payload after auth — Data Cache is the main win; private avoids CDN 401 poisoning.
    res.headers.set('Cache-Control', 'private, max-age=45, stale-while-revalidate=120')
    return res
  })
}
