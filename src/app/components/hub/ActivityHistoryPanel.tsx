'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useBungieLink } from '@/contexts/BungieLinkContext'
import {
  ACTIVITY_HISTORY_LIMITATIONS,
  activityKindLabel,
  formatClearTime,
  formatKd,
  formatPlayedTime,
  platformDisplay,
  type ActivityHistoryKind,
} from '@/lib/destiny/activityHistoryModel'
import type { ActivitySyncView } from '@/lib/destiny/activityHistorySync'
import type { PgcrPlayerRow } from '@/lib/destiny/activityHistoryPgcr'

interface StatBucket {
  runs: number
  clears: number
  kills: number
  deaths: number
  kd: number
  timePlayedSeconds: number
  fastestClearSeconds: number | null
}

interface TypeGroup extends StatBucket {
  activityType: ActivityHistoryKind
  label: string
}

interface ActivityGroup extends TypeGroup {
  referenceId: number
  activityName: string
  iconUrl?: string
}

interface HistoryRun {
  instanceId: string
  period: string
  activityName: string
  activityType: ActivityHistoryKind
  referenceId: number
  characterKey: string
  kills: number
  deaths: number
  assists: number
  completed: boolean
  durationSeconds: number
  timePlayedSeconds: number
  isPrivate: boolean
  iconUrl?: string
}

interface HistoryPayload {
  sync: ActivitySyncView
  limitations: string[]
  overall: StatBucket
  byType: TypeGroup[]
  byActivity: ActivityGroup[]
  runs: HistoryRun[]
  runsTotal: number
  page: number
  pageSize: number
}

interface PgcrReport {
  instanceId: string
  activityName?: string
  period?: string
  durationSeconds?: number
  startedFromBeginning?: boolean
  entries: PgcrPlayerRow[]
}

interface Filters {
  q: string
  type: string
  activity: string
  character: string
  completed: string
}

const EMPTY_FILTERS: Filters = { q: '', type: '', activity: '', character: '', completed: 'all' }

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function formatWhen(iso: string | undefined): string {
  if (!iso) return 'Unknown date'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'Unknown date'
  return date.toLocaleString()
}

function numberFormat(value: number): string {
  return new Intl.NumberFormat('en-US').format(Math.round(value))
}

function StatGrid({ bucket }: { bucket: StatBucket }) {
  const stats = [
    ['Runs', numberFormat(bucket.runs)],
    ['Clears', numberFormat(bucket.clears)],
    ['Kills', numberFormat(bucket.kills)],
    ['Deaths', numberFormat(bucket.deaths)],
    ['K/D', formatKd(bucket.kills, bucket.deaths)],
    ['Time played', formatPlayedTime(bucket.timePlayedSeconds)],
    ['Fastest clear', formatClearTime(bucket.fastestClearSeconds)],
  ]
  return (
    <dl className="gh-stat-grid">
      {stats.map(([label, value]) => (
        <div key={label} className="gh-stat">
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  )
}

export default function ActivityHistoryPanel() {
  const bungie = useBungieLink()
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [search, setSearch] = useState('')
  const [payload, setPayload] = useState<HistoryPayload | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [pgcr, setPgcr] = useState<PgcrReport | null>(null)
  const [pgcrError, setPgcrError] = useState<string | null>(null)
  const [pgcrLoading, setPgcrLoading] = useState(false)
  const [pgcrId, setPgcrId] = useState<string | null>(null)
  const filtersRef = useRef(filters)
  const pageRef = useRef(0)
  const pumpGeneration = useRef(0)
  filtersRef.current = filters

  const loadHistory = useCallback(async (page: number) => {
    pageRef.current = page
    const current = filtersRef.current
    const params = new URLSearchParams()
    params.set('page', String(page))
    if (current.q) params.set('q', current.q)
    if (current.type) params.set('type', current.type)
    if (current.activity) params.set('activity', current.activity)
    if (current.character) params.set('character', current.character)
    if (current.completed && current.completed !== 'all') params.set('completed', current.completed)
    setLoading(true)
    try {
      const res = await fetch(`/api/destiny/activity-history?${params.toString()}`, {
        credentials: 'include',
      })
      const json = (await res.json().catch(() => ({}))) as HistoryPayload & { error?: string }
      if (!res.ok) {
        setLoadError(json.error || 'Activity history could not be loaded.')
        return
      }
      setPayload(json)
      setLoadError(null)
    } catch {
      setLoadError('Activity history could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [])

  const pump = useCallback(
    async (action: 'start' | 'continue', isCancelled: () => boolean) => {
      const generation = ++pumpGeneration.current
      setSyncing(true)
      setSyncError(null)
      let next = action
      let pauses = 0
      try {
        for (let step = 0; step < 500; step += 1) {
          if (isCancelled() || generation !== pumpGeneration.current) return
          let response: Response
          try {
            response = await fetch('/api/destiny/activity-history/sync', {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: next }),
            })
          } catch {
            setSyncError('The sync request did not finish. Saved runs are still here.')
            return
          }
          const json = (await response.json().catch(() => ({}))) as {
            error?: string
            complete?: boolean
            blocked?: boolean
            paused?: boolean
            retryAfterMs?: number
            authError?: boolean
            sync?: ActivitySyncView
          }
          if (isCancelled() || generation !== pumpGeneration.current) return
          if (!response.ok) {
            setSyncError(json.error || 'Activity sync failed. Saved runs are unchanged.')
            return
          }
          if (json.sync) {
            setPayload((current) => (current ? { ...current, sync: json.sync! } : current))
          }
          if (json.sync?.status === 'error' && !json.paused && !json.blocked) {
            setSyncError(json.sync.error || json.error || 'Activity sync stopped.')
            await loadHistory(pageRef.current)
            return
          }
          if (json.complete) {
            await loadHistory(pageRef.current)
            return
          }
          if (json.authError) {
            setSyncError(json.sync?.error || 'Reconnect Bungie to keep syncing.')
            return
          }
          if (step % 2 === 1) void loadHistory(pageRef.current)
          if (json.paused) {
            pauses += 1
            if (pauses > 6) {
              setSyncError('Bungie is still rate limiting. Progress is saved — use Sync again in a minute.')
              await loadHistory(pageRef.current)
              return
            }
            await sleep(json.retryAfterMs ?? 3000)
            next = 'continue'
            continue
          }
          pauses = 0
          next = 'continue'
          await sleep(json.blocked ? (json.retryAfterMs ?? 1200) : 250)
        }
        setSyncError('Sync is still running. Open this page again to continue from the saved place.')
      } finally {
        if (generation === pumpGeneration.current) setSyncing(false)
      }
    },
    [loadHistory]
  )

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setFilters((current) => (current.q === search.trim() ? current : { ...current, q: search.trim() }))
    }, 300)
    return () => window.clearTimeout(handle)
  }, [search])

  useEffect(() => {
    if (bungie.loading || !bungie.linked || bungie.status?.needsReconnect) return
    let cancelled = false
    void (async () => {
      await loadHistory(0)
      if (!cancelled) await pump('start', () => cancelled)
    })()
    return () => {
      cancelled = true
    }
  }, [bungie.linked, bungie.loading, bungie.status?.needsReconnect, loadHistory, pump])

  const filterKey = `${filters.q}|${filters.type}|${filters.activity}|${filters.character}|${filters.completed}`
  const skipFilterLoad = useRef(true)
  useEffect(() => {
    if (bungie.loading || !bungie.linked || bungie.status?.needsReconnect) return
    if (skipFilterLoad.current) {
      skipFilterLoad.current = false
      return
    }
    void loadHistory(0)
  }, [filterKey, bungie.linked, bungie.loading, bungie.status?.needsReconnect, loadHistory])

  const openRun = async (instanceId: string) => {
    setPgcrId(instanceId)
    setPgcr(null)
    setPgcrError(null)
    setPgcrLoading(true)
    try {
      const res = await fetch(
        `/api/destiny/activity-history/pgcr?instanceId=${encodeURIComponent(instanceId)}`,
        { credentials: 'include' }
      )
      const json = (await res.json().catch(() => ({}))) as { error?: string; report?: PgcrReport }
      if (!res.ok || !json.report) {
        setPgcrError(json.error || 'Bungie did not return a post-game report for this run.')
        return
      }
      setPgcr(json.report)
    } catch {
      setPgcrError('Could not open this post-game report.')
    } finally {
      setPgcrLoading(false)
    }
  }

  if (bungie.loading) {
    return (
      <section className="gh-stack">
        <h1>Activity history</h1>
        <p className="gh-muted">Checking your Bungie link…</p>
      </section>
    )
  }

  if (!bungie.linked || bungie.status?.needsReconnect) {
    return (
      <section className="gh-stack">
        <header>
          <p className="gh-kicker">Your Guardian</p>
          <h1>Activity history</h1>
          <p className="gh-lede">
            Every run Bungie still has for your characters, including older raids and dungeons. Link Bungie to start
            the sync.
          </p>
        </header>
        <div className="gh-card">
          <h2>{bungie.status?.needsReconnect ? 'Reconnect Bungie' : 'Link Bungie'}</h2>
          <p className="gh-muted">
            {bungie.status?.needsReconnect
              ? 'Your Bungie session expired. Reconnect to read activity history.'
              : 'Sign-in created your account. History sync uses your own Bungie login and stays on your account.'}
          </p>
          <button type="button" className="gh-btn gh-btn-primary" onClick={() => bungie.connect()}>
            {bungie.status?.needsReconnect ? 'Reconnect Bungie' : 'Link Bungie'}
          </button>
        </div>
      </section>
    )
  }

  const sync = payload?.sync
  const overall = payload?.overall
  const page = payload?.page ?? 0
  const pageSize = payload?.pageSize ?? 25
  const runsTotal = payload?.runsTotal ?? 0
  const pageCount = Math.max(1, Math.ceil(runsTotal / pageSize))
  const activeCharacter = sync?.characters.find((character) => !character.backfillComplete && !character.unavailableReason)

  return (
    <section className="gh-stack" aria-labelledby="gh-history-title">
      <header className="gh-section-head">
        <div>
          <p className="gh-kicker">Your Guardian</p>
          <h1 id="gh-history-title">Activity history</h1>
          <p className="gh-lede">
            All runs Bungie still records for your current characters, plus totals for deleted characters when the API
            allows them. Repeat visits only ask Bungie for runs that are not saved yet.
          </p>
        </div>
        <button
          type="button"
          className="gh-btn gh-btn-ghost"
          disabled={syncing}
          onClick={() => void pump('start', () => false)}
        >
          {syncing ? 'Syncing…' : 'Sync new runs'}
        </button>
      </header>

      {loadError ? (
        <p className="gh-alert" role="alert">
          {loadError}
        </p>
      ) : null}
      {syncError ? (
        <p className="gh-alert" role="alert">
          {syncError}
        </p>
      ) : null}

      {sync && !sync.complete && (syncing || sync.status === 'running') ? (
        <div className="gh-card" aria-live="polite">
          <h2>Syncing from Bungie</h2>
          <p className="gh-muted">
            {activeCharacter
              ? `${activeCharacter.classLabel} · page ${activeCharacter.pagesFetched + 1}`
              : 'Checking for new runs'}
            {' · '}
            {numberFormat(sync.activitiesStored)} runs saved
          </p>
          <div
            className="gh-progress"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={sync.percent}
            aria-label="Activity history sync progress"
          >
            <span style={{ width: `${sync.percent}%` }} />
          </div>
          <p className="gh-muted">{sync.percent}% · saved progress stays if you leave this page</p>
        </div>
      ) : null}

      {overall ? <StatGrid bucket={overall} /> : null}

      {sync?.characters.some((character) => character.deleted || character.unavailableReason) ? (
        <div className="gh-card">
          <h2>Deleted characters</h2>
          <ul className="gh-plain-list">
            {sync.characters
              .filter((character) => character.deleted || character.unavailableReason)
              .map((character) => (
                <li key={character.key}>
                  {character.classLabel} · {platformDisplay(character.platformLabel)}
                  {character.historical
                    ? ` · ${numberFormat(character.historical.activitiesEntered)} activities entered · K/D ${formatKd(character.historical.kills, character.historical.deaths)} · ${formatPlayedTime(character.historical.secondsPlayed)}`
                    : ''}
                  {character.unavailableReason ? ` · ${character.unavailableReason}` : ''}
                </li>
              ))}
          </ul>
        </div>
      ) : null}

      <div className="gh-filters">
        <label>
          Search
          <input
            className="gh-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Raid, dungeon, strike…"
            type="search"
          />
        </label>
        <label>
          Type
          <select
            className="gh-select"
            value={filters.type}
            onChange={(event) =>
              setFilters((current) => ({ ...current, type: event.target.value, activity: '' }))
            }
          >
            <option value="">All types</option>
            {(payload?.byType ?? []).map((group) => (
              <option key={group.activityType} value={group.activityType}>
                {group.label} ({numberFormat(group.runs)})
              </option>
            ))}
          </select>
        </label>
        <label>
          Activity
          <select
            className="gh-select"
            value={filters.activity}
            onChange={(event) => setFilters((current) => ({ ...current, activity: event.target.value }))}
          >
            <option value="">All activities</option>
            {(payload?.byActivity ?? []).map((group) => (
              <option key={`${group.activityType}-${group.referenceId}`} value={String(group.referenceId)}>
                {group.activityName} ({numberFormat(group.runs)})
              </option>
            ))}
          </select>
        </label>
        <label>
          Character
          <select
            className="gh-select"
            value={filters.character}
            onChange={(event) => setFilters((current) => ({ ...current, character: event.target.value }))}
          >
            <option value="">All characters</option>
            {(sync?.characters ?? [])
              .filter((character) => !character.unavailableReason)
              .map((character) => (
                <option key={character.key} value={character.key}>
                  {character.classLabel} · {platformDisplay(character.platformLabel)}
                  {character.light ? ` · ${character.light}` : ''}
                </option>
              ))}
          </select>
        </label>
        <label>
          Result
          <select
            className="gh-select"
            value={filters.completed}
            onChange={(event) => setFilters((current) => ({ ...current, completed: event.target.value }))}
          >
            <option value="all">All runs</option>
            <option value="clears">Clears only</option>
            <option value="incomplete">Not completed</option>
          </select>
        </label>
      </div>

      <div className="gh-card">
        <h2>By activity type</h2>
        {payload?.byType.length ? (
          <div className="gh-table-wrap">
            <table className="gh-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Runs</th>
                  <th>Clears</th>
                  <th>Kills</th>
                  <th>Deaths</th>
                  <th>K/D</th>
                  <th>Time</th>
                  <th>Fastest</th>
                </tr>
              </thead>
              <tbody>
                {payload.byType.map((group) => (
                  <tr key={group.activityType}>
                    <td>
                      <button
                        type="button"
                        className="gh-text-btn"
                        onClick={() =>
                          setFilters((current) => ({ ...current, type: group.activityType, activity: '' }))
                        }
                      >
                        {group.label}
                      </button>
                    </td>
                    <td>{numberFormat(group.runs)}</td>
                    <td>{numberFormat(group.clears)}</td>
                    <td>{numberFormat(group.kills)}</td>
                    <td>{numberFormat(group.deaths)}</td>
                    <td>{formatKd(group.kills, group.deaths)}</td>
                    <td>{formatPlayedTime(group.timePlayedSeconds)}</td>
                    <td>{formatClearTime(group.fastestClearSeconds)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="gh-muted">{loading ? 'Loading saved runs…' : 'No saved runs yet.'}</p>
        )}
      </div>

      <div className="gh-card">
        <h2>By activity</h2>
        {payload?.byActivity.length ? (
          <div className="gh-table-wrap">
            <table className="gh-table">
              <thead>
                <tr>
                  <th>Activity</th>
                  <th>Type</th>
                  <th>Runs</th>
                  <th>Clears</th>
                  <th>K/D</th>
                  <th>Fastest</th>
                </tr>
              </thead>
              <tbody>
                {payload.byActivity.map((group) => (
                  <tr key={`${group.activityType}-${group.referenceId}`}>
                    <td>
                      <button
                        type="button"
                        className="gh-text-btn"
                        onClick={() =>
                          setFilters((current) => ({
                            ...current,
                            type: group.activityType,
                            activity: String(group.referenceId),
                          }))
                        }
                      >
                        {group.activityName}
                      </button>
                    </td>
                    <td>{activityKindLabel(group.activityType)}</td>
                    <td>{numberFormat(group.runs)}</td>
                    <td>{numberFormat(group.clears)}</td>
                    <td>{formatKd(group.kills, group.deaths)}</td>
                    <td>{formatClearTime(group.fastestClearSeconds)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="gh-muted">Specific activities show up as runs are saved.</p>
        )}
      </div>

      <div className="gh-card">
        <div className="gh-section-head">
          <h2>Runs</h2>
          <p className="gh-muted">
            {numberFormat(runsTotal)} matching {loading ? '· updating…' : ''}
          </p>
        </div>
        {pgcrId ? (
          <div className="gh-pgcr" aria-live="polite">
            <div className="gh-section-head">
              <h3>Post-game report</h3>
              <button type="button" className="gh-text-btn" onClick={() => setPgcrId(null)}>
                Close
              </button>
            </div>
            {pgcrLoading ? <p className="gh-muted">Loading the report from Bungie…</p> : null}
            {pgcrError ? (
              <p className="gh-alert" role="alert">
                {pgcrError}
              </p>
            ) : null}
            {pgcr ? (
              <>
                <p className="gh-muted">
                  {pgcr.activityName || 'Activity'} · {formatWhen(pgcr.period)}
                  {pgcr.durationSeconds ? ` · ${formatClearTime(pgcr.durationSeconds)}` : ''}
                  {pgcr.startedFromBeginning === false ? ' · started after the beginning' : ''}
                </p>
                <div className="gh-table-wrap">
                  <table className="gh-table">
                    <thead>
                      <tr>
                        <th>Guardian</th>
                        <th>Class</th>
                        <th>Kills</th>
                        <th>Deaths</th>
                        <th>Assists</th>
                        <th>Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pgcr.entries.map((entry) => (
                        <tr key={`${entry.membershipId}-${entry.displayName}`}>
                          <td>{entry.displayName}</td>
                          <td>{entry.characterClass}</td>
                          <td>{numberFormat(entry.kills)}</td>
                          <td>{numberFormat(entry.deaths)}</td>
                          <td>{numberFormat(entry.assists)}</td>
                          <td>{numberFormat(entry.score)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p>
                  <a
                    className="gh-text-btn"
                    href={`https://www.bungie.net/en/PGCR/${pgcr.instanceId}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open on Bungie.net
                  </a>
                </p>
              </>
            ) : null}
          </div>
        ) : null}
        {payload?.runs.length ? (
          <ul className="gh-list">
            {payload.runs.map((run) => (
              <li key={run.instanceId}>
                <button
                  type="button"
                  className="gh-run"
                  onClick={() => void openRun(run.instanceId)}
                  aria-label={`Open post-game report for ${run.activityName}`}
                >
                  <span>
                    {run.activityName}
                    {run.isPrivate ? ' · private' : ''}
                  </span>
                  <span className="gh-muted">
                    {formatWhen(run.period)} · {activityKindLabel(run.activityType)} ·{' '}
                    {run.completed ? 'clear' : 'not completed'} · {formatClearTime(run.durationSeconds)} · K/D{' '}
                    {formatKd(run.kills, run.deaths)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="gh-muted">
            {loading || syncing ? 'Runs will list here as they are saved.' : 'No runs match these filters.'}
          </p>
        )}
        {runsTotal > pageSize ? (
          <div className="gh-actions">
            <button
              type="button"
              className="gh-btn gh-btn-ghost"
              disabled={page <= 0 || loading}
              onClick={() => void loadHistory(page - 1)}
            >
              Previous
            </button>
            <span className="gh-muted">
              Page {page + 1} of {pageCount}
            </span>
            <button
              type="button"
              className="gh-btn gh-btn-ghost"
              disabled={page + 1 >= pageCount || loading}
              onClick={() => void loadHistory(page + 1)}
            >
              Next
            </button>
          </div>
        ) : null}
      </div>

      <details className="gh-card">
        <summary>What Bungie does and does not return</summary>
        <ul className="gh-plain-list">
          {(payload?.limitations?.length ? payload.limitations : ACTIVITY_HISTORY_LIMITATIONS).map((note) => (
            <li key={note}>{note}</li>
          ))}
          {payload?.sync.limitations.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
        <p className="gh-muted">
          Fan-made and non-commercial. Stats stay on your Top Nest account for your own Guardian. Not affiliated with
          Bungie.
        </p>
      </details>
    </section>
  )
}
