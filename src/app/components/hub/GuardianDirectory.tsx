'use client'

import { useCallback, useEffect, useState } from 'react'
import type { GuardianDirectoryCard, GuardianPublicProfile } from '@/lib/destiny/guardianDirectory'
import { classLabel } from '@/lib/destiny/guardianDirectory'
import { PageHeader } from '@/app/components/hub/PageHeader'
import { GUARDIAN_SEARCH_EVENT, navigateGuardianProfile, navigateGuardianSearch } from '@/lib/routing/tabUrl'

function readLocation() {
  if (typeof window === 'undefined') {
    return { q: '', guardian: null as string | null, membershipType: undefined as number | undefined }
  }
  const params = new URLSearchParams(window.location.search)
  const type = Number(params.get('membershipType') ?? '')
  return {
    q: params.get('q') ?? '',
    guardian: params.get('guardian'),
    membershipType: Number.isFinite(type) && type > 0 ? type : undefined,
  }
}

function statusLabel(status: GuardianDirectoryCard['status']): string {
  if (status === 'member') return 'On Top Nest'
  if (status === 'pending') return 'Pending sign-in'
  return 'Not signed up'
}

function formatWhen(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(date)
}

export default function GuardianDirectory({ onLogin }: { onLogin?: () => void }) {
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState('')
  const [guardianId, setGuardianId] = useState<string | null>(null)
  const [membershipType, setMembershipType] = useState<number | undefined>()
  const [cards, setCards] = useState<GuardianDirectoryCard[]>([])
  const [profile, setProfile] = useState<GuardianPublicProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const syncFromLocation = useCallback(() => {
    const next = readLocation()
    setQuery(next.q)
    setDraft(next.q)
    setGuardianId(next.guardian)
    setMembershipType(next.membershipType)
  }, [])

  useEffect(() => {
    syncFromLocation()
    window.addEventListener('popstate', syncFromLocation)
    window.addEventListener(GUARDIAN_SEARCH_EVENT, syncFromLocation)
    return () => {
      window.removeEventListener('popstate', syncFromLocation)
      window.removeEventListener(GUARDIAN_SEARCH_EVENT, syncFromLocation)
    }
  }, [syncFromLocation])

  useEffect(() => {
    if (guardianId) return
    if (query.trim().length < 2) {
      setCards([])
      setError(null)
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    const params = new URLSearchParams({ q: query.trim() })
    fetch(`/api/destiny/guardians?${params}`, { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Search failed')
        return response.json() as Promise<{ guardians?: GuardianDirectoryCard[] }>
      })
      .then((data) => {
        if (!cancelled) setCards(Array.isArray(data.guardians) ? data.guardians : [])
      })
      .catch(() => {
        if (!cancelled) setError('Guardian search is unavailable right now.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [query, guardianId])

  useEffect(() => {
    if (!guardianId) {
      setProfile(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    const params = new URLSearchParams()
    if (membershipType) params.set('type', String(membershipType))
    const qs = params.toString()
    fetch(`/api/destiny/guardians/${encodeURIComponent(guardianId)}${qs ? `?${qs}` : ''}`, { cache: 'no-store' })
      .then(async (response) => {
        if (response.status === 404) throw new Error('No guardian found for that id.')
        if (!response.ok) throw new Error('Profile failed')
        return response.json() as Promise<GuardianPublicProfile>
      })
      .then((data) => {
        if (!cancelled) setProfile(data)
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setProfile(null)
          setError(err.message || 'That profile could not load.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [guardianId, membershipType])

  if (guardianId) {
    return (
      <section className="gh-stack" aria-labelledby="gh-profile-title">
        <button type="button" className="gh-text-btn" onClick={() => navigateGuardianSearch(query)}>
          Back to directory
        </button>
        {loading && !profile ? <p className="gh-muted">Loading guardian…</p> : null}
        {error ? (
          <p className="gh-alert" role="alert">
            {error}
          </p>
        ) : null}
        {profile ? <ProfileBody profile={profile} onLogin={onLogin} /> : null}
      </section>
    )
  }

  return (
    <section className="gh-stack" aria-labelledby="gh-directory-title">
      <PageHeader
        kicker="Directory"
        title="Find a Guardian"
        subtitle="Search a Bungie name, including players who have not signed in."
        titleId="gh-directory-title"
      />
      <form
        className="gh-search"
        role="search"
        onSubmit={(event) => {
          event.preventDefault()
          navigateGuardianSearch(draft)
        }}
      >
        <label className="gh-sr" htmlFor="guardian-directory-search">
          Search guardians
        </label>
        <input
          id="guardian-directory-search"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Bungie name or Name#1234"
          autoComplete="off"
        />
        <button type="submit" className="gh-btn gh-btn-primary">
          Search
        </button>
      </form>
      {query.trim().length < 2 ? (
        <p className="gh-muted">Type at least two characters. Exact searches use the Bungie name code, like Ada#0042.</p>
      ) : null}
      {loading ? <p className="gh-muted">Searching…</p> : null}
      {error ? (
        <p className="gh-alert" role="alert">
          {error}
        </p>
      ) : null}
      {!loading && query.trim().length >= 2 && cards.length === 0 && !error ? (
        <div className="gh-empty">
          <p className="gh-card-title">No guardians matched</p>
          <p className="gh-muted">Try the full Bungie name with the four-digit code.</p>
        </div>
      ) : null}
      <ul className="gh-directory">
        {cards.map((card) => (
          <li key={card.membershipId}>
            <button
              type="button"
              className="gh-person"
              onClick={() => navigateGuardianProfile(card.membershipId, card.membershipType)}
            >
              <span className="gh-person-name">
                {card.displayName}
                {card.clanTag ? <small>[{card.clanTag}]</small> : null}
              </span>
              <span className="gh-muted">
                {statusLabel(card.status)} · {classLabel(card.characterClass)}
                {card.platform ? ` · ${card.platform}` : ''}
              </span>
              <span className="gh-badge-row">
                {card.badges.map((badge) => (
                  <span key={badge} className="gh-badge">
                    {badge}
                  </span>
                ))}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

function ProfileBody({ profile, onLogin }: { profile: GuardianPublicProfile; onLogin?: () => void }) {
  const { card } = profile
  return (
    <div className="gh-stack">
      <header className="gh-profile-head">
        <div>
          <p className="gh-kicker">{statusLabel(card.status)}</p>
          <h1 id="gh-profile-title">{card.displayName}</h1>
          <p className="gh-muted">
            {classLabel(card.characterClass)}
            {card.platform ? ` · ${card.platform}` : ''}
            {card.clanTag ? ` · [${card.clanTag}]` : ''}
          </p>
        </div>
        <div className="gh-rating">
          <p>
            <strong>{profile.teammateTitle}</strong>
            <span>
              Teammate {profile.teammateScore > 0 ? profile.teammateScore.toFixed(1) : '—'} · {profile.teammateReviews}{' '}
              reviews
            </span>
          </p>
          <p>
            <strong>{profile.sherpaTitle}</strong>
            <span>
              {profile.sherpaGuided} guided · {profile.sherpaMarks} sherpa marks
            </span>
          </p>
        </div>
      </header>

      <div className="gh-badge-row">
        {card.badges.map((badge) => (
          <span key={badge} className="gh-badge">
            {badge}
          </span>
        ))}
        {profile.reputationScore > 0 ? <span className="gh-badge">Reputation {profile.reputationScore.toFixed(1)}</span> : null}
      </div>

      <div className="gh-stat-grid">
        {profile.stats.map((stat) => (
          <article key={stat.label} className="gh-stat">
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
          </article>
        ))}
      </div>

      <div className="gh-split">
        <section className="gh-card" aria-labelledby="gh-activities">
          <h2 id="gh-activities">Recent activities</h2>
          {profile.recentActivities.length === 0 ? (
            <p className="gh-muted">No verified Top Nest clears on record yet.</p>
          ) : (
            <ul className="gh-list">
              {profile.recentActivities.map((activity) => (
                <li key={activity.id}>
                  <span>
                    {activity.activityName}
                    <small className="gh-muted"> · {activity.type}</small>
                  </span>
                  <span className="gh-muted">{formatWhen(activity.completedAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="gh-card" aria-labelledby="gh-characters">
          <h2 id="gh-characters">Characters</h2>
          {profile.characters.length === 0 ? (
            <p className="gh-muted">Character cards appear when Bungie returns a public profile.</p>
          ) : (
            <ul className="gh-list">
              {profile.characters.map((character) => (
                <li key={character.characterId}>
                  <span>{classLabel(character.className)}</span>
                  <span className="gh-muted">{character.power ? `${character.power} power` : 'Power hidden'}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="gh-split">
        <GearList title="Equipped highlights" id="gh-equipped" items={profile.equippedHighlights} empty="Equipped weapons show up from the public profile." />
        <GearList
          title="Vault highlights"
          id="gh-vault"
          items={profile.vaultHighlights}
          empty="The vault stays private until this Guardian signs in. Their own profile still pulls the full vault."
        />
      </div>

      {card.status !== 'member' && onLogin ? (
        <div className="gh-card gh-gate">
          <h2>This Guardian has not joined yet</h2>
          <p className="gh-muted">
            MVP and kudos votes are already stored on membership id {card.membershipId}. Signing in with that Bungie
            account claims them.
          </p>
          <button type="button" className="gh-btn gh-btn-primary" onClick={onLogin}>
            Sign in with Bungie
          </button>
        </div>
      ) : null}
    </div>
  )
}

function GearList({
  title,
  id,
  items,
  empty,
}: {
  title: string
  id: string
  items: GuardianPublicProfile['equippedHighlights']
  empty: string
}) {
  return (
    <section className="gh-card" aria-labelledby={id}>
      <h2 id={id}>{title}</h2>
      {items.length === 0 ? (
        <p className="gh-muted">{empty}</p>
      ) : (
        <ul className="gh-list">
          {items.map((item) => (
            <li key={`${item.source}-${item.name}`}>
              <span>{item.name}</span>
              <span className="gh-muted">{item.source}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
