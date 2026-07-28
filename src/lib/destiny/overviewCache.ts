import { unstable_cache } from 'next/cache'
import type { OverviewPayload } from '@/lib/destiny/types'
import { enrichOverview } from '@/lib/destiny/enrich'
import { getOverviewData } from '@/lib/destiny/store'
import { OVERVIEW_CACHE_TTL_MS } from '@/lib/destiny/syncEvents'
import { CACHE_TAGS, invalidateDestinySharedCaches } from '@/lib/destiny/dataCache'

export { OVERVIEW_CACHE_TTL_MS } from '@/lib/destiny/syncEvents'

const revalidateSeconds = Math.max(1, Math.round(OVERVIEW_CACHE_TTL_MS / 1000))

/** Last-good fallback within a warm instance if Data Cache refresh fails. */
let lastGood: OverviewPayload | null = null

const cachedEnrichedOverview = unstable_cache(
  async (): Promise<OverviewPayload> => {
    const data = await getOverviewData()
    return enrichOverview({ ...data, pendingRunActions: null })
  },
  ['destiny-overview-enriched'],
  { revalidate: revalidateSeconds, tags: [CACHE_TAGS.overview] }
)

export function invalidateOverviewCache(): void {
  lastGood = null
  invalidateDestinySharedCaches([
    CACHE_TAGS.overview,
    CACHE_TAGS.leaderboards,
    CACHE_TAGS.builds,
    CACHE_TAGS.season,
    CACHE_TAGS.mvp,
  ])
}

/** Enriched overview without per-user pendingRunActions — safe to share across requests. */
export async function getCachedEnrichedOverview(): Promise<OverviewPayload> {
  try {
    const payload = await cachedEnrichedOverview()
    lastGood = payload
    return payload
  } catch (error) {
    if (lastGood) {
      console.warn('[overviewCache] refresh failed — serving last good payload', error)
      return lastGood
    }
    throw error
  }
}
