'use client'

import { useEffect, useMemo, useState } from 'react'
import { filterLeaderboardEntries } from '@/lib/destiny/boardFilters'
import { NextStep } from '@/app/components/hub/clarity'
import { PageHeader } from '@/app/components/hub/PageHeader'
import type { LeaderboardCategory, LeaderboardEntry, LeaderboardPeriod } from '@/lib/destiny/types'
import { OVERVIEW_REFRESH_EVENT } from '@/lib/destiny/syncEvents'
import { navigateDestinyTab, navigateGuardianSearch } from '@/lib/routing/tabUrl'
import { RateButton } from '@/app/components/hub/QuickRate'

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

  useEffect(() => {
    const onRefresh = () => setReload((value) => value + 1)
    window.addEventListener(OVERVIEW_REFRESH_EVENT, onRefresh)
    return () => window.removeEventListener(OVERVIEW_REFRESH_EVENT, onRefresh)
  }, [])

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
        titleId="gh-boards-title"
      />

      <div className="gh-segments">
        <div className="gh-tabs" role="tablist" aria-label="Leaderboard">
          {CATEGORIES.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={category === item.id}
              className="gh-tab"
              onClick={() => setCategory(item.id)}
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
          body="A verified clear from the start of the activity shows up here."
          actions={[
            { label: 'Find people', onClick: () => navigateDestinyTab('guardians') },
            { label: 'Read prize rules', onClick: () => navigateDestinyTab('season') },
          ]}
        />
      ) : null}
      {visible.length > 0 ? (
        <ol className="gh-board">
          {visible.map((entry) => (
            <li key={`${entry.userId}-${entry.rank}`}>
              <div className="gh-board-row">
                <button type="button" className="gh-board-main" onClick={() => navigateGuardianSearch(entry.bungieDisplayName)}>
                  <span className="gh-rank">#{entry.rank}</span>
                  <span>
                    <strong>{entry.bungieDisplayName}</strong>
                    <small>
                      {entry.platform}
                      {entry.clanTag ? ` · [${entry.clanTag}]` : ''}
                      {entry.fastestActivityName ? ` · ${entry.fastestActivityName}` : ''}
                    </small>
                  </span>
                  <span className="gh-points">
                    {entry.points} pts
                    <small>{entry.verifiedClears} clears</small>
                  </span>
                </button>
                {entry.isSquadEntry ? null : (
                  <RateButton
                    membershipId={entry.bungieMembershipId}
                    displayName={entry.bungieDisplayName}
                    mvpVotes={entry.mvpVotes}
                    newLightVotes={entry.newLightVotes}
                    uselessVotes={entry.uselessVotes}
                  />
                )}
              </div>
            </li>
          ))}
        </ol>
      ) : null}

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
