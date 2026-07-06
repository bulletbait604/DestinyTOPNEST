import { NextRequest, NextResponse } from 'next/server'
import { destinyAuthHandler } from '@/lib/destiny/apiHandler'
import { enrichLeaderboardEntries } from '@/lib/destiny/enrich'
import { getLeaderboardEntries } from '@/lib/destiny/store'
import type { LeaderboardCategory, LeaderboardPeriod } from '@/lib/destiny/types'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  return destinyAuthHandler(req, async () => {
    const { searchParams } = new URL(req.url)
    const category = (searchParams.get('category') || 'raid') as LeaderboardCategory
    const period = (searchParams.get('period') || 'season') as LeaderboardPeriod
    const entries = await enrichLeaderboardEntries(await getLeaderboardEntries(category, period))
    return NextResponse.json({ entries, category, period })
  })
}
