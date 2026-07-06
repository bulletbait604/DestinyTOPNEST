'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, ShieldAlert, Trash2, Users } from 'lucide-react'
import type { FireteamLobby } from '@/lib/destiny/types'
import { GlassCard, LoadingBlock, SectionTitle } from '@/app/components/destiny/DestinyUi'
import { destinySecondaryBtn, getDestinyTheme } from '@/app/components/destiny/destinyTheme'
import { cn } from '@/lib/utils'

function roomMemberCount(lobby: FireteamLobby): number {
  return 1 + (lobby.memberRoster?.length ?? lobby.memberUserIds?.length ?? 0)
}

export default function AdminFireteamSection({
  darkMode,
  onAction,
  compact = false,
}: {
  darkMode: boolean
  onAction?: () => void
  compact?: boolean
}) {
  const [rooms, setRooms] = useState<FireteamLobby[]>([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [targetUserId, setTargetUserId] = useState('')
  const t = getDestinyTheme(darkMode)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/destiny/admin/fireteam', { credentials: 'include' })
      if (res.ok) {
        const json = await res.json()
        setRooms(json.rooms ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function postAction(
    action: 'delete' | 'clear_all' | 'force_clear_user',
    lobbyId?: string,
    userId?: string
  ) {
    if (action === 'clear_all') {
      const ok = window.confirm(
        rooms.length > 0
          ? `Delete all ${rooms.length} FlierTeam room${rooms.length === 1 ? '' : 's'}? This cannot be undone.`
          : 'Run a full FlierTeam database purge anyway? This removes any hidden or stale room records.'
      )
      if (!ok) return
    } else if (action === 'delete' && lobbyId) {
      const ok = window.confirm('Delete this FlierTeam room? This cannot be undone.')
      if (!ok) return
    } else if (action === 'force_clear_user') {
      const normalized = userId?.trim().toLowerCase()
      if (!normalized) return
      const ok = window.confirm(`Force-clear all FlierTeam links for ${normalized}?`)
      if (!ok) return
    }

    setActing(action === 'clear_all' ? 'clear_all' : action === 'force_clear_user' ? 'force_clear_user' : lobbyId ?? 'delete')
    setMessage(null)
    try {
      const res = await fetch('/api/destiny/admin/fireteam', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, lobbyId, userId: userId?.trim().toLowerCase() }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? 'Action failed')
      setMessage(json.message ?? 'Done.')
      await load()
      onAction?.()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed')
    } finally {
      setActing(null)
    }
  }

  if (loading) {
    return <LoadingBlock darkMode={darkMode} label="Loading moderator tools…" />
  }

  return (
    <GlassCard darkMode={darkMode} padding={compact ? 'compact' : undefined}>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-300" />
            <SectionTitle
              title={compact ? 'Moderator tools' : 'FlierTeam rooms'}
              subtitle={
                compact
                  ? 'Clear stuck listings from the database'
                  : 'Moderate open listings and remove stale or abusive rooms'
              }
              darkMode={darkMode}
              compact={compact}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={acting !== null}
            onClick={() => void load()}
            className={cn(destinySecondaryBtn(darkMode), 'text-xs py-2')}
          >
            Refresh
          </button>
          <button
            type="button"
            disabled={acting !== null}
            onClick={() => void postAction('clear_all')}
            className={cn(
              'inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-colors',
              'border-red-500/30 text-red-200/90 hover:border-red-400/50',
              acting !== null && 'opacity-40 cursor-not-allowed'
            )}
          >
            {acting === 'clear_all' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Clear all rooms
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-2 mb-4">
        <label className="flex-1 min-w-[180px]">
          <span className={cn('block text-[11px] uppercase tracking-wide mb-1', t.caption)}>
            Force-clear user
          </span>
          <input
            type="text"
            value={targetUserId}
            onChange={(event) => setTargetUserId(event.target.value)}
            placeholder="Site username, e.g. bulletbait604"
            className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/35"
          />
        </label>
        <button
          type="button"
          disabled={acting !== null || !targetUserId.trim()}
          onClick={() => void postAction('force_clear_user', undefined, targetUserId)}
          className={cn(
            destinySecondaryBtn(darkMode),
            'text-xs py-2 text-red-200/90 border-red-500/30',
            (acting !== null || !targetUserId.trim()) && 'opacity-40 cursor-not-allowed'
          )}
        >
          {acting === 'force_clear_user' ? 'Clearing…' : 'Clear user room'}
        </button>
      </div>

      {message ? <p className={cn('text-sm mb-4', t.muted)}>{message}</p> : null}

      <p className={cn('text-sm mb-3', t.muted)}>
        {rooms.length === 0
          ? 'No FlierTeam rooms in the database. Use Clear all rooms to purge any stale records, or force-clear a specific user if Create room stays blocked.'
          : `${rooms.length} room${rooms.length === 1 ? '' : 's'} in the database.`}
      </p>

      {!compact && rooms.length > 0 ? (
        <div className="space-y-3">
          {rooms.map((room) => (
            <div
              key={room.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3"
            >
              <div className="min-w-0">
                <p className="text-sm text-white font-medium truncate">
                  {room.activityName}
                  {room.encounterName ? ` · ${room.encounterName}` : ''}
                </p>
                <p className={cn('text-xs mt-0.5', t.muted)}>
                  Host: {room.hostDisplayName} · {room.status} ·{' '}
                  <span className="inline-flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {roomMemberCount(room)}/{room.maxPlayers}
                  </span>
                </p>
                <p className={cn('text-[11px] mt-0.5 font-mono', t.muted)}>{room.id}</p>
              </div>
              <button
                type="button"
                disabled={acting !== null}
                onClick={() => void postAction('delete', room.id)}
                className={cn(
                  'inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs transition-colors',
                  'border-red-500/30 text-red-200/90 hover:border-red-400/50',
                  acting !== null && 'opacity-40 cursor-not-allowed'
                )}
              >
                {acting === room.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                Delete
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {compact && rooms.length > 0 ? (
        <div className="space-y-2">
          {rooms.map((room) => (
            <div
              key={room.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2"
            >
              <p className={cn('text-xs truncate', t.body)}>
                {room.hostDisplayName} · {room.activityName} · {room.status}
              </p>
              <button
                type="button"
                disabled={acting !== null}
                onClick={() => void postAction('delete', room.id)}
                className={cn(
                  'inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px]',
                  'border-red-500/30 text-red-200/90 hover:border-red-400/50'
                )}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </GlassCard>
  )
}
