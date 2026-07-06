'use client'

import { useCallback, useEffect, useState } from 'react'
import type { LeaderboardEntry } from '@/lib/destiny/types'
import { LeaderboardTable } from '@/app/components/destiny/DestinyUi'
import { OVERVIEW_REFRESH_EVENT } from '@/lib/destiny/syncEvents'

/** Solo leaderboard preview beside the home hero title. */
export default function HomeSoloPreview({ darkMode }: { darkMode: boolean }) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    try {
      const res = await fetch('/api/destiny/overview', { credentials: 'include' })
      if (!res.ok) return
      const json = await res.json()
      setEntries(json.guardiansTop3 ?? json.clanTop5 ?? [])
    } catch {
      if (!opts?.silent) setEntries([])
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const onRefresh = () => void load({ silent: true })
    window.addEventListener(OVERVIEW_REFRESH_EVENT, onRefresh)
    return () => window.removeEventListener(OVERVIEW_REFRESH_EVENT, onRefresh)
  }, [load])

  return (
    <aside className="tn-home-solo-preview">
      <p className="tn-home-solo-label">Solo Leaderboard</p>
      <LeaderboardTable entries={entries.slice(0, 3)} darkMode={darkMode} compact />
    </aside>
  )
}
