'use client'

import type { LeaderboardCategory, LeaderboardEntry, LeaderboardPeriod } from '@/lib/destiny/types'
import { LeaderboardTable } from '@/app/components/destiny/DestinyUi'
import { getDestinyTheme } from '@/app/components/destiny/destinyTheme'
import { cn } from '@/lib/utils'

const PERIOD_LABELS: Record<LeaderboardPeriod, string> = {
  weekly: 'Week',
  monthly: 'Month',
  season: 'Season',
  all_time: 'All time',
}

interface Props {
  title: string
  category: LeaderboardCategory
  period: LeaderboardPeriod
  periodOptions: LeaderboardPeriod[]
  onPeriodChange: (period: LeaderboardPeriod) => void
  entries: LeaderboardEntry[]
  loading: boolean
  darkMode: boolean
  footnote?: string
}

/** Wireframe-style leaderboard tile — title bar, period filter, top-10 list. */
export default function LeaderboardGridCard({
  title,
  period,
  periodOptions,
  onPeriodChange,
  entries,
  loading,
  darkMode,
  footnote,
}: Props) {
  const t = getDestinyTheme(darkMode)
  const topTen = entries.slice(0, 10)

  return (
    <article className="tn-lb-wire-card">
      <header className="tn-lb-wire-header">
        <h3 className="tn-lb-wire-title">{title}</h3>
      </header>

      <div className="tn-lb-wire-filter" role="toolbar" aria-label={`${title} time period`}>
        <span className={cn('tn-lb-wire-filter-label', t.caption)}>Period</span>
        <div className="tn-lb-wire-filter-options">
          {periodOptions.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={period === option}
              onClick={() => onPeriodChange(option)}
              className={cn('tn-lb-wire-filter-btn', period === option && 'tn-lb-wire-filter-btn-active')}
            >
              {PERIOD_LABELS[option]}
            </button>
          ))}
        </div>
      </div>

      <div className="tn-lb-wire-body">
        {loading ? (
          <p className={cn('tn-lb-wire-loading', t.muted)}>Loading rankings…</p>
        ) : (
          <>
            {footnote ? <p className={cn('tn-lb-wire-footnote', t.muted)}>{footnote}</p> : null}
            <LeaderboardTable entries={topTen} darkMode={darkMode} compact />
          </>
        )}
      </div>
    </article>
  )
}
