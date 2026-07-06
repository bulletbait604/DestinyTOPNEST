'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, Gift, ImageIcon, Layers, Loader2, Trophy, X } from 'lucide-react'
import type { PrizeClaim, SeasonWinner } from '@/lib/destiny/types'
import { GlassCard, LoadingBlock, SectionTitle } from '@/app/components/destiny/DestinyUi'
import { getDestinyTheme } from '@/app/components/destiny/destinyTheme'
import { cn } from '@/lib/utils'

export default function AdminSeasonSection({
  darkMode,
  onAction,
}: {
  darkMode: boolean
  onAction?: () => void
}) {
  const [pendingClaims, setPendingClaims] = useState<PrizeClaim[]>([])
  const [hallPreview, setHallPreview] = useState<SeasonWinner[]>([])
  const [canFinalize, setCanFinalize] = useState(false)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<string | null>(null)
  const [finalizing, setFinalizing] = useState(false)
  const [lootStatus, setLootStatus] = useState<{
    weekLabel?: string
    builtAt?: string
    activityCount?: number
    dropCount?: number
    missingIconCount?: number
    featuredActivities?: string[]
  } | null>(null)
  const [rebuildingLoot, setRebuildingLoot] = useState(false)
  const [metaBuildStatus, setMetaBuildStatus] = useState<{
    weekLabel?: string
    syncedAt?: string
    resetAt?: string
    buildsRefreshed?: number
    buildsAdded?: number
    buildCount?: number
    needsSync?: boolean
    featuredActivities?: string[]
    resetTimeLabel?: string
  } | null>(null)
  const [syncingMetaBuilds, setSyncingMetaBuilds] = useState(false)
  const t = getDestinyTheme(darkMode)

  const loadMetaBuildStatus = useCallback(async () => {
    const res = await fetch('/api/destiny/admin/meta-builds', { credentials: 'include' })
    if (res.ok) {
      const json = await res.json()
      setMetaBuildStatus(json)
    }
  }, [])

  const loadLootStatus = useCallback(async () => {
    const res = await fetch('/api/destiny/admin/loot-icons', { credentials: 'include' })
    if (res.ok) {
      const json = await res.json()
      setLootStatus(json)
    }
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [seasonRes] = await Promise.all([
        fetch('/api/destiny/admin/season', { credentials: 'include' }),
        loadLootStatus(),
        loadMetaBuildStatus(),
      ])
      if (seasonRes.ok) {
        const json = await seasonRes.json()
        setPendingClaims(json.pendingClaims ?? [])
        setHallPreview(json.hallOfFamePreview ?? [])
        setCanFinalize(Boolean(json.canFinalize))
      }
    } finally {
      setLoading(false)
    }
  }, [loadLootStatus, loadMetaBuildStatus])

  useEffect(() => {
    void load()
  }, [load])

  async function finalizeSeason() {
    setFinalizing(true)
    try {
      await fetch('/api/destiny/admin/season', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'finalize' }),
      })
      await load()
      onAction?.()
    } finally {
      setFinalizing(false)
    }
  }

  async function rebuildLootIcons() {
    setRebuildingLoot(true)
    try {
      const res = await fetch('/api/destiny/admin/loot-icons', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'rebuild' }),
      })
      if (res.ok) {
        const json = await res.json()
        setLootStatus(json)
      }
      onAction?.()
    } finally {
      setRebuildingLoot(false)
    }
  }

  async function syncMetaBuilds() {
    setSyncingMetaBuilds(true)
    try {
      const res = await fetch('/api/destiny/admin/meta-builds', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync' }),
      })
      if (res.ok) {
        const json = await res.json()
        setMetaBuildStatus(json)
      }
      onAction?.()
    } finally {
      setSyncingMetaBuilds(false)
    }
  }

  async function updateClaim(claimId: string, claimStatus: 'fulfilled' | 'rejected') {
    setActing(claimId)
    try {
      await fetch('/api/destiny/admin/season', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_claim', claimId, claimStatus }),
      })
      setPendingClaims((claims) => claims.filter((c) => c.id !== claimId))
      onAction?.()
    } finally {
      setActing(null)
    }
  }

  if (loading) return <LoadingBlock darkMode={darkMode} label="Loading season admin…" />

  return (
    <div className="space-y-4">
      <GlassCard darkMode={darkMode}>
        <div className="flex items-center gap-2 mb-2">
          <Trophy className="w-5 h-5 text-amber-400" />
          <SectionTitle
            title="Season finalization"
            subtitle="Lock hall of fame winners and stop live season scoring"
            darkMode={darkMode}
          />
        </div>
        {canFinalize ? (
          <button
            type="button"
            disabled={finalizing}
            onClick={() => void finalizeSeason()}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium',
              'bg-amber-400/20 text-amber-100 ring-1 ring-amber-400/30'
            )}
          >
            {finalizing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Finalize season & lock winners
          </button>
        ) : (
          <p className={t.muted}>Season already archived — winners are locked.</p>
        )}
        {hallPreview.length > 0 && (
          <div className="mt-4 space-y-1">
            <p className={cn('text-xs font-medium', t.caption)}>Current leaders preview</p>
            {hallPreview.slice(0, 6).map((w, i) => (
              <p key={i} className={cn('text-xs', t.muted)}>
                #{w.rank} {w.displayName} · {w.category.replace(/_/g, ' ')}
              </p>
            ))}
          </div>
        )}
      </GlassCard>

      <GlassCard darkMode={darkMode}>
        <div className="flex items-center gap-2 mb-2">
          <ImageIcon className="w-5 h-5 text-sky-400" />
          <SectionTitle
            title="Weekly loot icons"
            subtitle="Rebuild home-page drop icons from the Bungie manifest"
            darkMode={darkMode}
          />
        </div>
        {lootStatus ? (
          <div className="space-y-2">
            <p className={cn('text-xs', t.muted)}>
              {lootStatus.weekLabel ?? 'Current week'}
              {lootStatus.builtAt
                ? ` · Last built ${new Date(lootStatus.builtAt).toLocaleString()}`
                : ' · Not built yet'}
            </p>
            <p className={cn('text-xs', t.body)}>
              {lootStatus.activityCount ?? 0} activities · {lootStatus.dropCount ?? 0} drops
              {(lootStatus.missingIconCount ?? 0) > 0 ? (
                <span className="text-amber-300"> · {lootStatus.missingIconCount} missing icons</span>
              ) : null}
            </p>
            {lootStatus.featuredActivities?.length ? (
              <p className={cn('text-xs', t.muted)}>{lootStatus.featuredActivities.join(' · ')}</p>
            ) : null}
          </div>
        ) : (
          <p className={t.muted}>No snapshot loaded for this reset week.</p>
        )}
        <button
          type="button"
          disabled={rebuildingLoot}
          onClick={() => void rebuildLootIcons()}
          className={cn(
            'mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium',
            'bg-sky-400/20 text-sky-100 ring-1 ring-sky-400/30'
          )}
        >
          {rebuildingLoot ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Rebuild loot icons
        </button>
      </GlassCard>

      <GlassCard darkMode={darkMode}>
        <div className="flex items-center gap-2 mb-2">
          <Layers className="w-5 h-5 text-violet-400" />
          <SectionTitle
            title="Weekly meta builds"
            subtitle="Refresh curated builds and spotlight picks for featured raids/dungeons"
            darkMode={darkMode}
          />
        </div>
        {metaBuildStatus ? (
          <div className="space-y-2">
            <p className={cn('text-xs', t.muted)}>
              {metaBuildStatus.weekLabel ?? 'Current week'}
              {metaBuildStatus.syncedAt
                ? ` · Last synced ${new Date(metaBuildStatus.syncedAt).toLocaleString()}`
                : metaBuildStatus.needsSync
                  ? ' · Not synced yet this week'
                  : ''}
            </p>
            <p className={cn('text-xs', t.body)}>
              {metaBuildStatus.buildsRefreshed ?? 0} curated refreshed ·{' '}
              {metaBuildStatus.buildsAdded ?? 0} weekly spotlight
              {typeof metaBuildStatus.buildCount === 'number'
                ? ` · ${metaBuildStatus.buildCount} total tracked`
                : ''}
            </p>
            {metaBuildStatus.featuredActivities?.length ? (
              <p className={cn('text-xs', t.muted)}>{metaBuildStatus.featuredActivities.join(' · ')}</p>
            ) : null}
          </div>
        ) : (
          <p className={t.muted}>No sync status loaded for this reset week.</p>
        )}
        <button
          type="button"
          disabled={syncingMetaBuilds}
          onClick={() => void syncMetaBuilds()}
          className={cn(
            'mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium',
            'bg-violet-400/20 text-violet-100 ring-1 ring-violet-400/30'
          )}
        >
          {syncingMetaBuilds ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Run weekly meta sync
        </button>
      </GlassCard>

      <GlassCard darkMode={darkMode}>
        <div className="flex items-center gap-2 mb-2">
          <Gift className="w-5 h-5 text-purple-400" />
          <SectionTitle title="Pending prize claims" darkMode={darkMode} />
        </div>
        {!pendingClaims.length ? (
          <p className={t.muted}>No pending prize claims.</p>
        ) : (
          <div className="space-y-3">
            {pendingClaims.map((claim) => (
              <div key={claim.id} className="rounded-xl p-4 bg-black/30 border border-purple-500/20">
                <p className="text-white font-semibold">
                  {claim.userId} · {claim.category.replace(/_/g, ' ')} #{claim.rank}
                </p>
                <p className={cn('text-xs mt-1', t.muted)}>{claim.prize}</p>
                <p className={cn('text-xs mt-1', t.body)}>
                  {claim.platform} · {claim.contact}
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <button
                    type="button"
                    disabled={acting === claim.id}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-emerald-500/20 text-emerald-200 border border-emerald-500/40"
                    onClick={() => void updateClaim(claim.id, 'fulfilled')}
                  >
                    <Check className="w-3 h-3" /> Fulfilled
                  </button>
                  <button
                    type="button"
                    disabled={acting === claim.id}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-red-500/20 text-red-200 border border-red-500/40"
                    onClick={() => void updateClaim(claim.id, 'rejected')}
                  >
                    <X className="w-3 h-3" /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  )
}
