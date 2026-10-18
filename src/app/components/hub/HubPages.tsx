'use client'

import type { ReactNode } from 'react'
import type { PublicFeaturedBuild, PublicHubSnapshot, PublicTopGuardian } from '@/lib/destiny/publicHub'
import { navigateGuardianSearch } from '@/lib/routing/tabUrl'
import BoardsHub from '@/app/components/hub/BoardsHub'
import { formatEventWhen, openHubTab, usePublicHub } from '@/app/components/hub/hubTypes'

function EmptyNote({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="gh-empty">
      <p className="gh-card-title">{title}</p>
      <p className="gh-muted">{children}</p>
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

export function ScoringList({ notes }: { notes: PublicHubSnapshot['scoring'] }) {
  return (
    <section className="gh-section" aria-labelledby="gh-scoring-title">
      <h2 id="gh-scoring-title">How scoring works</h2>
      <div className="gh-grid">
        {notes.map((note) => (
          <article key={note.title} className="gh-card">
            <h3>{note.title}</h3>
            <p className="gh-muted">{note.body}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

function BoardState({
  loading,
  error,
  children,
}: {
  loading: boolean
  error: string | null
  children: ReactNode
}) {
  if (loading) return <p className="gh-muted">Loading the public board…</p>
  if (error) {
    return (
      <p className="gh-alert" role="alert">
        {error}
      </p>
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
            <p className="gh-kicker">{contract.tierPoints} tier points</p>
            <h3>{contract.title}</h3>
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
      <EmptyNote title="No sherpas on the board yet">
        Sherpa credit appears after a verified clear where a guide who already knows the activity helps someone
        on their first clear. Sign in, sync a run, and teach a first-timer.
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
      <EmptyNote title="No clan standings yet">
        A clan shows up after two clanmates finish a verified clear together. Clan tags are saved when someone in
        that clan syncs the run.
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
          <h1>Find your fireteam. Rate the run.</h1>
          <p className="gh-lede">
            This week&apos;s rotation, the Guardians climbing Raid, Dungeon, and New Bonds, and the builds people are
            sharing. USA and Canada winners get a Destiny 2 3D print. UK winners get a $50 CAD Steam gift card. Other
            countries can compete and are not eligible.
          </p>
          <div className="gh-actions">
            <button type="button" className="gh-btn gh-btn-primary" onClick={onLogin}>
              Sign in with Bungie
            </button>
            <button type="button" className="gh-btn gh-btn-ghost" onClick={() => openHubTab('guardians')}>
              Browse guardians
            </button>
            <button type="button" className="gh-btn gh-btn-ghost" onClick={() => openHubTab('leaderboards')}>
              Open the boards
            </button>
          </div>
        </div>
        <form
          className="gh-search gh-hero-search"
          role="search"
          onSubmit={(event) => {
            event.preventDefault()
            const data = new FormData(event.currentTarget)
            navigateGuardianSearch(String(data.get('q') ?? ''))
          }}
        >
          <label className="gh-sr" htmlFor="hub-home-search">
            Search guardians
          </label>
          <input id="hub-home-search" name="q" placeholder="Search a Bungie name" autoComplete="off" />
          <button type="submit">Search</button>
        </form>
      </section>

      <BoardState loading={loading} error={error}>
        {snapshot ? (
          <>
            <RotationStrip snapshot={snapshot} />
            <div className="gh-split">
              <section className="gh-card" aria-labelledby="gh-live">
                <div className="gh-section-head">
                  <h2 id="gh-live">Live fireteams</h2>
                  <button type="button" className="gh-text-btn" onClick={() => openHubTab('fireteam')}>
                    LFG
                  </button>
                </div>
                {snapshot.fireteams.length === 0 ? (
                  <p className="gh-muted">No open rooms this hour. Post one after you sign in.</p>
                ) : (
                  <ul className="gh-list">
                    {snapshot.fireteams.slice(0, 4).map((room) => (
                      <li key={room.id}>
                        <span>
                          {room.activityName} · {room.hostDisplayName}
                        </span>
                        <span className="gh-muted">
                          {room.currentPlayers}/{room.maxPlayers}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
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
            </div>
            <FeaturedBuilds builds={snapshot.featuredBuilds} />
            <section className="gh-section" aria-labelledby="gh-contracts-preview">
              <div className="gh-section-head">
                <h2 id="gh-contracts-preview">This week&apos;s contracts</h2>
                <button type="button" className="gh-text-btn" onClick={() => openHubTab('contracts')}>
                  All contracts
                </button>
              </div>
              <ContractList snapshot={snapshot} featured />
            </section>
            <div className="gh-split">
              <section className="gh-card" aria-labelledby="gh-sherpa-preview">
                <div className="gh-section-head">
                  <h2 id="gh-sherpa-preview">Top sherpas</h2>
                  <button type="button" className="gh-text-btn" onClick={() => openHubTab('sherpas')}>
                    Hall of fame
                  </button>
                </div>
                <SherpaList snapshot={snapshot} />
              </section>
              <section className="gh-card" aria-labelledby="gh-clan-preview">
                <div className="gh-section-head">
                  <h2 id="gh-clan-preview">Clan standings</h2>
                  <button type="button" className="gh-text-btn" onClick={() => openHubTab('clans')}>
                    Divisions
                  </button>
                </div>
                <ClanList snapshot={snapshot} />
              </section>
            </div>
            {!snapshot.historyComplete ? (
              <p className="gh-muted">Older clears are capped, so a long-time guide may be missing from this preview.</p>
            ) : null}
            <ScoringList notes={snapshot.scoring} />
          </>
        ) : null}
      </BoardState>
    </div>
  )
}

function RotationStrip({ snapshot }: { snapshot: PublicHubSnapshot }) {
  const cards = [
    { label: 'Featured raids', value: snapshot.featuredRaids.join(' · ') || 'Rotation loading' },
    { label: 'Featured dungeons', value: snapshot.featuredDungeons.join(' · ') || 'Rotation loading' },
    { label: 'Nightfall', value: snapshot.nightfall || 'Grandmaster not posted' },
  ]
  return (
    <section className="gh-section" aria-labelledby="gh-rotation">
      <div className="gh-section-head">
        <h2 id="gh-rotation">This week&apos;s rotation</h2>
        <p className="gh-kicker">
          {snapshot.weekLabel} · resets in {snapshot.resetsInLabel}
        </p>
      </div>
      <div className="gh-rotation">
        {cards.map((card) => (
          <article key={card.label} className="gh-card">
            <p className="gh-kicker">{card.label}</p>
            <h3>{card.value}</h3>
          </article>
        ))}
      </div>
    </section>
  )
}

function TopGuardianList({ rows }: { rows: PublicTopGuardian[] }) {
  if (!rows.length) {
    return <p className="gh-muted">Top guardians show up after a verified clear this season.</p>
  }
  return (
    <ul className="gh-list">
      {rows.map((row) => (
        <li key={`${row.board}-${row.rank}-${row.displayName}`}>
          <button type="button" className="gh-text-btn" onClick={() => navigateGuardianSearch(row.displayName)}>
            #{row.rank} {row.displayName}
          </button>
          <span className="gh-muted">
            {row.boardLabel} · {row.points} pts
          </span>
        </li>
      ))}
    </ul>
  )
}

function FeaturedBuilds({ builds }: { builds: PublicFeaturedBuild[] }) {
  return (
    <section className="gh-section" aria-labelledby="gh-builds">
      <div className="gh-section-head">
        <h2 id="gh-builds">Featured builds</h2>
        <button type="button" className="gh-text-btn" onClick={() => openHubTab('loadouts')}>
          All builds
        </button>
      </div>
      {builds.length === 0 ? (
        <div className="gh-empty">
          <p className="gh-card-title">No shared builds yet</p>
          <p className="gh-muted">Sign in and publish the loadout you are wearing.</p>
        </div>
      ) : (
        <div className="gh-rotation">
          {builds.map((build) => (
            <a key={build.id} className="gh-card gh-build-card" href={`/builds/${build.id}`}>
              <p className="gh-kicker">
                {build.characterClass} · {build.activity}
              </p>
              <h3>{build.name}</h3>
              <p className="gh-muted">
                {build.subclass} · {build.likes} likes · {build.ownerDisplayName}
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
      <header>
        <h1>Weekly contracts</h1>
        <p className="gh-lede">
          Finish any of these once before the Tuesday reset. Tier points unlock titles and frames. They never change
          leaderboard points.
        </p>
      </header>
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
      <header>
        <h1>Sherpa hall of fame</h1>
        <p className="gh-lede">
          A sherpa already had a verified clear. The learner did not. One guided clear is one point. The learner&apos;s
          MVP vote adds one more.
        </p>
      </header>
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
      <header>
        <h1>Clan Wars</h1>
        <p className="gh-lede">
          Standings count verified clears with at least two clanmates. A first clear for one of those clanmates adds a
          recruit bonus. Ember starts at 0, Ash at 10, Iron at 25, and Steel at 50.
        </p>
      </header>
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
      <header>
        <h1>Community Night Ops</h1>
        <p className="gh-lede">
          Scheduled streamer and clan sessions. A badge is yours when a verified clear finishes inside the event
          window.
        </p>
      </header>
      <BoardState loading={loading} error={error}>
        {snapshot && snapshot.events.length === 0 ? (
          <EmptyNote title="No Night Ops scheduled">
            When the community posts an event, it will show up here with a Kick or Twitch link. Until then, grab a
            weekly contract or post a fireteam.
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
      <header>
        <h1>Find a fireteam</h1>
        <p className="gh-lede">
          Open rooms from Guardians who are looking for players. Sign in to join, apply, or post your own.
        </p>
      </header>
      <BoardState loading={loading} error={error}>
        {snapshot && snapshot.fireteams.length === 0 ? (
          <EmptyNote title="No open fireteams right now">
            Be the first to post a raid, dungeon, or teaching run after you sign in.
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
          title="Post or join from your account"
          body="The list above is public. Joining a room, inviting friends, and leaving a review happens after you sign in."
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
