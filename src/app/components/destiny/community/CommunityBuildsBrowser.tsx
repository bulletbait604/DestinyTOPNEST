'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { ARMOR_STAT_ORDER } from '@/lib/destiny/armorStats'
import {
  COMMUNITY_ACTIVITY_TAG_OPTIONS,
  COMMUNITY_CLASSES,
  communityClassLabel,
  type CommunityActivityTag,
  type CommunityBuildContent,
  type CommunityBuildPublic,
  type CommunityBuildSort,
} from '@/lib/destiny/communityBuildModel'
import type { DestinyCharacterClass } from '@/lib/destiny/types'
import CommunityBuildForm from '@/app/components/destiny/community/CommunityBuildForm'
import { EmptyBlock, GlassCard, LoadingBlock, SectionTitle } from '@/app/components/destiny/DestinyUi'
import { destinyPrimaryBtn, destinySecondaryBtn, getDestinyTheme } from '@/app/components/destiny/destinyTheme'
import { cn } from '@/lib/utils'

const fieldClass =
  'w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/35'

function BuildCard({ build }: { build: CommunityBuildPublic }) {
  return (
    <Link href={`/builds/${build.id}`} className="gh-row-card">
      <span className="ios-row-copy">
        <strong>{build.name}</strong>
        <small className="gh-muted">
          {communityClassLabel(build.characterClass)}
          {build.subclass ? ` · ${build.subclass}` : ''}
        </small>
      </span>
    </Link>
  )
}

async function errorMessage(res: Response, fallback: string): Promise<string> {
  const json = (await res.json().catch(() => ({}))) as { error?: string }
  return json.error || fallback
}

export default function CommunityBuildsBrowser({
  darkMode,
  signedIn = false,
  onLogin,
}: {
  darkMode: boolean
  signedIn?: boolean
  onLogin?: () => void
}) {
  const t = getDestinyTheme(darkMode)
  const [builds, setBuilds] = useState<CommunityBuildPublic[]>([])
  const [featured, setFeatured] = useState<CommunityBuildPublic[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [characterClass, setCharacterClass] = useState<DestinyCharacterClass | 'all'>('all')
  const [subclass, setSubclass] = useState('')
  const [debouncedSubclass, setDebouncedSubclass] = useState('')
  const [tag, setTag] = useState<CommunityActivityTag | 'all'>('all')
  const [stat, setStat] = useState<string>('all')
  const [sort, setSort] = useState<CommunityBuildSort>('new')
  const [scope, setScope] = useState<'public' | 'mine' | 'saved'>('public')
  const [offset, setOffset] = useState(0)
  const [composing, setComposing] = useState(false)
  const limit = 12

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQ(q.trim()), 250)
    return () => window.clearTimeout(timer)
  }, [q])

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSubclass(subclass.trim()), 250)
    return () => window.clearTimeout(timer)
  }, [subclass])

  useEffect(() => {
    setOffset(0)
  }, [debouncedQ, debouncedSubclass, characterClass, tag, stat, sort, scope])

  useEffect(() => {
    const params = new URLSearchParams()
    if (debouncedQ) params.set('q', debouncedQ)
    if (characterClass !== 'all') params.set('class', characterClass)
    if (debouncedSubclass) params.set('subclass', debouncedSubclass)
    if (tag !== 'all') params.set('tag', tag)
    if (stat !== 'all') params.set('stat', stat)
    params.set('sort', sort)
    params.set('scope', scope)
    params.set('limit', String(limit))
    params.set('offset', String(offset))

    const controller = new AbortController()
    setLoading(true)
    setError(null)
    void (async () => {
      try {
        const res = await fetch(`/api/destiny/community-builds?${params.toString()}`, {
          credentials: 'include',
          signal: controller.signal,
        })
        if (!res.ok) throw new Error(await errorMessage(res, 'Could not load shared builds.'))
        const json = (await res.json()) as { builds: CommunityBuildPublic[]; featured?: CommunityBuildPublic[]; total: number }
        setBuilds(json.builds ?? [])
        setFeatured(json.featured ?? [])
        setTotal(json.total ?? 0)
      } catch (err) {
        if ((err as { name?: string }).name === 'AbortError') return
        setError(err instanceof Error ? err.message : 'Could not load shared builds.')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    })()

    return () => controller.abort()
  }, [debouncedQ, debouncedSubclass, characterClass, tag, stat, sort, scope, offset])

  async function shareBuild(content: CommunityBuildContent) {
    const res = await fetch('/api/destiny/community-builds', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(content),
    })
    if (!res.ok) throw new Error(await errorMessage(res, 'Could not share this build.'))
    const json = (await res.json()) as { build: CommunityBuildPublic }
    window.location.assign(`/builds/${json.build.id}`)
  }

  return (
    <div className="space-y-4">
      <GlassCard darkMode={darkMode}>
        <SectionTitle title="Shared builds" darkMode={darkMode} />
        <div className="mt-4 flex flex-wrap gap-2">
          {signedIn ? (
            <button type="button" className={destinyPrimaryBtn(darkMode)} onClick={() => setComposing((open) => !open)}>
              {composing ? 'Close form' : 'Share a build'}
            </button>
          ) : onLogin ? (
            <button type="button" className={destinyPrimaryBtn(darkMode)} onClick={onLogin}>
              Sign in to share
            </button>
          ) : null}
          {signedIn ? (
            <div className="flex flex-wrap gap-2" role="group" aria-label="Whose builds">
              {(
                [
                  ['public', 'Everyone'],
                  ['mine', 'Mine'],
                  ['saved', 'Saved'],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={scope === value}
                  onClick={() => setScope(value)}
                  className={cn(
                    'px-3 py-2 rounded-lg text-sm border min-h-[44px]',
                    scope === value ? 'border-[var(--tn-arc)] text-white bg-white/10' : 'border-white/10 text-white/70'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        {composing && signedIn ? (
          <div className="mt-5">
            <CommunityBuildForm
              darkMode={darkMode}
              submitLabel="Share build"
              onCancel={() => setComposing(false)}
              onSubmit={shareBuild}
            />
          </div>
        ) : null}
      </GlassCard>

      <div className="gh-segments">
        <div className="gh-tabs" role="tablist" aria-label="Class">
          <button
            type="button"
            role="tab"
            className="gh-tab"
            aria-selected={characterClass === 'all'}
            onClick={() => setCharacterClass('all')}
          >
            All
          </button>
          {COMMUNITY_CLASSES.map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              className="gh-tab"
              aria-selected={characterClass === value}
              onClick={() => setCharacterClass(value)}
            >
              {communityClassLabel(value)}
            </button>
          ))}
        </div>
        <div className="gh-tabs" role="tablist" aria-label="Sort">
          {(
            [
              ['new', 'Newest'],
              ['top', 'Top'],
              ['saved', 'Saved'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              className="gh-tab"
              aria-selected={sort === value}
              onClick={() => setSort(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <details className="gh-disclosure">
        <summary>Filter</summary>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <label>
            <span className={cn('block text-[11px] uppercase tracking-wide mb-1', t.caption)}>Search</span>
            <input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Name, exotic, subclass"
              className={fieldClass}
              maxLength={80}
            />
          </label>
          <label>
            <span className={cn('block text-[11px] uppercase tracking-wide mb-1', t.caption)}>Subclass</span>
            <input
              value={subclass}
              onChange={(event) => setSubclass(event.target.value)}
              placeholder="Nightstalker"
              className={fieldClass}
              maxLength={48}
            />
          </label>
          <label>
            <span className={cn('block text-[11px] uppercase tracking-wide mb-1', t.caption)}>Activity</span>
            <select
              value={tag}
              onChange={(event) => setTag(event.target.value as CommunityActivityTag | 'all')}
              className={fieldClass}
            >
              <option value="all">All activities</option>
              {COMMUNITY_ACTIVITY_TAG_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-2 gh-tabs" role="tablist" aria-label="Armor stat">
          <button type="button" role="tab" className="gh-tab" aria-selected={stat === 'all'} onClick={() => setStat('all')}>
            Any stat
          </button>
          {ARMOR_STAT_ORDER.map((item) => (
            <button
              key={item.key}
              type="button"
              role="tab"
              className="gh-tab"
              aria-selected={stat === item.key}
              onClick={() => setStat(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </details>

      {!loading && featured.length > 0 ? (
        <section className="space-y-3" aria-labelledby="featured-builds-title">
          <h2 id="featured-builds-title" className={cn('text-lg font-semibold', t.gold)}>
            Featured
          </h2>
          <div className="ios-group">
            {featured.map((build) => (
              <BuildCard key={build.id} build={build} />
            ))}
          </div>
        </section>
      ) : null}

      {loading ? <LoadingBlock darkMode={darkMode} label="Loading shared builds…" /> : null}
      {!loading && error ? (
        <GlassCard darkMode={darkMode}>
          <p className="text-sm text-red-300" role="alert">
            {error}
          </p>
        </GlassCard>
      ) : null}
      {!loading && !error && builds.length === 0 && (featured.length === 0 || debouncedQ || characterClass !== 'all' || tag !== 'all' || stat !== 'all' || debouncedSubclass) ? (
        <EmptyBlock
          darkMode={darkMode}
          message={featured.length ? 'No player posts match' : 'No shared builds match'}
          hint="Try another filter, or share a loadout from your equipped gear."
        />
      ) : null}
      {!loading && !error && builds.length > 0 ? (
        <div className="ios-group">
          <h2 className={cn('px-4 pt-3 text-[17px] font-semibold', t.gold)}>Player posts</h2>
          {builds.map((build) => (
            <BuildCard key={build.id} build={build} />
          ))}
        </div>
      ) : null}

      {!loading && total > limit ? (
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            className={destinySecondaryBtn(darkMode)}
            disabled={offset === 0}
            onClick={() => setOffset((current) => Math.max(0, current - limit))}
          >
            Previous
          </button>
          <span className={cn('text-xs', t.muted)}>
            {offset + 1}–{Math.min(offset + limit, total)} of {total}
          </span>
          <button
            type="button"
            className={destinySecondaryBtn(darkMode)}
            disabled={offset + limit >= total || loading}
            onClick={() => setOffset((current) => current + limit)}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Next
          </button>
        </div>
      ) : null}
    </div>
  )
}
