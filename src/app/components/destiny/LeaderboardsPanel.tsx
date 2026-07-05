'use client'

import { useCallback, useEffect, useState } from 'react'
import type { LeaderboardCategory, LeaderboardEntry, LeaderboardPeriod } from '@/lib/destiny/types'
import {
  GlassCard,
  LeaderboardTable,
  LoadingBlock,
  SegmentedControl,
} from '@/app/components/destiny/DestinyUi'
import { getDestinyTheme } from '@/app/components/destiny/destinyTheme'
import SeasonSection from '@/app/components/destiny/SeasonSection'
import { cn } from '@/lib/utils'

const PERIODS: { value: LeaderboardPeriod; label: string }[] = [
  { value: 'weekly', label: 'This week' },
  { value: 'monthly', label: 'This month' },
  { value: 'season', label: 'Season' },
  { value: 'all_time', label: 'All time' },
]

const CATEGORIES: { value: LeaderboardCategory; label: string }[] = [
  { value: 'raid', label: 'Raids' },
  { value: 'dungeon', label: 'Dungeons' },
  { value: 'top_guardians', label: 'Top Guardians' },
]

export default function LeaderboardsPanel({ darkMode }: { darkMode: boolean }) {
  const [period, setPeriod] = useState<LeaderboardPeriod>('season')
  const [category, setCategory] = useState<LeaderboardCategory>('raid')
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const t = getDestinyTheme(darkMode)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ period, category })
      const res = await fetch(`/api/destiny/leaderboards?${params}`, { credentials: 'include' })
      if (res.ok) {
        const json = await res.json()
        setEntries(json.entries ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [period, category])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (category === 'top_guardians' && period === 'season') {
      setPeriod('monthly')
    }
  }, [category, period])

  return (
    <div className="space-y-6">
      {category === 'top_guardians' && period === 'monthly' && entries.length > 0 ? (
        <GlassCard darkMode={darkMode} padding="compact">
          <p className={cn('text-xs uppercase tracking-wide mb-2', t.gold)}>Monthly Commanders (top 3)</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {entries.slice(0, 3).map((entry) => (
              <div key={entry.userId} className="d2-panel-inset rounded-lg px-3 py-2 text-center">
                <p className={cn('text-[10px] uppercase tracking-wide', t.caption)}>#{entry.rank} Commander</p>
                <p className={cn('text-sm font-bold truncate', t.heading)}>{entry.bungieDisplayName}</p>
                <p className={cn('text-xs tabular-nums', t.gold)}>{entry.points} pts</p>
              </div>
            ))}
          </div>
        </GlassCard>
      ) : null}

      <GlassCard darkMode={darkMode}>
        <div className="space-y-5 mb-6">
          <SegmentedControl
            label="Time period"
            options={PERIODS.filter((p) => category !== 'top_guardians' || p.value !== 'weekly')}
            value={period}
            onChange={setPeriod}
            darkMode={darkMode}
          />
          <SegmentedControl
            label="Category"
            options={CATEGORIES}
            value={category}
            onChange={setCategory}
            darkMode={darkMode}
          />
        </div>

        {loading ? (
          <LoadingBlock darkMode={darkMode} label="Loading rankings…" />
        ) : (
          <LeaderboardTable entries={entries} darkMode={darkMode} />
        )}
      </GlassCard>

      <SeasonSection darkMode={darkMode} />
    </div>
  )
}
