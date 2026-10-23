'use client'

import { useEffect, useState, type ReactNode } from 'react'
import type { PublicFeaturedBuild, PublicHubSnapshot, PublicTopGuardian } from '@/lib/destiny/publicHub'
import { navigateGuardianSearch } from '@/lib/routing/tabUrl'
import { recentRunLines, scoreBoardLines, scorePointsLine, type ScoreRunRow, type ScoreStanding } from '@/lib/destiny/scoreStatus'
import { RateButton } from '@/app/components/hub/QuickRate'
import BoardsHub from '@/app/components/hub/BoardsHub'
import AskGuide from '@/app/components/hub/AskGuide'
import { NextStep } from '@/app/components/hub/clarity'
import { PageHeader, PointsChip } from '@/app/components/hub/PageHeader'
import { formatEventWhen, openHubTab, usePublicHub } from '@/app/components/hub/hubTypes'

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

function BoardState({
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
              <PointsChip
                label="Tier"
                value={`+${contract.tierPoints}`}
                hint="Finishing this contract adds season tier points for a title and a profile frame. It does not change leaderboard points."
              />
            </div>
            <p className="gh-muted">{contract.description}</p>
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
          <span>
            #{row.rank} {row.displayName}
          </span>
          <span className="gh-muted">
            {row.title} · {row.points} pts · {row.guidedClears} guided
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
          <span>
            #{row.rank} {row.clanName}
          </span>
          <span className="gh-muted">
            {row.division} · {row.seasonPoints} season pts · {row.weeklyPoints} this week
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
  displayName: string
}

export function ScoreRuns({ signedIn, onLogin }: { signedIn: boolean; onLogin: () => void }) {
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [points, setPoints] = useState<string | null>(null)
  const [ranks, setRanks] = useState<string[]>([])
  const [runs, setRuns] = useState<{ id: string; line: string }[]>([])
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
              recentRuns?: Array<ScoreRunRow & { teamMembers?: unknown[]; bondPoints?: number }>
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

  const sync = async (includePrevious: boolean) => {
    setBusy(true)
    setStatus(null)
    try {
      const response = await fetch('/api/destiny/runs/sync', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ includePrevious, pages: includePrevious ? 6 : 3 }),
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
      params.set('pages', '6')
      params.set('includePrevious', '1')
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
      <header className="gh-hero">
        <div>
          <p className="gh-kicker">Score a Run</p>
          <h1 id="score-title">Score your runs</h1>
          <ul className="gh-score-points">
            <li>Clear raids or dungeons in Destiny 2.</li>
            <li>Playing with Guardians you have not run with before earns bonus points.</li>
            <li>Click Sync My Runs for recent clears, or look up previous raids and dungeons and add them to this season.</li>
          </ul>
        </div>
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
                <h3>
                  {row.activityName} · {row.type === 'raid' ? 'Raid' : 'Dungeon'}
                </h3>
                <p className="gh-muted">
                  {row.completedAt ? new Date(row.completedAt).toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles' }) : 'Date unavailable'}
                  {' · '}
                  {row.teammateCount} teammates · {row.statusLabel}
                  {row.bondPoints ? ` · +${row.bondPoints} new teammates` : ''}
                </p>
                <div className="gh-actions">
                  {row.status === 'scored' ? (
                    <span className="gh-muted">+{row.pointsAwarded} pts</span>
                  ) : (
                    <button type="button" className="gh-btn gh-btn-ghost" disabled={busy} onClick={() => void addRuns([row])}>
                      Add to Scoring
                    </button>
                  )}
                  <a className="gh-text-btn" href="/rate">
                    Rate Teammates
                  </a>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </form>
      {runs.length ? (
        <section className="gh-card" aria-labelledby="recent-runs">
          <h2 id="recent-runs">Scored runs</h2>
          <ul className="gh-list">
            {runs.map((run) => (
              <li key={run.id} className="gh-row-with-rate">
                <span>{run.line}</span>
                <a className="gh-text-btn" href="/rate">
                  Rate Teammates
                </a>
              </li>
            ))}
          </ul>
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
    <div className="gh-stack">
      <header className="gh-hero">
        <div>
          <p className="gh-kicker">TopNest</p>
          <h1>Play with new friends. Score the clear.</h1>
          <p className="gh-lede">Three things to do. Each one is one click.</p>
        </div>
      </header>
      <div className="gh-action-cards">
        <article className="gh-action-card">
          <h2>1. Score Your Runs</h2>
          <p>Sync your Bungie raids and dungeons with new teammates to climb the season boards and win the 3D print prize.</p>
          {signedIn ? (
            <a className="gh-btn gh-btn-primary" href="/score">
              Score / Sync Runs Now
            </a>
          ) : (
            <button type="button" className="gh-btn gh-btn-primary" onClick={onLogin}>
              Sign in with Bungie to Score Runs
            </button>
          )}
        </article>
        <article className="gh-action-card">
          <h2>2. Rate and Vote MVP</h2>
          <p>Commend helpful Guardians you played with and cast your season MVP vote.</p>
          <a className="gh-btn gh-btn-primary" href="/rate">
            Rate a Guardian
          </a>
        </article>
        <article className="gh-action-card">
          <h2>3. Ask Destiny AI</h2>
          <p>Stuck on a quest, aspect, or unlock? Type what you are trying to do and get current step-by-step instructions.</p>
          <AskGuide compact />
        </article>
      </div>
      <p className="gh-prize-line">
        Season leaders in the US and Canada can win a Destiny 2 3D print. UK leaders can win a $50 CAD Steam gift card.
      </p>

      <BoardState loading={loading} error={error} onRetry={() => window.location.reload()}>
        {snapshot ? (
          <>
            <section className="gh-card" aria-labelledby="gh-top">
              <div className="gh-section-head">
                <h2 id="gh-top">Live season leaderboards</h2>
                <a className="gh-text-btn" href="/boards">
                  Full boards
                </a>
              </div>
              <TopGuardianList rows={snapshot.topGuardians} />
            </section>
            <div className="gh-split">
              <section className="gh-status" aria-label="This week">
                <p>
                  <span className="gh-kicker">This week</span>
                  {snapshot.weekLabel} · resets in {snapshot.resetsInLabel}
                </p>
                <p className="gh-rotation">
                  Featured raids: {snapshot.featuredRaids.join(' · ') || 'Rotation loading'}. Featured dungeons:{' '}
                  {snapshot.featuredDungeons.join(' · ') || 'Rotation loading'}.
                </p>
              </section>
              <FeaturedBuilds builds={snapshot.featuredBuilds} onLogin={onLogin} />
            </div>
          </>
        ) : null}
      </BoardState>
    </div>
  )
}

function TopGuardianList({ rows }: { rows: PublicTopGuardian[] }) {
  if (!rows.length) {
    return (
      <NextStep
        title="No leaders yet"
        body="Names show up here after a verified clear this season."
        actions={[{ label: 'Open the boards', onClick: () => openHubTab('leaderboards') }]}
      />
    )
  }
  return (
    <ul className="gh-list">
      {rows.map((row) => (
        <li key={`${row.board}-${row.rank}-${row.displayName}`} className="gh-row-with-rate">
          <button type="button" className="gh-text-btn" onClick={() => navigateGuardianSearch(row.displayName)}>
            #{row.rank} {row.displayName}
          </button>
          <RateButton displayName={row.displayName} />
          <span className="gh-muted">
            {row.boardLabel} · {row.points} pts
          </span>
        </li>
      ))}
    </ul>
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
          body="Featured guides are curated loadouts from build sites. Player posts show up after someone shares their gear."
          actions={[
            { label: 'Sign in to share', onClick: onLogin },
            { label: 'Browse builds', onClick: () => openHubTab('loadouts') },
          ]}
        />
      ) : (
        <div className="gh-rotation">
          {builds.map((build) => (
            <a key={build.id} className="gh-card gh-build-card" href={`/builds/${build.id}`}>
              <p className="gh-kicker">
                {build.listing === 'featured' ? 'Featured' : build.characterClass} · {build.characterClass} · {build.activity}
              </p>
              <h3>{build.name}</h3>
              <p className="gh-muted">
                {build.subclass}
                {build.creditName ? ` · ${build.creditName}` : ` · ${build.likes} likes · ${build.ownerDisplayName}`}
              </p>
            </a>
          ))}
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

export function HubSherpas() {
  const { snapshot, loading, error } = usePublicHub()
  return (
    <section className="gh-stack">
      <PageHeader
        title="Teachers"
        subtitle="A sherpa already cleared the activity and guided someone through their first clear."
      />
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

export function HubClans() {
  const { snapshot, loading, error } = usePublicHub()
  return (
    <section className="gh-stack">
      <PageHeader
        title="Clans"
        subtitle="A clan scores when two or more clanmates finish a verified clear together."
      />
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
