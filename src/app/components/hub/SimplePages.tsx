'use client'

import { useEffect, useState } from 'react'
import CommunityBuildsBrowser from '@/app/components/destiny/community/CommunityBuildsBrowser'
import InGameLoadoutShare from '@/app/components/destiny/community/InGameLoadoutShare'
import GuardianDirectory from '@/app/components/hub/GuardianDirectory'
import LoadoutCompare from '@/app/components/hub/LoadoutCompare'
import QuestLookup from '@/app/components/hub/QuestLookup'
import { BoardState, ContractList, HubClans, HubSherpas } from '@/app/components/hub/HubPages'
import { usePublicHub } from '@/app/components/hub/hubTypes'
import { PageHeader } from '@/app/components/hub/PageHeader'
import { SignInPrompt } from '@/app/components/hub/clarity'
import SeasonRulesPanel from '@/app/components/nest/SeasonRulesPanel'
import { PRIZE_ELIGIBILITY } from '@/lib/destiny/seasonCatalog'
import {
  buildsHref,
  readBuildsSection,
  type BuildsSection,
  type CommunitySection,
  type ProfileSection,
} from '@/lib/destiny/pageCatalog'
import type { CharacterSummary } from '@/lib/destiny/types'

function Segments<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { id: T; label: string }[]
  onChange: (next: T) => void
}) {
  return (
    <div className="gh-segments" role="tablist" aria-label={label}>
      <div className="gh-tabs">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            role="tab"
            className="gh-tab"
            aria-selected={value === option.id}
            onClick={() => onChange(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function BuildsHub({
  initial = 'shared',
  signedIn = false,
  onLogin,
}: {
  initial?: BuildsSection
  signedIn?: boolean
  onLogin?: () => void
}) {
  const [section, setSection] = useState<BuildsSection>(initial)

  useEffect(() => {
    setSection(readBuildsSection(initial))
  }, [initial])

  function choose(next: BuildsSection) {
    const href = buildsHref(next)
    const here = `${window.location.pathname}${window.location.search}`
    if (here === href) {
      setSection(next)
      return
    }
    window.location.assign(href)
  }

  return (
    <section className="gh-stack" aria-labelledby="gh-builds-title">
      <PageHeader
        kicker="Builds"
        title="Builds"
        subtitle="Shared builds, the loadouts saved in Destiny, and a side-by-side compare."
        titleId="gh-builds-title"
      />
      <Segments
        label="Builds"
        value={section}
        onChange={choose}
        options={[
          { id: 'shared', label: 'Shared Builds' },
          { id: 'mine', label: 'Save My Loadouts' },
          { id: 'compare', label: 'Compare' },
        ]}
      />
      {section === 'shared' ? <CommunityBuildsBrowser darkMode signedIn={signedIn} onLogin={onLogin} /> : null}
      {section === 'mine' ? <InGameLoadoutShare darkMode signedIn={signedIn} onLogin={onLogin} /> : null}
      {section === 'compare' ? <LoadoutCompare bare /> : null}
    </section>
  )
}

export function CommunityHub({
  section,
  onLogin,
}: {
  section: CommunitySection
  onLogin?: () => void
}) {
  function choose(next: CommunitySection) {
    const href = next === 'teachers' ? '/sherpas' : next === 'clans' ? '/clans' : '/people'
    if (window.location.pathname === href) return
    window.location.assign(href)
  }

  return (
    <section className="gh-stack" aria-labelledby="gh-community-title">
      <PageHeader
        kicker="Community"
        title="Community"
        subtitle="Find players, teachers, and clans."
        titleId="gh-community-title"
      />
      <Segments
        label="Community"
        value={section}
        onChange={choose}
        options={[
          { id: 'players', label: 'Players' },
          { id: 'teachers', label: 'Teachers' },
          { id: 'clans', label: 'Clans' },
        ]}
      />
      {section === 'players' ? <GuardianDirectory onLogin={onLogin} /> : null}
      {section === 'teachers' ? <HubSherpas bare /> : null}
      {section === 'clans' ? <HubClans bare /> : null}
    </section>
  )
}

function WeekSpotlight() {
  const { snapshot, loading, error } = usePublicHub()
  return (
    <BoardState loading={loading} error={error}>
      {snapshot ? (
        <>
          <div className="gh-grid">
            <article className="gh-card">
              <p className="gh-kicker">{snapshot.weekLabel}</p>
              <h3>Featured raids</h3>
              <p className="gh-muted">{snapshot.featuredRaids.length ? snapshot.featuredRaids.join(' · ') : 'Updating this week'}</p>
            </article>
            <article className="gh-card">
              <p className="gh-kicker">Resets in {snapshot.resetsInLabel}</p>
              <h3>Featured dungeons</h3>
              <p className="gh-muted">
                {snapshot.featuredDungeons.length ? snapshot.featuredDungeons.join(' · ') : 'Updating this week'}
              </p>
            </article>
            <article className="gh-card">
              <p className="gh-kicker">Nightfall</p>
              <h3>{snapshot.nightfall || 'Nightfall updating'}</h3>
            </article>
          </div>
          <ContractList snapshot={snapshot} />
          {snapshot.events.length ? (
            <p className="gh-muted">
              Events: {snapshot.events.map((event) => event.title).join(' · ')}
            </p>
          ) : null}
        </>
      ) : null}
    </BoardState>
  )
}

export function WeeklyHub({ onLogin }: { onLogin?: () => void }) {
  return (
    <section className="gh-stack" aria-labelledby="gh-weekly-title">
      <PageHeader
        kicker="This week"
        title="Weekly & Quests"
        subtitle="Featured activities, weekly goals, and a quest search."
        titleId="gh-weekly-title"
      />
      <WeekSpotlight />
      <QuestLookup onLogin={onLogin} bare />
    </section>
  )
}

interface ProfilePayload {
  bungieDisplayName?: string
  raidPoints?: number
  dungeonPoints?: number
  verifiedClears?: number
  characters?: CharacterSummary[]
  passport?: { clearStamps?: number }
}

export function ProfileHub({
  section,
  signedIn = false,
  onLogin,
}: {
  section: ProfileSection
  signedIn?: boolean
  onLogin?: () => void
}) {
  const [profile, setProfile] = useState<ProfilePayload | null>(null)

  useEffect(() => {
    if (!signedIn) return
    let cancelled = false
    void fetch('/api/destiny/profile', { credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) return null
        const json = (await res.json()) as { profile?: ProfilePayload }
        return json.profile ?? null
      })
      .then((next) => {
        if (!cancelled) setProfile(next)
      })
      .catch(() => {
        if (!cancelled) setProfile(null)
      })
    return () => {
      cancelled = true
    }
  }, [signedIn])

  function choose(next: ProfileSection) {
    const href = next === 'passport' ? '/passport' : next === 'prizes' ? '/rules' : '/profile'
    if (window.location.pathname === href) return
    window.location.assign(href)
  }

  return (
    <section className="gh-stack" aria-labelledby="gh-profile-title">
      <PageHeader
        kicker="You"
        title="Profile & Prizes"
        subtitle="Characters, season score, stamps, and who can win."
        titleId="gh-profile-title"
      />
      <Segments
        label="Profile"
        value={section}
        onChange={choose}
        options={[
          { id: 'guardian', label: 'Guardian' },
          { id: 'passport', label: 'Passport' },
          { id: 'prizes', label: 'Prizes' },
        ]}
      />
      {section === 'prizes' ? (
        <div className="gh-stack">
          <article className="gh-card">
            <h3>Season 1 prizes</h3>
            <p>US and Canada: {PRIZE_ELIGIBILITY.physicalPrize}.</p>
            <p>UK: {PRIZE_ELIGIBILITY.giftCardPrize}.</p>
            <p className="gh-muted">{PRIZE_ELIGIBILITY.summary}</p>
          </article>
          <SeasonRulesPanel />
        </div>
      ) : null}
      {section !== 'prizes' && !signedIn ? (
        <SignInPrompt
          onLogin={onLogin}
          reason="Sign in to see your characters, season score, and passport stamps."
        />
      ) : null}
      {section !== 'prizes' && signedIn ? (
        <div className="gh-grid">
          <article className="gh-card">
            <p className="gh-kicker">{profile?.bungieDisplayName || 'Linked Guardian'}</p>
            <h3>Season score</h3>
            <p>
              {(profile?.raidPoints ?? 0) + (profile?.dungeonPoints ?? 0)} points · {profile?.verifiedClears ?? 0} clears
            </p>
            <p className="gh-muted">{profile?.passport?.clearStamps ?? 0} passport stamps</p>
          </article>
          {(profile?.characters ?? []).map((character) => (
            <article key={character.characterId} className="gh-card">
              <p className="gh-kicker">{character.characterClass}</p>
              <h3>{character.powerLevel || '—'} power</h3>
              {character.title ? <p className="gh-muted">{character.title}</p> : null}
            </article>
          ))}
          {section === 'passport' ? (
            <article className="gh-card">
              <h3>Passport</h3>
              <p className="gh-muted">
                Each verified full clear adds a stamp. A teammate you have not cleared with before adds another.
              </p>
            </article>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
