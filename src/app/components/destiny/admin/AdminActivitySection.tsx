'use client'

import { useCallback, useEffect, useState } from 'react'
import { Activity, Loader2 } from 'lucide-react'
import type { AdminActivityEntry } from '@/lib/destiny/types'
import { GlassCard, LoadingBlock, SectionTitle, StatusPill } from '@/app/components/destiny/DestinyUi'
import { getDestinyTheme } from '@/app/components/destiny/destinyTheme'
import { cn } from '@/lib/utils'

const KIND_LABELS: Record<AdminActivityEntry['kind'], string> = {
  run_flagged: 'Run flagged',
  run_review: 'Run review',
  user_ban: 'User banned',
  user_unban: 'User unbanned',
  user_note: 'Staff note',
  staff_grant: 'Admin granted',
  staff_revoke: 'Admin revoked',
  prize_claim: 'Prize claim',
  season_finalize: 'Season',
  leaderboard_adjust: 'Leaderboard',
}

const KIND_TONE: Record<AdminActivityEntry['kind'], 'red' | 'gold' | 'purple' | 'green' | 'blue' | 'neutral'> = {
  run_flagged: 'red',
  run_review: 'gold',
  user_ban: 'red',
  user_unban: 'green',
  user_note: 'blue',
  staff_grant: 'green',
  staff_revoke: 'red',
  prize_claim: 'purple',
  season_finalize: 'gold',
  leaderboard_adjust: 'gold',
}

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

export default function AdminActivitySection({ darkMode }: { darkMode: boolean }) {
  const [feed, setFeed] = useState<AdminActivityEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const t = getDestinyTheme(darkMode)

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const res = await fetch('/api/destiny/admin/activity?limit=60', { credentials: 'include' })
      if (res.ok) {
        const json = await res.json()
        setFeed(json.feed ?? [])
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) return <LoadingBlock darkMode={darkMode} label="Loading activity…" />

  return (
    <GlassCard darkMode={darkMode}>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-cyan-400" />
          <SectionTitle
            title="Activity feed"
            subtitle="Flagged runs, staff actions, and moderation history"
            darkMode={darkMode}
          />
        </div>
        <button
          type="button"
          disabled={refreshing}
          onClick={() => void load(true)}
          className="text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-300"
        >
          {refreshing ? <Loader2 className="w-3 h-3 animate-spin inline" /> : 'Refresh'}
        </button>
      </div>

      {!feed.length ? (
        <p className={t.muted}>No activity yet. Flagged runs and staff actions will appear here.</p>
      ) : (
        <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
          {feed.map((entry) => (
            <div key={entry.id} className="rounded-lg px-3 py-2.5 bg-black/25 border border-white/[0.06]">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <StatusPill label={KIND_LABELS[entry.kind]} tone={KIND_TONE[entry.kind]} />
                <span className={cn('text-[10px] tabular-nums', t.caption)}>{formatWhen(entry.createdAt)}</span>
              </div>
              <p className={cn('text-sm font-medium', t.heading)}>{entry.summary}</p>
              {entry.detail ? <p className={cn('text-xs mt-1', t.muted)}>{entry.detail}</p> : null}
              <p className={cn('text-[10px] mt-1.5', t.caption)}>
                {entry.actorLabel ?? entry.actorId}
                {entry.targetLabel ? ` → ${entry.targetLabel}` : entry.targetUserId ? ` → ${entry.targetUserId}` : ''}
              </p>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  )
}
