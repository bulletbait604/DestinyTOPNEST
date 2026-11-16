import { NextResponse } from 'next/server'
import { getCachedSeasonShared } from '@/lib/destiny/dataCache'
import { PRESEASON_NAME, resolveActiveSeasonByDate } from '@/lib/destiny/seasonCatalog'
import { getLastSeasonArchive } from '@/lib/destiny/store'

export const dynamic = 'force-dynamic'

/** Public season Hall of Fame: top three on each prize board, plus the archived previous window. */
export async function GET() {
  try {
    const shared = await getCachedSeasonShared()
    const last = await getLastSeasonArchive()
    return NextResponse.json({
      season: shared.season,
      hallOfFame: shared.hallOfFame,
      eligibility: shared.eligibility,
      lastSeason: last
        ? {
            id: last.id,
            name: last.name || PRESEASON_NAME,
            seasonNumber: last.seasonNumber ?? 0,
            winners: last.winners ?? [],
            frozen: Boolean(last.standingsFrozenAt),
          }
        : null,
    })
  } catch (error) {
    console.warn('[hall] live standings unavailable', error)
    const season = resolveActiveSeasonByDate()
    return NextResponse.json({
      season,
      hallOfFame: [],
      lastSeason: null,
      eligibility:
        'The Hall lists the top three on the Raid, Dungeon, and New friends boards. Names show up after verified clears are scored.',
    })
  }
}
