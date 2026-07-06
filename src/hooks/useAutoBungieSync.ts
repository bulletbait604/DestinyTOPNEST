'use client'

import { useEffect, useRef } from 'react'
import type { useBungieLink } from '@/hooks/useBungieLink'
import { SYNC_ACTIVE_MS, SYNC_RECENT_MS } from '@/lib/destiny/syncEvents'

/** Background Bungie run sync — faster polling when no new runs are found yet. */
export function useAutoBungieSync(bungie: ReturnType<typeof useBungieLink>) {
  const syncRuns = bungie.syncRuns
  const syncRunsRef = useRef(syncRuns)
  syncRunsRef.current = syncRuns

  useEffect(() => {
    if (!bungie.linked || bungie.status?.needsReconnect) return

    let cancelled = false
    let timeoutId = 0

    const schedule = (delayMs: number) => {
      window.clearTimeout(timeoutId)
      timeoutId = window.setTimeout(() => void tick(), delayMs)
    }

    const tick = async () => {
      if (cancelled) return
      const result = await syncRunsRef.current({ silent: true })
      if (cancelled) return

      const foundNew = (result.imported ?? 0) > 0
      schedule(foundNew ? SYNC_RECENT_MS : SYNC_ACTIVE_MS)
    }

    void tick()

    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [bungie.linked, bungie.status?.needsReconnect, syncRuns])
}
