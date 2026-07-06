'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Trophy } from 'lucide-react'
import type {
  LeaderboardAdjustment,
  LeaderboardCategory,
  LeaderboardEntry,
  LeaderboardPeriod,
} from '@/lib/destiny/types'
import {
  GlassCard,
  LeaderboardTable,
  LoadingBlock,
  SectionTitle,
  SegmentedControl,
  StatusPill,
} from '@/app/components/destiny/DestinyUi'
import { getDestinyTheme } from '@/app/components/destiny/destinyTheme'
import { cn } from '@/lib/utils'

const CATEGORIES: { value: LeaderboardCategory; label: string }[] = [
  { value: 'raid', label: 'Raids' },
  { value: 'dungeon', label: 'Dungeons' },
  { value: 'pantheon', label: 'Pantheon' },
  { value: 'top_guardians', label: 'Top Guardians' },
]

const PERIODS: { value: LeaderboardPeriod; label: string }[] = [
  { value: 'season', label: 'Season' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'all_time', label: 'All time' },
]

export default function AdminLeaderboardsSection({
  darkMode,
  onAction,
}: {
  darkMode: boolean
  onAction?: () => void
}) {
  const [category, setCategory] = useState<LeaderboardCategory>('raid')
  const [period, setPeriod] = useState<LeaderboardPeriod>('season')
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [adjustments, setAdjustments] = useState<LeaderboardAdjustment[]>([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [entryKey, setEntryKey] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [points, setPoints] = useState('')
  const [pointsDelta, setPointsDelta] = useState('')
  const [notes, setNotes] = useState('')

  const t = getDestinyTheme(darkMode)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ category, period })
      const res = await fetch(`/api/destiny/admin/leaderboards?${params}`, { credentials: 'include' })
      if (!res.ok) {
        setError('Failed to load leaderboard.')
        return
      }
      const json = await res.json()
      setEntries(json.entries ?? [])
      setAdjustments(json.adjustments ?? [])
    } finally {
      setLoading(false)
    }
  }, [category, period])

  useEffect(() => {
    void load()
  }, [load])

  async function postAction(action: string, extra?: Record<string, unknown>) {
    if (!entryKey.trim()) {
      setError('Entry id is required (site user id or Pantheon squad key).')
      return
    }
    setActing(true)
    setError(null)
    try {
      const res = await fetch('/api/destiny/admin/leaderboards', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          entryKey: entryKey.trim(),
          displayName: displayName.trim() || undefined,
          category,
          period,
          notes: notes.trim() || undefined,
          ...extra,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json.error ?? 'Adjustment failed.')
        return
      }
      await load()
      onAction?.()
    } finally {
      setActing(false)
    }
  }

  return (
    <div className="space-y-4">
      <GlassCard darkMode={darkMode}>
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-5 h-5 text-amber-400" />
          <SectionTitle
            title="Leaderboard adjustments"
            subtitle="Override points, add deltas, or exclude entries — changes apply site-wide"
            darkMode={darkMode}
          />
        </div>

        <div className="space-y-4 mb-4">
          <SegmentedControl
            label="Category"
            options={CATEGORIES}
            value={category}
            onChange={setCategory}
            darkMode={darkMode}
          />
          <SegmentedControl
            label="Period"
            options={PERIODS.filter((p) => category !== 'top_guardians' || p.value !== 'weekly')}
            value={period}
            onChange={setPeriod}
            darkMode={darkMode}
          />
        </div>

        {loading ? (
          <LoadingBlock darkMode={darkMode} label="Loading board…" />
        ) : (
          <>
            <LeaderboardTable entries={entries} darkMode={darkMode} />
            {adjustments.length > 0 ? (
              <div className="mt-4 pt-4 border-t border-white/10">
                <p className={cn('text-xs font-medium mb-2', t.caption)}>Active manual adjustments</p>
                <div className="space-y-2">
                  {adjustments.map((adj) => (
                    <div
                      key={adj.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg px-3 py-2 bg-amber-500/10 border border-amber-500/20"
                    >
                      <div>
                        <p className="text-sm text-white">
                          {adj.displayName ?? adj.entryKey}
                          {adj.excluded ? ' · excluded' : ''}
                          {adj.pointsOverride != null ? ` · override ${adj.pointsOverride} pts` : ''}
                          {adj.pointsDelta != null ? ` · Δ${adj.pointsDelta} pts` : ''}
                        </p>
                        {adj.notes ? <p className={cn('text-xs', t.muted)}>{adj.notes}</p> : null}
                      </div>
                      <button
                        type="button"
                        disabled={acting}
                        className="text-xs px-2 py-1 rounded bg-white/5 border border-white/10"
                        onClick={() => {
                          setEntryKey(adj.entryKey)
                          void postAction('clear')
                        }}
                      >
                        Clear
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </>
        )}
      </GlassCard>

      <GlassCard darkMode={darkMode}>
        <SectionTitle title="Apply adjustment" subtitle="Pick a row below or enter an id manually" darkMode={darkMode} />

        {error ? <p className="text-red-400 text-sm mb-3">{error}</p> : null}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <input
            value={entryKey}
            onChange={(e) => setEntryKey(e.target.value)}
            placeholder="Entry id (user id or squad key)"
            className="rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-sm text-white"
          />
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Display label (optional, for Pantheon squads)"
            className="rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-sm text-white"
          />
          <input
            value={points}
            onChange={(e) => setPoints(e.target.value)}
            placeholder="Set total points"
            type="number"
            className="rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-sm text-white"
          />
          <input
            value={pointsDelta}
            onChange={(e) => setPointsDelta(e.target.value)}
            placeholder="Add/subtract points (delta)"
            type="number"
            className="rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-sm text-white"
          />
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Staff notes (optional)"
          rows={2}
          className="w-full mb-4 rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-xs text-white"
        />

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={acting || !points}
            onClick={() => void postAction('set_points', { points: Number(points) })}
            className="px-3 py-2 rounded-lg text-xs bg-amber-500/20 text-amber-100 border border-amber-500/30"
          >
            {acting ? <Loader2 className="w-3 h-3 animate-spin inline" /> : null} Set points
          </button>
          <button
            type="button"
            disabled={acting || !pointsDelta}
            onClick={() => void postAction('add_delta', { pointsDelta: Number(pointsDelta) })}
            className="px-3 py-2 rounded-lg text-xs bg-blue-500/20 text-blue-100 border border-blue-500/30"
          >
            Add delta
          </button>
          <button
            type="button"
            disabled={acting}
            onClick={() => void postAction('exclude')}
            className="px-3 py-2 rounded-lg text-xs bg-red-500/20 text-red-100 border border-red-500/30"
          >
            Exclude from board
          </button>
        </div>

        {entries.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {entries.map((entry) => (
              <button
                key={entry.userId}
                type="button"
                onClick={() => {
                  setEntryKey(entry.userId)
                  setDisplayName(entry.bungieDisplayName)
                  setPoints(String(entry.points))
                }}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 bg-white/[0.04] border border-white/10 hover:border-white/20"
              >
                <span className="text-xs text-white">
                  #{entry.rank} {entry.bungieDisplayName}
                </span>
                {entry.hasManualAdjustment ? <StatusPill label="Adj" tone="gold" /> : null}
              </button>
            ))}
          </div>
        ) : null}

        <p className={cn('text-[11px] mt-4', t.muted)}>
          Adjustments merge with synced run scores and affect Home, Leaderboards, and season prizes.
        </p>
      </GlassCard>
    </div>
  )
}
