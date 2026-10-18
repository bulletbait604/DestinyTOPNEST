'use client'

import { useEffect, useState } from 'react'
import {
  COMMUNITY_ACTIVITY_TAG_OPTIONS,
  COMMUNITY_CLASSES,
  communityClassLabel,
  type CommunityActivityTag,
  type CommunityBuildPublic,
} from '@/lib/destiny/communityBuildModel'
import {
  compareLoadoutSides,
  loadoutSideFromCommunityBuild,
  readPinnedLoadout,
  type LoadoutSide,
} from '@/lib/destiny/loadoutCompare'
import type { DestinyCharacterClass } from '@/lib/destiny/types'

async function loadBuilds(q: string, characterClass: string, tag: string, subclass: string) {
  const params = new URLSearchParams({ sort: 'top', scope: 'public', limit: '8' })
  if (q.trim()) params.set('q', q.trim())
  if (characterClass !== 'all') params.set('class', characterClass)
  if (tag !== 'all') params.set('tag', tag)
  if (subclass.trim()) params.set('subclass', subclass.trim())
  const res = await fetch(`/api/destiny/community-builds?${params}`, { credentials: 'include' })
  if (!res.ok) throw new Error('Could not load shared builds.')
  const json = (await res.json()) as { builds?: CommunityBuildPublic[] }
  return json.builds ?? []
}

export default function LoadoutCompare() {
  const [q, setQ] = useState('')
  const [characterClass, setCharacterClass] = useState<DestinyCharacterClass | 'all'>('all')
  const [tag, setTag] = useState<CommunityActivityTag | 'all'>('all')
  const [subclass, setSubclass] = useState('')
  const [builds, setBuilds] = useState<CommunityBuildPublic[]>([])
  const [left, setLeft] = useState<LoadoutSide | null>(null)
  const [right, setRight] = useState<LoadoutSide | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const pinned = readPinnedLoadout()
    if (pinned) setLeft(pinned)
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadBuilds(q, characterClass, tag, subclass)
        .then((rows) => {
          setBuilds(rows)
          setError(null)
        })
        .catch((err: Error) => setError(err.message))
    }, 250)
    return () => window.clearTimeout(timer)
  }, [q, characterClass, tag, subclass])

  const rows = left && right ? compareLoadoutSides(left, right) : []

  return (
    <section className="gh-stack" aria-labelledby="gh-compare-title">
      <header>
        <p className="gh-kicker">Loadouts</p>
        <h1 id="gh-compare-title">Compare two builds</h1>
        <p className="gh-lede">
          Filter shared loadouts by class, subclass, and activity, then set one on each side. Likes are the upvote
          count.
        </p>
      </header>
      <form className="gh-filters" onSubmit={(event) => event.preventDefault()}>
        <label>
          Search
          <input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Name or exotic" />
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
          <input value={subclass} onChange={(event) => setSubclass(event.target.value)} placeholder="Nightstalker" />
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
      {error ? (
        <p className="gh-alert" role="alert">
          {error}
        </p>
      ) : null}
      <div className="gh-split">
        <Picker title="Left" builds={builds} selectedId={left?.id} onPick={(build) => setLeft(loadoutSideFromCommunityBuild(build))} />
        <Picker title="Right" builds={builds} selectedId={right?.id} onPick={(build) => setRight(loadoutSideFromCommunityBuild(build))} />
      </div>
      {left && right ? (
        <div className="gh-compare" role="table" aria-label="Loadout comparison">
          <div className="gh-compare-row gh-compare-head" role="row">
            <span />
            <span>
              {left.title}
              <small>{left.likes ?? 0} likes · {left.ownerName}</small>
            </span>
            <span>
              {right.title}
              <small>{right.likes ?? 0} likes · {right.ownerName}</small>
            </span>
          </div>
          {rows.map((row) => (
            <div key={row.label} className={row.same ? 'gh-compare-row is-same' : 'gh-compare-row'} role="row">
              <span>{row.label}</span>
              <span>{row.left}</span>
              <span>{row.right}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="gh-muted">Choose a build for each side.</p>
      )}
    </section>
  )
}

function Picker({
  title,
  builds,
  selectedId,
  onPick,
}: {
  title: string
  builds: CommunityBuildPublic[]
  selectedId?: string
  onPick: (build: CommunityBuildPublic) => void
}) {
  return (
    <section className="gh-card" aria-label={title}>
      <h2>{title}</h2>
      {builds.length === 0 ? <p className="gh-muted">No shared builds match these filters.</p> : null}
      <ul className="gh-list">
        {builds.map((build) => (
          <li key={`${title}-${build.id}`}>
            <button type="button" className="gh-text-btn" aria-pressed={selectedId === build.id} onClick={() => onPick(build)}>
              {build.name}
            </button>
            <span className="gh-muted">
              {build.characterClass} · {build.subclass} · {build.upvoteCount} likes
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
