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
          <ul className="gh-list">
            <li>
              <span className="ios-row-copy">
                <strong>Featured raids</strong>
                <small>{snapshot.featuredRaids.length ? snapshot.featuredRaids.join(' · ') : 'Updating'}</small>
              </span>
            </li>
            <li>
              <span className="ios-row-copy">
                <strong>Featured dungeons</strong>
                <small>{snapshot.featuredDungeons.length ? snapshot.featuredDungeons.join(' · ') : 'Updating'}</small>
              </span>
            </li>
            <li>
              <span className="ios-row-copy">
                <strong>{snapshot.nightfall || 'Nightfall'}</strong>
                <small>{snapshot.weekLabel} · {snapshot.resetsInLabel}</small>
              </span>
            </li>
          </ul>
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
          <ul className="gh-list">
            <li>
              <span className="ios-row-copy">
                <strong>US and Canada</strong>
                <small>{PRIZE_ELIGIBILITY.physicalPrize}</small>
              </span>
            </li>
            <li>
              <span className="ios-row-copy">
                <strong>UK</strong>
                <small>{PRIZE_ELIGIBILITY.giftCardPrize}</small>
              </span>
            </li>
          </ul>
          <details className="gh-disclosure">
            <summary>Details</summary>
            <p className="gh-lede">{PRIZE_ELIGIBILITY.summary}</p>
          </details>
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
        <ul className="gh-list">
          <li>
            <span className="ios-row-copy">
              <strong>{profile?.bungieDisplayName || 'Guardian'}</strong>
              <small>{(profile?.raidPoints ?? 0) + (profile?.dungeonPoints ?? 0)} pts</small>
            </span>
          </li>
          <li>
            <span className="ios-row-copy">
              <strong>Clears</strong>
              <small>{profile?.verifiedClears ?? 0}</small>
            </span>
          </li>
          <li>
            <span className="ios-row-copy">
              <strong>Stamps</strong>
              <small>{profile?.passport?.clearStamps ?? 0}</small>
            </span>
          </li>
          {(profile?.characters ?? []).map((character) => (
            <li key={character.characterId}>
              <span className="ios-row-copy">
                <strong>{character.characterClass}</strong>
                <small>{character.powerLevel || '—'} power</small>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {section === 'passport' && signedIn ? (
        <details className="gh-disclosure">
          <summary>Details</summary>
          <p className="gh-lede">Each verified full clear adds a stamp. A new teammate adds another.</p>
        </details>
      ) : null}
    </section>
  )
}
