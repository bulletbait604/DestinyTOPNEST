import type { OverviewPayload } from '@/lib/destiny/types'
import { enrichOverview } from '@/lib/destiny/enrich'
import { getOverviewData } from '@/lib/destiny/store'
import { OVERVIEW_CACHE_TTL_MS } from '@/lib/destiny/syncEvents'

export { OVERVIEW_CACHE_TTL_MS } from '@/lib/destiny/syncEvents'

let cache: { payload: OverviewPayload; at: number } | null = null
let inflight: Promise<OverviewPayload> | null = null

export function invalidateOverviewCache(): void {
  cache = null
  inflight = null
}

/** Enriched overview without per-user pendingRunActions — safe to share across requests. */
export async function getCachedEnrichedOverview(): Promise<OverviewPayload> {
  const now = Date.now()
  if (cache && now - cache.at < OVERVIEW_CACHE_TTL_MS) {
    return cache.payload
  }

  if (inflight) return inflight

  inflight = (async () => {
    try {
      const data = await getOverviewData()
      const enriched = await enrichOverview({ ...data, pendingRunActions: null })
      cache = { payload: enriched, at: Date.now() }
      return enriched
    } catch (error) {
      if (cache) {
        console.warn('[overviewCache] refresh failed — serving last good payload', error)
        return cache.payload
      }
      throw error
    } finally {
      inflight = null
    }
  })()

  return inflight
}
