'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { PublicFeaturedBuild, PublicHubSnapshot, PublicTopGuardian } from '@/lib/destiny/publicHub'
import { navigateGuardianSearch } from '@/lib/routing/tabUrl'
import { recentRunLines, scoreBoardLines, scorePointsLine, type ScoreRunRow, type ScoreStanding } from '@/lib/destiny/scoreStatus'
import { RateButton, RunCrownList } from '@/app/components/hub/QuickRate'
import BoardsHub from '@/app/components/hub/BoardsHub'
import { NextStep } from '@/app/components/hub/clarity'
import { PageHeader } from '@/app/components/hub/PageHeader'
import { formatEventWhen, openHubTab, usePublicHub } from '@/app/components/hub/hubTypes'
import { BOARD_BANNER_URL, elementBannerUrl } from '@/lib/destiny/featuredBuilds'
import { activityCatalogLookup } from '@/lib/destiny/activityCatalog'

function EmptyNote({
  title,
  children,
  actions,
}: {
  title: string
  children: ReactNode
  actions?: { label: string; onClick: () => void }[]
}) {
  return (
    <div className="gh-empty">
      <p className="gh-card-title">{title}</p>
      <p className="gh-muted">{children}</p>
      {actions && actions.length > 0 ? (
        <div className="gh-actions">
          {actions.map((action) => (
            <button key={action.label} type="button" className="gh-btn gh-btn-ghost" onClick={action.onClick}>
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function SignInGate({
  title,
  body,
  onLogin,
}: {
  title: string
  body: string
  onLogin?: () => void
}) {
  return (
    <section className="gh-card gh-gate">
      <h1>{title}</h1>
      <p className="gh-muted">{body}</p>
      {onLogin ? (
        <button type="button" className="gh-btn gh-btn-primary" onClick={onLogin}>
          Sign in with Bungie
        </button>
      ) : (
        <p className="gh-muted">Use Sign in with Bungie in the header to continue.</p>
      )}
    </section>
  )
}

export function BoardState({
  loading,
  error,
  onRetry,
  children,
}: {
  loading: boolean
  error: string | null
  onRetry?: () => void
  children: ReactNode
}) {
  if (loading) return <p className="gh-muted">Loading…</p>
  if (error) {
    return (
      <NextStep
        alert
        title="This page did not load"
        body="Check your connection, then try again. You can still sign in and look up a Guardian."
        actions={
          onRetry
            ? [
                { label: 'Try again', onClick: onRetry },
                { label: 'Find a Guardian', onClick: () => openHubTab('guardians') },
              ]
            : [{ label: 'Find a Guardian', onClick: () => openHubTab('guardians') }]
        }
      />
    )
  }
  return <>{children}</>
}

export function ContractList({
  snapshot,
  featured = false,
}: {
  snapshot: PublicHubSnapshot
  featured?: boolean
}) {
  return (
    <div className="gh-stack">
      <p className="gh-kicker">
        {snapshot.weekLabel} · resets in {snapshot.resetsInLabel}
      </p>
      {featured && snapshot.featuredRaids.length ? (
        <p className="gh-muted">Featured raids: {snapshot.featuredRaids.join(', ')}</p>
      ) : null}
      {featured && snapshot.featuredDungeons.length ? (
        <p className="gh-muted">Featured dungeons: {snapshot.featuredDungeons.join(', ')}</p>
      ) : null}
      {featured && snapshot.nightfall ? <p className="gh-muted">Nightfall: {snapshot.nightfall}</p> : null}
      <div className="gh-grid">
        {snapshot.contracts.map((contract) => (
          <article key={contract.id} className="gh-card">
            <div className="gh-section-head">
              <h3>{contract.title}</h3>
              <strong>+{contract.tierPoints}</strong>
            </div>
            <details className="gh-disclosure">
              <summary>Details</summary>
              <p className="gh-lede">{contract.description}</p>
            </details>
          </article>
        ))}
      </div>
    </div>
  )
}

export function SherpaList({ snapshot }: { snapshot: PublicHubSnapshot }) {
  if (!snapshot.sherpas.length) {
    return (
      <EmptyNote
        title="No teachers on the board yet"
        actions={[{ label: 'Find a fireteam', onClick: () => openHubTab('fireteam') }]}
      >
        A sherpa is someone who already cleared the activity and then guided a first-timer. Sign in, finish a clear,
        and teach the next one.
      </EmptyNote>
    )
  }
  return (
    <ol className="gh-list">
      {snapshot.sherpas.map((row) => (
        <li key={`${row.rank}-${row.displayName}`}>
          <span className="ios-row-copy">
            <strong>
              {row.rank} {row.displayName}
            </strong>
            <small>{row.points} pts</small>
          </span>
        </li>
      ))}
    </ol>
  )
}

export function ClanList({ snapshot }: { snapshot: PublicHubSnapshot }) {
  if (!snapshot.clans.length) {
    return (
      <EmptyNote
        title="No clan standings yet"
        actions={[{ label: 'Find a fireteam', onClick: () => openHubTab('fireteam') }]}
      >
        A clan shows up after two clanmates finish a verified clear together.
      </EmptyNote>
    )
  }
  return (
    <ol className="gh-list">
      {snapshot.clans.map((row) => (
        <li key={`${row.rank}-${row.clanName}`}>
          <span className="ios-row-copy">
            <strong>
              {row.rank} {row.clanName}
            </strong>
            <small>{row.seasonPoints} pts</small>
          </span>
        </li>
      ))}
    </ol>
  )
}

type LookupRow = {
  instanceId: string
  activityName: string
  type: 'raid' | 'dungeon'
  completedAt: string
  teammateCount: number
  status: 'scored' | 'flagged' | 'unscored'
  statusLabel: string
  pointsAwarded: number
  bondPoints: number
  membershipId: string
  membershipType?: number
  displayName: string
}

export function ScoreRuns({ signedIn, onLogin }: { signedIn: boolean; onLogin: () => void }) {
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [points, setPoints] = useState<string | null>(null)
  const [ranks, setRanks] = useState<string[]>([])
  const [runs, setRuns] = useState<{ id: string; line: string; teammates: { membershipId: string; displayName: string }[] }[]>([])
  const [refreshKey, setRefreshKey] = useState(0)
  const [query, setQuery] = useState('')
  const [found, setFound] = useState<LookupRow[]>([])
  const [foundName, setFoundName] = useState('')

  useEffect(() => {
    if (!signedIn) return
    let cancelled = false
    void Promise.all([
      fetch('/api/destiny/profile?scope=summary', { credentials: 'include' }).then(async (response) =>
        response.ok ? response.json() : null
      ),
      fetch('/api/destiny/season', { credentials: 'include' }).then(async (response) =>
        response.ok ? response.json() : null
      ),
    ])
      .then(([profileJson, seasonJson]) => {
        if (cancelled) return
        const profile = (
          profileJson as {
            profile?: {
              raidPoints?: number
              dungeonPoints?: number
              verifiedClears?: number
              recentRuns?: Array<
                ScoreRunRow & {
                  teamMembers?: { membershipId?: string; displayName?: string }[]
                  bondPoints?: number
                }
              >
            }
          } | null
        )?.profile
        if (profile) {
          setPoints(scorePointsLine(profile))
          setRuns(
            recentRunLines(
              (profile.recentRuns ?? []).map((run) => ({
                ...run,
                teammateCount: run.teamMembers?.length ?? run.teammateCount ?? 0,
                bondPoints: run.bondPoints,
              }))
            )
          )
        }
        const standings = (seasonJson as { myStandings?: ScoreStanding[] } | null)?.myStandings ?? []
        if (standings.length || profile) setRanks(scoreBoardLines(standings))
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [signedIn, refreshKey])

  const autoSynced = useRef(false)
  useEffect(() => {
    if (!signedIn) return
    let cancelled = false
    const params = new URLSearchParams({ pages: '5' })
    void fetch(`/api/destiny/runs/lookup?${params.toString()}`, { credentials: 'include' })
      .then(async (response) => (response.ok ? response.json() : null))
      .then((json: { displayName?: string; runs?: LookupRow[] } | null) => {
        if (cancelled || !json?.runs) return
        setFound(json.runs)
        setFoundName(json.displayName || '')
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [signedIn, refreshKey])

  useEffect(() => {
    if (!signedIn || autoSynced.current) return
    autoSynced.current = true
    let cancelled = false
    void fetch('/api/destiny/runs/sync', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ includePrevious: false, pages: 5 }),
    })
      .then(async (response) => {
        const json = (await response.json().catch(() => ({}))) as { error?: string }
        if (cancelled) return
        if (response.ok) setRefreshKey((value) => value + 1)
        else setStatus(json.error || 'Could not load the last pages of runs.')
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [signedIn])

  const sync = async (includePrevious: boolean) => {
    setBusy(true)
    setStatus(null)
    try {
      const response = await fetch('/api/destiny/runs/sync', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ includePrevious, pages: includePrevious ? 8 : 5 }),
      })
      const json = (await response.json().catch(() => ({}))) as { message?: string; error?: string }
      setStatus(json.message || json.error || (response.ok ? 'Runs synced.' : 'Sync did not finish.'))
      if (response.ok) setRefreshKey((value) => value + 1)
    } catch {
      setStatus('Sync did not finish. Try again in a moment.')
    } finally {
      setBusy(false)
    }
  }

  const lookup = async (mine: boolean) => {
    if (!signedIn) {
      onLogin()
      return
    }
    setBusy(true)
    setStatus(null)
    try {
      const params = new URLSearchParams()
      if (!mine && query.trim()) params.set('q', query.trim())
      params.set('pages', mine ? '5' : '8')
      if (!mine) params.set('includePrevious', '1')
      const response = await fetch(`/api/destiny/runs/lookup?${params.toString()}`, { credentials: 'include' })
      const json = (await response.json().catch(() => ({}))) as {
        error?: string
        displayName?: string
        runs?: LookupRow[]
      }
      if (!response.ok) throw new Error(json.error || 'Lookup did not finish.')
      setFound(json.runs ?? [])
      setFoundName(json.displayName || '')
      setStatus(json.runs?.length ? `Found ${json.runs.length} raid and dungeon runs.` : 'No raid or dungeon runs on those history pages.')
    } catch (err) {
      setFound([])
      setStatus(err instanceof Error ? err.message : 'Lookup did not finish.')
    } finally {
      setBusy(false)
    }
  }

  const addRuns = async (rows: LookupRow[]) => {
    const pending = rows.filter((row) => row.status !== 'scored')
    if (!pending.length) {
      setStatus('Those runs are already scored.')
      return
    }
    setBusy(true)
    setStatus(null)
    try {
      const response = await fetch('/api/destiny/runs/lookup', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          membershipId: pending[0]?.membershipId,
          membershipType: pending[0]?.membershipType,
          displayName: pending[0]?.displayName,
          runs: pending.map((row) => ({ instanceId: row.instanceId, type: row.type })),
        }),
      })
      const json = (await response.json().catch(() => ({}))) as { message?: string; error?: string }
      setStatus(json.message || json.error || (response.ok ? 'Runs added.' : 'Could not add those runs.'))
      if (response.ok) {
        setRefreshKey((value) => value + 1)
        setFound((current) =>
          current.map((row) =>
            pending.some((item) => item.instanceId === row.instanceId)
              ? { ...row, status: 'scored', statusLabel: 'Already Scored' }
              : row
          )
        )
      }
    } catch {
      setStatus('Could not add those runs.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="gh-stack" aria-labelledby="score-title">
      <header className="gh-page-head">
        <h1 id="score-title">Score</h1>
        <details className="gh-disclosure ios-detail">
          <summary>Details</summary>
          <ul className="gh-score-points">
            <li>Clear raids or dungeons in Destiny 2. A raid clear is 3 points. A dungeon clear is 1 point.</li>
            <li>Each MVP vote you receive adds 2 points on the raid and dungeon boards.</li>
            <li>Playing with Guardians you have not run with before earns bonus points on the New Teammates board.</li>
            <li>Click Sync My Runs for the last 5 pages, or look up previous raids and dungeons and add them to this season.</li>
          </ul>
        </details>
      </header>
      {points ? <p className="gh-status">{points}</p> : null}
      {ranks.length ? (
        <ul className="gh-score-points">
          {ranks.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}
      <div className="gh-actions">
        <button
          type="button"
          className="gh-btn gh-btn-primary"
          onClick={() => (signedIn ? void sync(false) : onLogin())}
          disabled={busy}
        >
          {busy ? 'Working…' : 'Sync Recent Runs'}
        </button>
        <button
          type="button"
          className="gh-btn gh-btn-ghost"
          onClick={() => (signedIn ? void sync(true) : onLogin())}
          disabled={busy}
        >
          Lookup & Score Previous Runs
        </button>
        {signedIn ? null : (
          <button type="button" className="gh-btn gh-btn-ghost" onClick={onLogin}>
            Sign in with Bungie to Score Runs
          </button>
        )}
        <a className="gh-btn gh-btn-ghost" href="/boards">
          Leaderboards
        </a>
      </div>
      <form
        className="gh-card gh-lookup"
        onSubmit={(event) => {
          event.preventDefault()
          void lookup(false)
        }}
      >
        <h2>Look up recent or previous runs</h2>
        <label className="gh-sr" htmlFor="score-lookup">
          Bungie name or PGCR id
        </label>
        <input
          id="score-lookup"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Bungie name like Name#1234, or a PGCR id"
        />
        <div className="gh-actions">
          <button type="submit" className="gh-btn gh-btn-primary" disabled={busy}>
            Look up runs
          </button>
          <button
            type="button"
            className="gh-btn gh-btn-ghost"
            onClick={() => (signedIn ? void lookup(true) : onLogin())}
            disabled={busy}
          >
            Load My History
          </button>
          <button
            type="button"
            className="gh-btn gh-btn-ghost"
            disabled={busy || found.every((row) => row.status === 'scored')}
            onClick={() => void addRuns(found)}
          >
            Add All to Scoring
          </button>
        </div>
        {foundName ? <p className="gh-muted">{foundName}</p> : null}
        {found.length ? (
          <ul className="gh-list">
            {found.map((row) => (
              <li key={row.instanceId} className="gh-lookup-row">
                <h3>{row.activityName}</h3>
                <p className="gh-muted">
                  {row.status === 'scored' ? `+${row.pointsAwarded} pts` : row.statusLabel}
                </p>
                <div className="gh-actions">
                  {row.status === 'scored' ? (
                    <span className="gh-muted">+{row.pointsAwarded} pts</span>
                  ) : (
                    <button type="button" className="gh-btn gh-btn-ghost" disabled={busy} onClick={() => void addRuns([row])}>
                      Add to Scoring
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </form>
      {runs.length ? (
        <section className="gh-card" aria-labelledby="recent-runs">
          <h2 id="recent-runs">Scored runs</h2>
          <RunCrownList
            signedIn={signedIn}
            runs={runs.map((run) => ({ id: run.id, label: run.line, teammates: run.teammates }))}
          />
        </section>
      ) : null}
      {status ? (
        <p className="gh-confirm" role="status">
          {status}
        </p>
      ) : null}
    </section>
  )
}

function bungieArt(path: string | undefined): string | undefined {
  if (!path) return undefined
  return path.startsWith('http') ? path : `https://www.bungie.net${path}`
}

function activityArt(name: string): string | undefined {
  return bungieArt(activityCatalogLookup(name)?.iconPath)
}

function HomeSkeleton() {
  return (
    <div className="gh-home-skeleton" aria-hidden>
      <span />
      <span />
      <span />
      <span />
    </div>
  )
}

export function HubHome({
  snapshot,
  loading,
  error,
  onLogin,
  signedIn = false,
}: {
  snapshot: PublicHubSnapshot | null
  loading: boolean
  error: string | null
  onLogin: () => void
  signedIn?: boolean
}) {
  return (
    <div className="gh-stack gh-home">
      <h1 className="gh-home-title">Home</h1>
      {loading ? <HomeSkeleton /> : null}
      {!loading && !error && snapshot ? <WeeklySection snapshot={snapshot} /> : null}
      <div className="gh-action-cards">
        <article className="gh-action-card">
          <h2>Score Your Runs</h2>
          {signedIn ? (
            <a className="gh-btn gh-btn-primary" href="/score">
              Score
            </a>
          ) : (
            <button type="button" className="gh-btn gh-btn-primary" onClick={onLogin}>
              Sign in with Bungie to Score Runs
            </button>
          )}
        </article>
        <article className="gh-action-card">
          <h2>Vote MVP</h2>
          <a className="gh-btn gh-btn-primary" href="/rate">
            Vote MVP
          </a>
        </article>
        <article className="gh-action-card">
          <h2>Ask Destiny AI</h2>
          <a className="gh-btn gh-btn-primary" href="/ask">
            Ask
          </a>
        </article>
      </div>
      <p className="ios-caption">Season #1 · 3D print</p>
      {error ? (
        <NextStep
          alert
          title="This page did not load"
          body="Check your connection, then try again. You can still sign in and look up a Guardian."
          actions={[{ label: 'Try again', onClick: () => window.location.reload() }]}
        />
      ) : null}
      {!loading && !error && snapshot ? <HomeLive snapshot={snapshot} onLogin={onLogin} /> : null}
    </div>
  )
}

function HomeLive({ snapshot, onLogin }: { snapshot: PublicHubSnapshot; onLogin: () => void }) {
  const podium = snapshot.topGuardians.filter((row) => row.board === 'raid').slice(0, 3)
  const mvps = snapshot.topGuardians
    .filter((row) => (row.mvpVotes ?? 0) > 0)
    .sort((a, b) => (b.mvpVotes ?? 0) - (a.mvpVotes ?? 0))
    .filter((row, index, all) => {
      const key = row.bungieMembershipId || row.displayName
      return all.findIndex((item) => (item.bungieMembershipId || item.displayName) === key) === index
    })
    .slice(0, 3)
  const clan = snapshot.clans[0]
  return (
    <>
      <HomeStats stats={snapshot.stats} />
      <section className="gh-home-section" aria-labelledby="gh-podium">
        <div className="gh-section-head">
          <h2 id="gh-podium">Top 3</h2>
          <a className="gh-text-btn" href="/boards?category=raid">
            Raid board
          </a>
        </div>
        {podium.length ? (
          <ol className="gh-podium">
            {podium.map((row) => (
              <li key={`${row.rank}-${row.displayName}`} className={row.rank === 1 ? 'is-first' : undefined}>
                <span className="gh-rank">{row.rank}</span>
                <button type="button" className="gh-text-btn" onClick={() => navigateGuardianSearch(row.displayName)}>
                  {row.displayName}
                </button>
                <strong>{row.points} pts</strong>
              </li>
            ))}
          </ol>
        ) : (
          <p className="gh-empty-card">No raid leaders yet. A verified clear from the start shows up here.</p>
        )}
      </section>
      <section className="gh-home-section" aria-labelledby="gh-top">
        <div className="gh-section-head">
          <h2 id="gh-top">Live season leaderboards</h2>
          <a className="gh-text-btn" href="/boards">
            View leaderboards
          </a>
        </div>
        <HomeLeaderboards rows={snapshot.topGuardians} />
      </section>
      <div className="gh-home-split">
        <section className="gh-home-section" aria-labelledby="gh-runs">
          <h2 id="gh-runs">Recent runs</h2>
          {snapshot.recentRuns.length ? (
            <ul className="gh-list">
              {snapshot.recentRuns.map((run) => (
                <li key={run.id}>
                  <span className="ios-row-copy">
                    <strong>{run.activityName}</strong>
                    <small>
                      {run.completedAt} · {run.points} pts · {run.playerCount} players
                    </small>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="gh-empty-card">No scored runs yet.</p>
          )}
        </section>
        <section className="gh-home-section" aria-labelledby="gh-mvps">
          <h2 id="gh-mvps">Latest MVPs</h2>
          {mvps.length ? (
            <ul className="gh-list">
              {mvps.map((row) => (
                <li key={row.displayName}>
                  <span className="ios-row-copy">
                    <strong>{row.displayName}</strong>
                    <small>{row.mvpVotes} MVP</small>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="gh-empty-card">No MVP crowns yet.</p>
          )}
        </section>
      </div>
      <FeaturedBuilds builds={snapshot.featuredBuilds} onLogin={onLogin} />
      <section className="gh-home-section" aria-labelledby="gh-spotlight">
        <h2 id="gh-spotlight">{clan ? 'Clan spotlight' : 'Kick'}</h2>
        {clan ? (
          <article className="gh-spotlight">
            <strong>{clan.clanName}</strong>
            <span>{clan.seasonPoints} pts</span>
          </article>
        ) : (
          <a className="gh-spotlight" href="https://kick.com/bulletbait604" target="_blank" rel="noreferrer">
            <strong>Kick Guardians</strong>
            <span>kick.com/bulletbait604</span>
          </a>
        )}
      </section>
    </>
  )
}

function WeeklySection({ snapshot }: { snapshot: PublicHubSnapshot }) {
  const nightfall = snapshot.nightfall && !/pantheon/i.test(snapshot.nightfall) ? snapshot.nightfall : ''
  return (
    <section className="gh-home-section" aria-label="This week">
      <div className="gh-section-head">
        <h2>This week</h2>
        <span className="gh-muted">
          {snapshot.weekLabel} · resets in {snapshot.resetsInLabel}
        </span>
      </div>
      <div className="gh-feature-pair gh-rotation">
        <FeaturedActivity title="Featured raids" names={snapshot.featuredRaids} />
        <FeaturedActivity title="Featured dungeons" names={snapshot.featuredDungeons} />
        {nightfall ? <FeaturedActivity title="Nightfall" names={[nightfall]} /> : null}
      </div>
    </section>
  )
}

function FeaturedActivity({ title, names }: { title: string; names: string[] }) {
  const name = names[0]
  const art = name ? activityArt(name) : undefined
  return (
    <article className="gh-feature-card">
      <div className="gh-board-art" style={art ? { backgroundImage: `url(${art})` } : undefined} />
      <div>
        <h3>{title}</h3>
        <p>{names.length ? names.join(' · ') : 'Rotation loading'}</p>
      </div>
    </article>
  )
}

function HomeStats({ stats }: { stats: PublicHubSnapshot['stats'] }) {
  const tiles = [
    stats.runs > 0 ? { label: 'Runs', value: String(stats.runs) } : null,
    stats.players > 0 ? { label: 'Players', value: String(stats.players) } : null,
    stats.builds > 0 ? { label: 'Builds', value: String(stats.builds) } : null,
  ].filter((tile): tile is { label: string; value: string } => Boolean(tile))
  if (!tiles.length) {
    return <p className="gh-empty-card">Stats show up after a scored run.</p>
  }
  return (
    <ul className="gh-stat-row">
      {tiles.map((tile) => (
        <li key={tile.label}>
          <strong>{tile.value}</strong>
          <span>{tile.label}</span>
        </li>
      ))}
    </ul>
  )
}

const HOME_BOARDS: {
  id: PublicTopGuardian['board']
  title: string
  link: string
  art: string
}[] = [
  { id: 'raid', title: 'Raid Leaderboard', link: 'Full Raid Board →', art: BOARD_BANNER_URL.raid },
  { id: 'dungeon', title: 'Dungeon Leaderboard', link: 'Full Dungeon Board →', art: BOARD_BANNER_URL.dungeon },
  { id: 'new_bonds', title: 'New Teammates Leaderboard', link: 'Full New Teammates Board →', art: BOARD_BANNER_URL.new_bonds },
]

function HomeLeaderboards({ rows }: { rows: PublicTopGuardian[] }) {
  return (
    <div className="gh-home-boards">
      {HOME_BOARDS.map((board) => {
        const boardRows = rows.filter((row) => row.board === board.id).slice(0, 5)
        const leader = boardRows.find((row) => row.rank === 1) ?? boardRows[0]
        return (
          <article key={board.id} className="gh-home-board" aria-labelledby={`gh-board-${board.id}`}>
            <div className="gh-board-art" style={{ backgroundImage: `url(${board.art})` }} />
            <header className="gh-home-board-head">
              <h3 id={`gh-board-${board.id}`}>{board.title}</h3>
            </header>
            {leader ? <p className="gh-sr">#1 {leader.displayName}</p> : null}
            {boardRows.length ? (
              <ol className="gh-home-board-list">
                {boardRows.map((row) => (
                  <li key={`${row.board}-${row.rank}-${row.displayName}`}>
                    <div className="gh-home-rank">
                      <button type="button" className="gh-text-btn" onClick={() => navigateGuardianSearch(row.displayName)}>
                        #{row.rank} {row.displayName}
                      </button>
                      <span className="gh-muted">{row.points} pts</span>
                    </div>
                    <RateButton
                      membershipId={row.bungieMembershipId}
                      displayName={row.displayName}
                      mvpVotes={row.mvpVotes}
                    />
                  </li>
                ))}
              </ol>
            ) : (
              <p className="gh-muted">No ranked clears on this board yet.</p>
            )}
            <a className="gh-text-btn" href={`/boards?category=${board.id}`}>
              {board.link}
            </a>
          </article>
        )
      })}
    </div>
  )
}

function FeaturedBuilds({ builds, onLogin }: { builds: PublicFeaturedBuild[]; onLogin: () => void }) {
  return (
    <section className="gh-section" aria-labelledby="gh-builds">
      <div className="gh-section-head">
        <h2 id="gh-builds">Featured builds</h2>
        <button type="button" className="gh-text-btn" onClick={() => openHubTab('loadouts')}>
          All builds
        </button>
      </div>
      {builds.length === 0 ? (
        <NextStep
          title="No builds yet"
          body="Share a loadout to post it here."
          actions={[
            { label: 'Sign in to share', onClick: onLogin },
            { label: 'Browse builds', onClick: () => openHubTab('loadouts') },
          ]}
        />
      ) : (
        <div className="gh-build-grid">
          {builds.map((build) => {
            const element = build.subclass.toLowerCase()
            const tone = ['arc', 'solar', 'void', 'stasis', 'strand', 'prismatic'].includes(element) ? element : 'prismatic'
            return (
              <a key={build.id} className={`gh-build-sheet el-${tone}`} href={`/builds/${build.id}`}>
                <span className="gh-build-banner" style={{ backgroundImage: `url(${elementBannerUrl(build.subclass)})` }} />
                <span className="gh-build-body">
                  <span className="gh-build-kicker">
                    {build.subclassIcon ? <span className="gh-mini-icon" style={{ backgroundImage: `url(${build.subclassIcon})` }} /> : null}
                    {build.characterClass} · {build.subclass}
                  </span>
                  <strong>{build.name}</strong>
                  <span className="gh-build-gear">
                    {build.exoticArmorIcon ? <span className="gh-gear-icon" style={{ backgroundImage: `url(${build.exoticArmorIcon})` }} /> : null}
                    <span>{build.exoticArmor}</span>
                    {build.exoticWeaponIcon ? <span className="gh-gear-icon" style={{ backgroundImage: `url(${build.exoticWeaponIcon})` }} /> : null}
                    <span>{build.exoticWeapon}</span>
                  </span>
                  {build.playNotes ? <span className="gh-muted">{build.playNotes}</span> : null}
                </span>
              </a>
            )
          })}
        </div>
      )}
    </section>
  )
}

export function HubContracts() {
  const { snapshot, loading, error } = usePublicHub()
  return (
    <section className="gh-stack">
      <PageHeader
        title="Weekly goals"
        subtitle="Finish one before Tuesday. These points unlock a title and frame. They do not change the boards."
      />
      <BoardState loading={loading} error={error}>
        {snapshot ? <ContractList snapshot={snapshot} featured /> : null}
      </BoardState>
    </section>
  )
}

export function HubSherpas({ bare = false }: { bare?: boolean }) {
  const { snapshot, loading, error } = usePublicHub()
  return (
    <section className="gh-stack">
      {bare ? null : (
        <PageHeader
          title="Teachers"
          subtitle="A sherpa already cleared the activity and guided someone through their first clear."
        />
      )}
      <BoardState loading={loading} error={error}>
        {snapshot ? (
          <div className="gh-card">
            <SherpaList snapshot={snapshot} />
          </div>
        ) : null}
      </BoardState>
    </section>
  )
}

export function HubClans({ bare = false }: { bare?: boolean }) {
  const { snapshot, loading, error } = usePublicHub()
  return (
    <section className="gh-stack">
      {bare ? null : (
        <PageHeader
          title="Clans"
          subtitle="A clan scores when two or more clanmates finish a verified clear together."
        />
      )}
      <BoardState loading={loading} error={error}>
        {snapshot ? (
          <div className="gh-card">
            <ClanList snapshot={snapshot} />
          </div>
        ) : null}
      </BoardState>
    </section>
  )
}

export function HubEvents() {
  const { snapshot, loading, error } = usePublicHub()
  return (
    <section className="gh-stack">
      <PageHeader
        title="Events"
        subtitle="Community sessions. You get the badge if your clear happens during the event."
      />
      <BoardState loading={loading} error={error}>
        {snapshot && snapshot.events.length === 0 ? (
          <EmptyNote
            title="No events scheduled"
            actions={[{ label: 'See weekly goals', onClick: () => openHubTab('contracts') }]}
          >
            When a session is scheduled, it shows up here with a watch link.
          </EmptyNote>
        ) : null}
        {snapshot && snapshot.events.length > 0 ? (
          <div className="gh-grid">
            {snapshot.events.map((event) => (
              <article key={event.id} className="gh-card">
                <p className="gh-kicker">{event.status}</p>
                <h3>{event.title}</h3>
                <p className="gh-muted">
                  {event.hostName}
                  {event.activityName ? ` · ${event.activityName}` : ''}
                </p>
                <p className="gh-muted">
                  {formatEventWhen(event.startsAt)} – {formatEventWhen(event.endsAt)}
                </p>
                <div className="gh-actions">
                  {event.twitchUrl ? (
                    <a className="gh-text-btn" href={event.twitchUrl} target="_blank" rel="noreferrer">
                      Watch on Twitch
                    </a>
                  ) : null}
                  {event.kickUrl ? (
                    <a className="gh-text-btn" href={event.kickUrl} target="_blank" rel="noreferrer">
                      Watch on Kick
                    </a>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </BoardState>
    </section>
  )
}

export function HubFireteams({ onLogin, signedIn }: { onLogin?: () => void; signedIn?: boolean }) {
  const { snapshot, loading, error } = usePublicHub()
  return (
    <section className="gh-stack">
      <PageHeader title="Play" subtitle="Open fireteams. Sign in to join one or post your own." />
      <BoardState loading={loading} error={error}>
        {snapshot && snapshot.fireteams.length === 0 ? (
          <EmptyNote
            title="No open fireteams right now"
            actions={onLogin ? [{ label: 'Sign in to post one', onClick: onLogin }] : undefined}
          >
            Be the first to post a raid, dungeon, or teaching run.
          </EmptyNote>
        ) : null}
        {snapshot && snapshot.fireteams.length > 0 ? (
          <ul className="gh-list">
            {snapshot.fireteams.map((room) => (
              <li key={room.id}>
                <span>
                  {room.activityName} · {room.hostDisplayName}
                </span>
                <span className="gh-muted">
                  {room.currentPlayers}/{room.maxPlayers} · {room.goal} · {room.status.replace('_', ' ')}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </BoardState>
      {signedIn ? null : (
        <SignInGate
          title="Sign in to join or post"
          body="Signing in lets this clear count for points, lets you vote MVP for a teammate, and lets you post a fireteam."
          onLogin={onLogin}
        />
      )}
    </section>
  )
}

export function HubLeaderboardPreview({ onLogin }: { onLogin?: () => void }) {
  return <BoardsHub onLogin={onLogin} />
}

export function ConnectedHome({ onLogin, signedIn = false }: { onLogin: () => void; signedIn?: boolean }) {
  const state = usePublicHub()
  return <HubHome {...state} onLogin={onLogin} signedIn={signedIn} />
}
