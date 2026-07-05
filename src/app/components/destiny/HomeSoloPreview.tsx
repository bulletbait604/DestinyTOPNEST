'use client'

import { useCallback, useEffect, useState } from 'react'
import type { LeaderboardEntry } from '@/lib/destiny/types'
import { LeaderboardTable } from '@/app/components/destiny/DestinyUi'

/** Solo leaderboard preview for the home hero aside. */
export default function HomeSoloPreview({ darkMode }: { darkMode: boolean }) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/destiny/overview', { credentials: 'include' })
      if (!res.ok) return
      const json = await res.json()
      setEntries(json.guardiansTop3 ?? json.clanTop5 ?? [])
    } catch {
      setEntries([])
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <aside className="tn-home-solo-preview">
      <p className="tn-home-solo-label">Solo Leaderboard</p>
      <LeaderboardTable entries={entries.slice(0, 3)} darkMode={darkMode} compact />
    </aside>
  )
}
