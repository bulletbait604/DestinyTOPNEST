'use client'

import type { ReactNode } from 'react'
import type { PublicFeaturedBuild, PublicHubSnapshot, PublicTopGuardian } from '@/lib/destiny/publicHub'
import { navigateDestinyTab, navigateGuardianSearch } from '@/lib/routing/tabUrl'
import { RateButton } from '@/app/components/hub/QuickRate'
import BoardsHub from '@/app/components/hub/BoardsHub'
import AskGuide from '@/app/components/hub/AskGuide'
import { HowItWorks, NextStep } from '@/app/components/hub/clarity'
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

export function HubHome({
  snapshot,
  loading,
  error,
  onLogin,
}: {
  snapshot: PublicHubSnapshot | null
  loading: boolean
  error: string | null
  onLogin: () => void
}) {
  return (
    <div className="gh-stack">
      <section className="gh-hero">
        <div>
          <p className="gh-kicker">Guardian Hub</p>
          <h1>Find your fireteam</h1>
          <p className="gh-lede">Play with new friends.</p>
          <div className="gh-actions">
            <button type="button" className="gh-btn gh-btn-primary" onClick={onLogin}>
              Sign in with Bungie
            </button>
            <a className="gh-btn gh-btn-ghost" href="/rate">
              Rate a Guardian
            </a>
          </div>
        </div>
      </section>
      <AskGuide compact />

      <BoardState loading={loading} error={error} onRetry={() => window.location.reload()}>
        {snapshot ? (
          <>
            <section className="gh-status" aria-label="This season">
              <p>
                <span className="gh-kicker">This season</span>
                {snapshot.weekLabel} · resets in {snapshot.resetsInLabel}
              </p>
              <p className="gh-rotation">
                Featured raids: {snapshot.featuredRaids.join(' · ') || 'Rotation loading'}. Featured dungeons:{' '}
                {snapshot.featuredDungeons.join(' · ') || 'Rotation loading'}.
              </p>
              <button type="button" className="gh-text-btn" onClick={() => navigateDestinyTab('season')}>
                Prize rules
              </button>
            </section>
            <section className="gh-card" aria-labelledby="gh-top">
              <div className="gh-section-head">
                <h2 id="gh-top">Top guardians</h2>
                <button type="button" className="gh-text-btn" onClick={() => openHubTab('leaderboards')}>
                  Full boards
                </button>
              </div>
              <TopGuardianList rows={snapshot.topGuardians} />
            </section>
            <FeaturedBuilds builds={snapshot.featuredBuilds} onLogin={onLogin} />
          </>
        ) : null}
      </BoardState>

      <details className="gh-disclosure">
        <summary>More about TopNest</summary>
        <HowItWorks onLogin={onLogin} />
      </details>
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

export function ConnectedHome({ onLogin }: { onLogin: () => void }) {
  const state = usePublicHub()
  return <HubHome {...state} onLogin={onLogin} />
}
