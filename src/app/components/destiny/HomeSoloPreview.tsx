'use client'

import { useCallback, useEffect, useState } from 'react'
import type { LeaderboardEntry } from '@/lib/destiny/types'
import { ItemIcon, LeaderboardTable } from '@/app/components/destiny/DestinyUi'
import { soloLeaderboardIconUrl } from '@/lib/destiny/navArt'
import { OVERVIEW_REFRESH_EVENT } from '@/lib/destiny/syncEvents'

/** Solo top-3 preview beside the home hero title. */
export default function HomeSoloPreview({ darkMode }: { darkMode: boolean }) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    try {
      const res = await fetch('/api/destiny/overview', { credentials: 'include' })
      if (!res.ok) return
      const json = await res.json()
      setEntries((json.guardiansTop3 ?? json.clanTop5 ?? []).slice(0, 3))
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

  const top3 = entries.slice(0, 3)

  return (
    <aside className="tn-home-solo-preview tn-home-hero-side-panel">
      <div className="tn-home-solo-header">
        <ItemIcon iconUrl={soloLeaderboardIconUrl()} name="Solo leaderboard" size={22} />
        <p className="tn-home-solo-label">Solo Top 3</p>
      </div>
      {top3.length === 0 ? (
        <p className="tn-home-solo-empty">No entries yet</p>
      ) : (
        <LeaderboardTable entries={top3} darkMode={darkMode} compact heroCompact />
      )}
    </aside>
  )
}
