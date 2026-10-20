'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import type { CommunityBuildPublic } from '@/lib/destiny/communityBuildModel'
import { communityClassLabel } from '@/lib/destiny/communityBuildModel'
import { GlassCard, LoadingBlock, SectionTitle } from '@/app/components/destiny/DestinyUi'
import { destinySecondaryBtn, getDestinyTheme } from '@/app/components/destiny/destinyTheme'
import { cn } from '@/lib/utils'

type StaffBuild = CommunityBuildPublic & { ownerUserId: string }

export default function AdminCommunityBuildsSection({
  darkMode,
  onAction,
}: {
  darkMode: boolean
  onAction?: () => void
}) {
  const t = getDestinyTheme(darkMode)
  const [builds, setBuilds] = useState<StaffBuild[]>([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/destiny/admin/community-builds', { credentials: 'include' })
      if (res.ok) {
        const json = (await res.json()) as { builds?: StaffBuild[] }
        setBuilds(json.builds ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function importFeatured() {
    setImporting(true)
    setMessage(null)
    try {
      const res = await fetch('/api/destiny/admin/featured-builds', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'import' }),
      })
      const json = (await res.json().catch(() => ({}))) as {
        error?: string
        inserted?: number
        updated?: number
        unchanged?: number
      }
      if (!res.ok) throw new Error(json.error || 'Import failed')
      setMessage(
        `Featured guides imported. ${json.inserted ?? 0} new, ${json.updated ?? 0} updated, ${json.unchanged ?? 0} already current.`
      )
      await load()
      onAction?.()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  async function moderate(buildId: string, action: 'hide' | 'restore' | 'remove' | 'delete') {
    if (action === 'delete' && !window.confirm('Delete this shared build permanently?')) return
    setActing(`${action}:${buildId}`)
    setMessage(null)
    try {
      const res = await fetch('/api/destiny/admin/community-builds', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, buildId }),
      })
      const json = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) throw new Error(json.error || 'Moderation failed')
      setMessage('Updated.')
      await load()
      onAction?.()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Moderation failed')
    } finally {
      setActing(null)
    }
  }

  if (loading) return <LoadingBlock darkMode={darkMode} label="Loading shared builds…" />

  return (
    <GlassCard darkMode={darkMode}>
      <SectionTitle
        title="Shared builds"
        subtitle="Hide player posts, or import the curated featured guides. Import is owner-only and safe to run again."
        darkMode={darkMode}
      />
      <button type="button" className={cn(destinySecondaryBtn(darkMode), 'mt-3')} disabled={importing} onClick={() => void importFeatured()}>
        {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        Import featured builds
      </button>
      {message ? <p className={cn('text-sm mt-3', t.muted)}>{message}</p> : null}
      <div className="mt-4 space-y-3">
        {builds.length === 0 ? <p className={cn('text-sm', t.muted)}>No shared builds yet.</p> : null}
        {builds.map((build) => (
          <div key={build.id} className="d2-panel-inset rounded-lg p-3 space-y-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <Link href={`/builds/${build.id}`} className="text-sm font-semibold text-white hover:underline">
                  {build.name}
                </Link>
                <p className={cn('text-xs mt-1', t.muted)}>
                  {communityClassLabel(build.characterClass)} · {build.ownerDisplayName} · {build.status} ·{' '}
                  {build.upvoteCount} upvotes
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={cn(destinySecondaryBtn(darkMode), 'text-xs py-2')}
                  disabled={acting !== null}
                  onClick={() => void moderate(build.id, build.status === 'published' ? 'hide' : 'restore')}
                >
                  {acting === `hide:${build.id}` || acting === `restore:${build.id}` ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : null}
                  {build.status === 'published' ? 'Hide' : 'Restore'}
                </button>
                <button
                  type="button"
                  className={cn(destinySecondaryBtn(darkMode), 'text-xs py-2')}
                  disabled={acting !== null}
                  onClick={() => void moderate(build.id, 'remove')}
                >
                  Remove
                </button>
                <button
                  type="button"
                  className={cn(destinySecondaryBtn(darkMode), 'text-xs py-2')}
                  disabled={acting !== null}
                  onClick={() => void moderate(build.id, 'delete')}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  )
}
