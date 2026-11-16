'use client'

import { useEffect, useMemo, useState } from 'react'
import { filterLeaderboardEntries } from '@/lib/destiny/boardFilters'
import { NextStep } from '@/app/components/hub/clarity'
import { PageHeader, SeasonBanner } from '@/app/components/hub/PageHeader'
import type { LeaderboardCategory, LeaderboardEntry, LeaderboardPeriod, SeasonWinner } from '@/lib/destiny/types'
import { OVERVIEW_REFRESH_EVENT } from '@/lib/destiny/syncEvents'
import { navigateDestinyTab, navigateGuardianSearch } from '@/lib/routing/tabUrl'
import { RateButton } from '@/app/components/hub/QuickRate'
import { BOARD_BANNER_URL } from '@/lib/destiny/featuredBuilds'

const CATEGORIES: { id: LeaderboardCategory; label: string }[] = [
  { id: 'raid', label: 'Raid' },
  { id: 'dungeon', label: 'Dungeon' },
  { id: 'new_bonds', label: 'New Teammates' },
]

const PERIODS: { id: LeaderboardPeriod; label: string }[] = [
  { id: 'season', label: 'Season' },
  { id: 'all_time', label: 'All-time' },
  { id: 'weekly', label: 'Week' },
  { id: 'monthly', label: 'Month' },
]

function boardFromLocation(): LeaderboardCategory {
  if (typeof window === 'undefined') return 'raid'
  const value = new URLSearchParams(window.location.search).get('category')
  if (value === 'raid' || value === 'dungeon' || value === 'new_bonds') return value
  return 'raid'
}

export default function BoardsHub({ onLogin }: { onLogin?: () => void }) {
  const [category, setCategory] = useState<LeaderboardCategory>('raid')
  const [period, setPeriod] = useState<LeaderboardPeriod>('season')
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [platform, setPlatform] = useState('all')
  const [activity, setActivity] = useState('')
  const [reload, setReload] = useState(0)
  const [lastSeason, setLastSeason] = useState<{ name: string; winners: SeasonWinner[]; frozen: boolean } | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/destiny/hall', { cache: 'no-store' })
      .then(async (response) => (response.ok ? response.json() : null))
      .then((data: { lastSeason?: { name?: string; winners?: SeasonWinner[]; frozen?: boolean } | null } | null) => {
        if (cancelled || !data?.lastSeason) return
        setLastSeason({
          name: data.lastSeason.name || 'Preseason (Oct-Dec 2026)',
          winners: Array.isArray(data.lastSeason.winners) ? data.lastSeason.winners : [],
          frozen: Boolean(data.lastSeason.frozen),
        })
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    setCategory(boardFromLocation())
    const onRefresh = () => setReload((value) => value + 1)
    window.addEventListener(OVERVIEW_REFRESH_EVENT, onRefresh)
    return () => window.removeEventListener(OVERVIEW_REFRESH_EVENT, onRefresh)
  }, [])

  const selectCategory = (next: LeaderboardCategory) => {
    setCategory(next)
    const url = new URL(window.location.href)
    url.searchParams.set('category', next)
    window.history.replaceState(null, '', `${url.pathname}${url.search}`)
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    const params = new URLSearchParams({ category, period })
    fetch(`/api/destiny/leaderboards/public?${params}`, { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Board unavailable')
        return response.json() as Promise<{ entries?: LeaderboardEntry[] }>
      })
      .then((data) => {
        if (!cancelled) setEntries(Array.isArray(data.entries) ? data.entries : [])
      })
      .catch(() => {
        if (!cancelled) setError('The leaderboard could not load. Refresh to try again.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [category, period, reload])

  const visible = useMemo(
    () => filterLeaderboardEntries(entries, { name, platform, activity }),
    [entries, name, platform, activity]
  )

  return (
    <section className="gh-stack" aria-labelledby="gh-boards-title">
      <PageHeader
        title="Leaderboards"
        subtitle="Raid, Dungeon, and New Teammates. Season leaders can win a Destiny 2 3D print."
        explainer="A raid clear is 3, a dungeon clear is 1, and each MVP vote adds 2. Sign in and sync a clear from this window to get on the board."
        titleId="gh-boards-title"
      />
      <SeasonBanner />

      <div className="gh-segments">
        <div className="gh-tabs gh-board-switch" role="tablist" aria-label="Leaderboard">
          {CATEGORIES.map((item) => (
            <button
              key={item.id}
              id={`gh-board-tab-${item.id}`}
              type="button"
              role="tab"
              aria-selected={category === item.id}
              aria-controls="gh-board-panel"
              className="gh-tab"
              onClick={() => selectCategory(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="gh-tabs" role="tablist" aria-label="Time range">
          {PERIODS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={period === item.id}
              className="gh-tab"
              onClick={() => setPeriod(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <details className="gh-disclosure">
        <summary>Filter</summary>
        <form className="gh-filters" onSubmit={(event) => event.preventDefault()}>
          <label>
            Name
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Filter guardians" />
          </label>
          <label>
            Platform
            <select value={platform} onChange={(event) => setPlatform(event.target.value)}>
              <option value="all">All</option>
              <option value="steam">Steam</option>
              <option value="playstation">PlayStation</option>
              <option value="xbox">Xbox</option>
              <option value="epic">Epic</option>
            </select>
          </label>
          <label>
            Fastest activity
            <input
              value={activity}
              onChange={(event) => setActivity(event.target.value)}
              placeholder="Vault, Prophecy…"
            />
          </label>
        </form>
      </details>

      <div id="gh-board-panel" role="tabpanel" aria-labelledby={`gh-board-tab-${category}`}>
      <div
        className="gh-board-art gh-board-art-wide"
        style={{ backgroundImage: `url(${category === 'dungeon' ? BOARD_BANNER_URL.dungeon : category === 'new_bonds' ? BOARD_BANNER_URL.new_bonds : BOARD_BANNER_URL.raid})` }}
      />
      {loading ? <p className="gh-muted">Loading the board…</p> : null}
      {error ? (
        <NextStep
          alert
          title="The board did not load"
          body="Try again in a moment. Raid, Dungeon, and New Teammates are the boards."
          actions={[{ label: 'Try again', onClick: () => setReload((value) => value + 1) }]}
        />
      ) : null}
      {!loading && !error && visible.length === 0 ? (
        <NextStep
          title="No scores on this board yet"
          body="Sync a verified clear from this window. Season 1 starts at 0 on Jan 1. Preseason clears stay archived."
          actions={[
            { label: 'Find people', onClick: () => navigateDestinyTab('guardians') },
            { label: 'Read prize rules', onClick: () => navigateDestinyTab('season') },
          ]}
        />
      ) : null}
      {visible.length > 0 ? (
        <>
        <div className="gh-board-columns" aria-hidden="true">
          <span>Rank</span>
          <span>Guardian</span>
          <span>Score</span>
        </div>
        <ol className="gh-board">
          {visible.map((entry) => {
            const initial = entry.bungieDisplayName.replace(/[^A-Za-z0-9]/g, '').slice(0, 1).toUpperCase() || '?'
            return (
              <li key={`${entry.userId}-${entry.rank}`} className={entry.rank <= 3 ? 'is-podium' : undefined}>
                <div className="gh-board-row">
                  <button type="button" className="gh-board-main" onClick={() => navigateGuardianSearch(entry.bungieDisplayName)}>
                    <span className="gh-rank">{entry.rank}</span>
                    <span
                      className="ios-avatar"
                      aria-hidden
                      style={entry.emblemUrl ? { backgroundImage: `url(${entry.emblemUrl})` } : undefined}
                    >
                      {entry.emblemUrl ? null : initial}
                    </span>
                    <strong>{entry.bungieDisplayName}</strong>
                    <span className="gh-points">{entry.points}</span>
                    <span className="ios-chevron" aria-hidden />
                  </button>
                  {entry.isSquadEntry ? null : (
                    <RateButton
                      membershipId={entry.bungieMembershipId}
                      displayName={entry.bungieDisplayName}
                      mvpVotes={entry.mvpVotes}
                    />
                  )}
                </div>
              </li>
            )
          })}
        </ol>
        </>
      ) : null}
      </div>

      <section className="gh-home-section" aria-labelledby="last-season">
        <h2 id="last-season">Last season</h2>
        <p className="gh-explainer">Preseason (Oct-Dec 2026) standings are saved here on Jan 1. Clears are not deleted.</p>
        {lastSeason?.winners.length ? (
          <ol className="gh-list">
            {lastSeason.winners.map((winner) => (
              <li key={`${winner.category}-${winner.rank}-${winner.displayName}`}>
                <span className="ios-row-copy">
                  <strong>
                    #{winner.rank} {winner.displayName}
                  </strong>
                  <small>
                    {lastSeason.name} · {winner.category.replace(/_/g, ' ')}
                  </small>
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="gh-empty-card">
            {lastSeason?.frozen
              ? `${lastSeason.name} ended with no scored clears.`
              : 'Nothing is archived yet. Season 1 starts Jan 1 and the board starts at 0.'}
          </p>
        )}
      </section>

      <div className="gh-actions">
        <button type="button" className="gh-btn gh-btn-ghost" onClick={() => navigateDestinyTab('season')}>
          Prize rules
        </button>
        {onLogin ? (
          <button type="button" className="gh-btn gh-btn-primary" onClick={onLogin}>
            Sign in so your clears count
          </button>
        ) : null}
      </div>
    </section>
  )
}
