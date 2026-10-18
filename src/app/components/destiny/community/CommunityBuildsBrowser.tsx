'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { ARMOR_STAT_ORDER } from '@/lib/destiny/armorStats'
import {
  COMMUNITY_ACTIVITY_TAG_OPTIONS,
  COMMUNITY_CLASSES,
  communityActivityTagLabel,
  communityClassLabel,
  type CommunityActivityTag,
  type CommunityBuildContent,
  type CommunityBuildPublic,
  type CommunityBuildSort,
} from '@/lib/destiny/communityBuildModel'
import type { DestinyCharacterClass } from '@/lib/destiny/types'
import CommunityBuildForm from '@/app/components/destiny/community/CommunityBuildForm'
import { EmptyBlock, GlassCard, ItemIcon, LoadingBlock, SectionTitle } from '@/app/components/destiny/DestinyUi'
import { destinyPrimaryBtn, destinySecondaryBtn, getDestinyTheme } from '@/app/components/destiny/destinyTheme'
import { cn } from '@/lib/utils'

const fieldClass =
  'w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/35'

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
        const json = (await res.json()) as { builds: CommunityBuildPublic[]; total: number }
        setBuilds(json.builds ?? [])
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
        <SectionTitle
          title="Shared builds"
          subtitle="Gear other players posted. Sign in to share yours or upvote one you like."
          darkMode={darkMode}
        />
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

      <GlassCard darkMode={darkMode}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
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
            <span className={cn('block text-[11px] uppercase tracking-wide mb-1', t.caption)}>Class</span>
            <select
              value={characterClass}
              onChange={(event) => setCharacterClass(event.target.value as DestinyCharacterClass | 'all')}
              className={fieldClass}
            >
              <option value="all">All classes</option>
              {COMMUNITY_CLASSES.map((value) => (
                <option key={value} value={value}>
                  {communityClassLabel(value)}
                </option>
              ))}
            </select>
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
          <label>
            <span className={cn('block text-[11px] uppercase tracking-wide mb-1', t.caption)}>Sort</span>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as CommunityBuildSort)}
              className={fieldClass}
            >
              <option value="new">Newest</option>
              <option value="top">Top voted</option>
              <option value="saved">Most saved</option>
            </select>
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            aria-pressed={stat === 'all'}
            onClick={() => setStat('all')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs border min-h-[36px]',
              stat === 'all' ? 'border-white/40 text-white' : 'border-white/10 text-white/60'
            )}
          >
            Any stat
          </button>
          {ARMOR_STAT_ORDER.map((item) => (
            <button
              key={item.key}
              type="button"
              aria-pressed={stat === item.key}
              onClick={() => setStat(item.key)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs border min-h-[36px]',
                stat === item.key ? 'border-[var(--tn-arc)] text-white' : 'border-white/10 text-white/60'
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </GlassCard>

      {loading ? <LoadingBlock darkMode={darkMode} label="Loading shared builds…" /> : null}
      {!loading && error ? (
        <GlassCard darkMode={darkMode}>
          <p className="text-sm text-red-300" role="alert">
            {error}
          </p>
        </GlassCard>
      ) : null}
      {!loading && !error && builds.length === 0 ? (
        <EmptyBlock
          darkMode={darkMode}
          message="No shared builds match"
          hint="Try another filter, or share a loadout from your equipped gear."
        />
      ) : null}
      {!loading && !error && builds.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {builds.map((build) => (
            <Link
              key={build.id}
              href={`/builds/${build.id}`}
              className="d2-panel-inset p-4 rounded-lg space-y-3 block hover:bg-white/[0.03]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="d2-panel-header-title text-sm truncate">{build.name}</p>
                  <p className={cn('text-xs mt-1', t.muted)}>
                    {communityClassLabel(build.characterClass)} · {build.subclass}
                  </p>
                </div>
                {build.ownerEmblemUrl ? <ItemIcon iconUrl={build.ownerEmblemUrl} name={build.ownerDisplayName} size={36} /> : null}
              </div>
              <p className={cn('text-sm', t.body)}>
                {build.exoticArmor || 'No exotic armor'}
                {' · '}
                {build.exoticWeapon || 'No exotic weapon'}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {build.activityTags.map((activity) => (
                  <span key={activity} className="rounded-md border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white/70">
                    {communityActivityTagLabel(activity)}
                  </span>
                ))}
              </div>
              <p className={cn('text-xs', t.caption)}>
                {build.upvoteCount} upvotes · {build.saveCount} saves · {build.ownerDisplayName}
                {build.status !== 'published' ? ` · ${build.status}` : ''}
              </p>
            </Link>
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
