'use client'

import { FormEvent, useEffect, useState } from 'react'
import {
  COMMUNITY_ACTIVITY_TAG_OPTIONS,
  COMMUNITY_CLASSES,
  communityClassLabel,
  type CommunityActivityTag,
  type CommunityBuildPublic,
} from '@/lib/destiny/communityBuildModel'
import { pinLoadoutForCompare, type LoadoutSide } from '@/lib/destiny/loadoutCompare'
import type { DestinyCharacterClass } from '@/lib/destiny/types'
import { NextStep } from '@/app/components/hub/clarity'
import { PageHeader } from '@/app/components/hub/PageHeader'
import { navigateDestinyTab } from '@/lib/routing/tabUrl'

export default function BuildLookup() {
  const [q, setQ] = useState('')
  const [characterClass, setCharacterClass] = useState<DestinyCharacterClass | 'all'>('all')
  const [tag, setTag] = useState<CommunityActivityTag | 'all'>('all')
  const [subclass, setSubclass] = useState('')
  const [builds, setBuilds] = useState<CommunityBuildPublic[]>([])
  const [total, setTotal] = useState(0)
  const [listError, setListError] = useState<string | null>(null)
  const [guardian, setGuardian] = useState('')
  const [equipped, setEquipped] = useState<LoadoutSide[]>([])
  const [equippedName, setEquippedName] = useState('')
  const [equippedError, setEquippedError] = useState<string | null>(null)
  const [looking, setLooking] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams({ sort: 'top', scope: 'public', limit: '12' })
      if (q.trim()) params.set('q', q.trim())
      if (characterClass !== 'all') params.set('class', characterClass)
      if (tag !== 'all') params.set('tag', tag)
      if (subclass.trim()) params.set('subclass', subclass.trim())
      void fetch(`/api/destiny/community-builds?${params}`, { credentials: 'include' })
        .then(async (res) => {
          if (!res.ok) throw new Error('Could not search shared builds.')
          return res.json() as Promise<{ builds?: CommunityBuildPublic[]; total?: number }>
        })
        .then((json) => {
          setBuilds(json.builds ?? [])
          setTotal(json.total ?? 0)
          setListError(null)
        })
        .catch((err: Error) => setListError(err.message))
    }, 250)
    return () => window.clearTimeout(timer)
  }, [q, characterClass, tag, subclass])

  async function onEquipped(event: FormEvent) {
    event.preventDefault()
    setLooking(true)
    setEquippedError(null)
    setEquipped([])
    try {
      const params = new URLSearchParams()
      const value = guardian.trim()
      if (/^\d{1,22}$/.test(value)) params.set('membershipId', value)
      else params.set('q', value)
      const res = await fetch(`/api/destiny/lookup/equipped?${params}`, { credentials: 'include' })
      const json = (await res.json()) as { error?: string; displayName?: string; loadouts?: LoadoutSide[] }
      if (!res.ok) throw new Error(json.error || 'Could not load that loadout.')
      setEquippedName(json.displayName ?? value)
      setEquipped(json.loadouts ?? [])
    } catch (err) {
      setEquippedError(err instanceof Error ? err.message : 'Could not load that loadout.')
    } finally {
      setLooking(false)
    }
  }

  return (
    <section className="gh-stack" aria-labelledby="gh-lookup-title">
      <PageHeader
        kicker="Builds"
        title="Find a build"
        subtitle="Search builds people posted, or the weapons and armor a Guardian has equipped."
        titleId="gh-lookup-title"
      />

      <form className="gh-search" onSubmit={onEquipped}>
        <label className="gh-sr" htmlFor="equipped-lookup">
          Guardian name
        </label>
        <input
          id="equipped-lookup"
          value={guardian}
          onChange={(event) => setGuardian(event.target.value)}
          placeholder="Bungie name#code or membership id"
        />
        <button type="submit">{looking ? 'Looking…' : 'Equipped'}</button>
      </form>
      {equippedError ? (
        <NextStep
          alert
          title="That loadout did not load"
          body={equippedError}
          actions={[{ label: 'Use a name and code', onClick: () => setGuardian('Name#1234') }]}
        />
      ) : null}
      {equipped.length > 0 ? (
        <div className="gh-rotation">
          {equipped.map((loadout) => (
            <article key={loadout.id} className="gh-card">
              <p className="gh-kicker">{equippedName}</p>
              <h3>{loadout.title}</h3>
              <p className="gh-muted">
                {loadout.exoticArmor} · {loadout.exoticWeapon}
              </p>
              <p className="gh-muted">{loadout.weapons}</p>
              <button
                type="button"
                className="gh-btn gh-btn-ghost"
                onClick={() => {
                  pinLoadoutForCompare(loadout)
                  navigateDestinyTab('compare')
                }}
              >
                Compare this loadout
              </button>
            </article>
          ))}
        </div>
      ) : null}

      <form className="gh-filters" onSubmit={(event) => event.preventDefault()}>
        <label>
          Shared builds
          <input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Name, exotic, subclass" />
        </label>
        <label>
          Class
          <select value={characterClass} onChange={(event) => setCharacterClass(event.target.value as DestinyCharacterClass | 'all')}>
            <option value="all">All</option>
            {COMMUNITY_CLASSES.map((value) => (
              <option key={value} value={value}>
                {communityClassLabel(value)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Subclass
          <input value={subclass} onChange={(event) => setSubclass(event.target.value)} placeholder="Any subclass" />
        </label>
        <label>
          Activity
          <select value={tag} onChange={(event) => setTag(event.target.value as CommunityActivityTag | 'all')}>
            <option value="all">All</option>
            {COMMUNITY_ACTIVITY_TAG_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </form>
      {listError ? (
        <NextStep
          alert
          title="Shared builds did not load"
          body={listError}
          actions={[{ label: 'Clear the search', onClick: () => setQ('') }]}
        />
      ) : null}
      <p className="gh-muted">{total} shared builds match.</p>
      <ul className="gh-directory">
        {builds.map((build) => (
          <li key={build.id}>
            <a className="gh-person" href={`/builds/${build.id}`}>
              <span className="gh-person-name">{build.name}</span>
              <span className="gh-muted">
                {build.ownerDisplayName} · {build.characterClass} · {build.subclass} · {build.activityTags.join(', ')}
              </span>
              <span className="gh-badge">{build.upvoteCount} likes</span>
            </a>
          </li>
        ))}
      </ul>
      <button type="button" className="gh-btn gh-btn-ghost" onClick={() => navigateDestinyTab('compare')}>
        Compare two of these
      </button>
    </section>
  )
}
