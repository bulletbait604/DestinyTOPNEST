'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, Gift, ImageIcon, Layers, Loader2, Trophy, X } from 'lucide-react'
import type { PrizeClaim, Season, SeasonWinner } from '@/lib/destiny/types'
import { DEFAULT_PRIZE_COPY, type PrizeCopy } from '@/lib/destiny/prizeCopy'
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
  const [season, setSeason] = useState<Season | null>(null)
  const [seasonName, setSeasonName] = useState('')
  const [seasonTagline, setSeasonTagline] = useState('')
  const [seasonStart, setSeasonStart] = useState('')
  const [seasonEnd, setSeasonEnd] = useState('')
  const [seasonMessage, setSeasonMessage] = useState<string | null>(null)
  const [seasonError, setSeasonError] = useState<string | null>(null)
  const [savingSeason, setSavingSeason] = useState(false)
  const [prizesEnabled, setPrizesEnabled] = useState(true)
  const [prizeCopy, setPrizeCopy] = useState<PrizeCopy>(DEFAULT_PRIZE_COPY)
  const [prizeMessage, setPrizeMessage] = useState<string | null>(null)
  const [prizeError, setPrizeError] = useState<string | null>(null)
  const [savingPrizes, setSavingPrizes] = useState(false)
  const t = getDestinyTheme(darkMode)
  const fieldClass =
    'w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-gray-500'

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
        const nextSeason = (json.season ?? null) as Season | null
        setSeason(nextSeason)
        setSeasonName(nextSeason?.name ?? '')
        setSeasonTagline(nextSeason?.tagline ?? '')
        setSeasonStart(nextSeason?.startDate ? new Date(nextSeason.startDate).toISOString().slice(0, 16) : '')
        setSeasonEnd(nextSeason?.endDate ? new Date(nextSeason.endDate).toISOString().slice(0, 16) : '')
        setPendingClaims(json.pendingClaims ?? [])
        setHallPreview(json.hallOfFamePreview ?? [])
        setCanFinalize(Boolean(json.canFinalize))
      }
      const contentRes = await fetch('/api/destiny/admin/site-content', { credentials: 'include' })
      if (contentRes.ok) {
        const content = await contentRes.json()
        setPrizesEnabled(content.prizesEnabled !== false)
        if (content.prizeCopy) setPrizeCopy(content.prizeCopy)
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

  async function saveSeasonSettings() {
    setSavingSeason(true)
    setSeasonError(null)
    setSeasonMessage(null)
    try {
      const res = await fetch('/api/destiny/admin/season', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_season',
          season: {
            name: seasonName.trim(),
            tagline: seasonTagline.trim(),
            startDate: seasonStart ? new Date(`${seasonStart}Z`).toISOString() : undefined,
            endDate: seasonEnd ? new Date(`${seasonEnd}Z`).toISOString() : undefined,
          },
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setSeasonError(typeof json.error === 'string' ? json.error : 'Could not save the season.')
        return
      }
      setSeasonMessage('Season settings saved.')
      await load()
      onAction?.()
    } finally {
      setSavingSeason(false)
    }
  }

  async function savePrizes() {
    setSavingPrizes(true)
    setPrizeError(null)
    setPrizeMessage(null)
    try {
      const res = await fetch('/api/destiny/admin/site-content', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_prizes', prizesEnabled, prizeCopy }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setPrizeError(typeof json.error === 'string' ? json.error : 'Could not save prizes.')
        return
      }
      setPrizeMessage('Prize settings saved.')
      onAction?.()
    } finally {
      setSavingPrizes(false)
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
        <SectionTitle
          title="Season settings"
          subtitle={season ? `Season ${season.seasonNumber ?? ''} · times are UTC`.trim() : 'Name, tagline, and dates for the current season.'}
          darkMode={darkMode}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
          <input className={fieldClass} value={seasonName} aria-label="Season name" placeholder="Season name" onChange={(event) => setSeasonName(event.target.value)} />
          <input className={fieldClass} value={seasonTagline} aria-label="Season tagline" placeholder="One-line tagline" onChange={(event) => setSeasonTagline(event.target.value)} />
          <input className={fieldClass} type="datetime-local" value={seasonStart} aria-label="Season start" onChange={(event) => setSeasonStart(event.target.value)} />
          <input className={fieldClass} type="datetime-local" value={seasonEnd} aria-label="Season end" onChange={(event) => setSeasonEnd(event.target.value)} />
        </div>
        {seasonError ? <p className="text-sm text-red-300 mt-3">{seasonError}</p> : null}
        {seasonMessage ? <p className="text-sm text-emerald-300 mt-3">{seasonMessage}</p> : null}
        <button
          type="button"
          disabled={savingSeason}
          onClick={() => void saveSeasonSettings()}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-amber-400/20 text-amber-100 ring-1 ring-amber-400/30"
        >
          {savingSeason ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Save season settings
        </button>
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

      {prizesEnabled ? (
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
      ) : (
        <GlassCard darkMode={darkMode}>
          <div className="flex items-center gap-2 mb-2">
            <Gift className="w-5 h-5 text-purple-400" />
            <SectionTitle title="Prize claims" darkMode={darkMode} />
          </div>
          <p className={cn('text-sm', t.muted)}>Prize claims are off. Players still earn badges, titles, and frames.</p>
        </GlassCard>
      )}

      <GlassCard darkMode={darkMode}>
        <div className="flex items-center gap-2 mb-2">
          <Gift className="w-5 h-5 text-purple-400" />
          <SectionTitle
            title="Prize names"
            subtitle="What winners see for USA and Canada, the UK, and the short label on each board."
            darkMode={darkMode}
          />
        </div>
        <label className={cn('flex items-center gap-2 text-sm mb-3', t.body)}>
          <input type="checkbox" checked={prizesEnabled} onChange={(event) => setPrizesEnabled(event.target.checked)} />
          Let winners claim a prize in the app
        </label>
        <div className="grid grid-cols-1 gap-2">
          <input className={fieldClass} aria-label="Print prize" value={prizeCopy.physicalPrize} onChange={(event) => setPrizeCopy((copy) => ({ ...copy, physicalPrize: event.target.value }))} />
          <input className={fieldClass} aria-label="Gift card" value={prizeCopy.giftCardPrize} onChange={(event) => setPrizeCopy((copy) => ({ ...copy, giftCardPrize: event.target.value }))} />
          <input className={fieldClass} aria-label="Board label" value={prizeCopy.cardLabel} onChange={(event) => setPrizeCopy((copy) => ({ ...copy, cardLabel: event.target.value }))} />
          <input className={fieldClass} aria-label="First place prize" value={prizeCopy.firstPlace} onChange={(event) => setPrizeCopy((copy) => ({ ...copy, firstPlace: event.target.value }))} />
        </div>
        {prizeError ? <p className="text-sm text-red-300 mt-3">{prizeError}</p> : null}
        {prizeMessage ? <p className="text-sm text-emerald-300 mt-3">{prizeMessage}</p> : null}
        <button
          type="button"
          disabled={savingPrizes}
          onClick={() => void savePrizes()}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-purple-400/20 text-purple-100 ring-1 ring-purple-400/30"
        >
          {savingPrizes ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Save prize settings
        </button>
      </GlassCard>
    </div>
  )
}
