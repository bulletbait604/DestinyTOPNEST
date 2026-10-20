import { NextResponse } from 'next/server'
import { getCachedSeasonShared } from '@/lib/destiny/dataCache'
import { resolveActiveSeasonByDate } from '@/lib/destiny/seasonCatalog'

export const dynamic = 'force-dynamic'

/** Public season Hall of Fame: top three on each prize board. */
export async function GET() {
  try {
    const shared = await getCachedSeasonShared()
    return NextResponse.json({
      season: shared.season,
      hallOfFame: shared.hallOfFame,
      eligibility: shared.eligibility,
    })
  } catch (error) {
    console.warn('[hall] live standings unavailable', error)
    const season = resolveActiveSeasonByDate()
    return NextResponse.json({
      season,
      hallOfFame: [],
      eligibility:
        'The Hall lists the top three on the Raid, Dungeon, and New friends boards. Names show up after verified clears are scored.',
    })
  }
}
