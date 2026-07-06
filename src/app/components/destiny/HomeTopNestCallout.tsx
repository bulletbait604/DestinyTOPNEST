'use client'

import { useCallback, useEffect, useState } from 'react'
import type { LeaderboardEntry } from '@/lib/destiny/types'
import { ItemIcon } from '@/app/components/destiny/DestinyUi'
import { getDestinyTheme } from '@/app/components/destiny/destinyTheme'
import { cn } from '@/lib/utils'

const RANK_LABELS = ['1st', '2nd', '3rd'] as const

function monthLabel(): string {
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date())
}

/** Top 3 monthly Commanders — sits between the home hero and player card. */
export default function HomeTopNestCallout({ darkMode }: { darkMode: boolean }) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const t = getDestinyTheme(darkMode)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/destiny/overview', { credentials: 'include' })
      if (!res.ok) return
      const json = await res.json()
      setEntries((json.guardiansTop3 ?? json.clanTop5 ?? []).slice(0, 3))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <section className="tn-topnest-callout" aria-labelledby="topnest-callout-heading">
      <div className="tn-topnest-callout-inner">
        <div className="tn-topnest-callout-heading">
          <p className="tn-topnest-callout-eyebrow" id="topnest-callout-heading">
            ARE YOU TOPNEST?
          </p>
          <h2 className="tn-topnest-callout-title">TOP NEST</h2>
          <p className={cn('tn-topnest-callout-sub', t.muted)}>{monthLabel()} so far</p>
        </div>

        {loading ? (
          <p className={cn('tn-topnest-callout-empty', t.muted)}>Loading monthly leaders…</p>
        ) : entries.length === 0 ? (
          <p className={cn('tn-topnest-callout-empty', t.muted)}>
            No monthly leaders yet — sync your Bungie runs and climb the board.
          </p>
        ) : (
          <ol className="tn-topnest-callout-list">
            {entries.map((entry, index) => (
              <li key={entry.userId} className={cn('tn-topnest-callout-card', index === 0 && 'tn-topnest-callout-card-first')}>
                <span className="tn-topnest-callout-rank">{RANK_LABELS[index] ?? `#${entry.rank}`}</span>
                {entry.emblemUrl ? (
                  <ItemIcon iconUrl={entry.emblemUrl} name={entry.bungieDisplayName} size={44} />
                ) : (
                  <div className="tn-topnest-callout-emblem-fallback" aria-hidden />
                )}
                <div className="tn-topnest-callout-meta min-w-0">
                  <p className={cn('tn-topnest-callout-name truncate', t.heading)}>{entry.bungieDisplayName}</p>
                  {entry.clanTag ? (
                    <p className={cn('tn-topnest-callout-clan truncate', t.muted)}>{entry.clanTag}</p>
                  ) : null}
                </div>
                <div className="tn-topnest-callout-points">
                  <span className="tn-topnest-callout-points-value">{entry.points}</span>
                  <span className={cn('tn-topnest-callout-points-label', t.caption)}>pts</span>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  )
}
