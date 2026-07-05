'use client'

import { useEffect } from 'react'
import type { useBungieLink } from '@/hooks/useBungieLink'
import { SYNC_RECENT_MS } from '@/hooks/useBungieLink'

/** Background Bungie run sync on login and every 5 minutes while linked. */
export function useAutoBungieSync(bungie: ReturnType<typeof useBungieLink>) {
  const syncRuns = bungie.syncRuns

  useEffect(() => {
    if (!bungie.linked || bungie.status?.needsReconnect) return

    const run = () => {
      void syncRuns({ silent: true })
    }

    run()
    const id = window.setInterval(run, SYNC_RECENT_MS)
    return () => window.clearInterval(id)
  }, [bungie.linked, bungie.status?.needsReconnect, syncRuns])
}
