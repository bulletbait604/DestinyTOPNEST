'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Trash2, Users } from 'lucide-react'
import type { FireteamLobby } from '@/lib/destiny/types'
import { GlassCard, LoadingBlock, SectionTitle } from '@/app/components/destiny/DestinyUi'
import { getDestinyTheme } from '@/app/components/destiny/destinyTheme'
import { cn } from '@/lib/utils'

function roomMemberCount(lobby: FireteamLobby): number {
  return 1 + (lobby.memberRoster?.length ?? lobby.memberUserIds?.length ?? 0)
}

export default function AdminFireteamSection({
  darkMode,
  onAction,
}: {
  darkMode: boolean
  onAction?: () => void
}) {
  const [rooms, setRooms] = useState<FireteamLobby[]>([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
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

  async function postAction(action: 'delete' | 'clear_all', lobbyId?: string) {
    if (action === 'clear_all') {
      const ok = window.confirm(
        `Delete all ${rooms.length} FlierTeam room${rooms.length === 1 ? '' : 's'}? This cannot be undone.`
      )
      if (!ok) return
    } else if (lobbyId) {
      const ok = window.confirm('Delete this FlierTeam room? This cannot be undone.')
      if (!ok) return
    }

    setActing(action === 'clear_all' ? 'clear_all' : lobbyId ?? 'delete')
    setMessage(null)
    try {
      const res = await fetch('/api/destiny/admin/fireteam', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, lobbyId }),
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

  if (loading) return <LoadingBlock darkMode={darkMode} label="Loading FlierTeam rooms…" />

  return (
    <GlassCard darkMode={darkMode}>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <SectionTitle
          title="FlierTeam rooms"
          subtitle="Moderate open listings and remove stale or abusive rooms"
          darkMode={darkMode}
        />
        <button
          type="button"
          disabled={acting !== null || rooms.length === 0}
          onClick={() => void postAction('clear_all')}
          className={cn(
            'inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-colors',
            'border-red-500/30 text-red-200/90 hover:border-red-400/50',
            (acting !== null || rooms.length === 0) && 'opacity-40 cursor-not-allowed'
          )}
        >
          {acting === 'clear_all' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          Clear all rooms
        </button>
      </div>

      {message ? <p className={cn('text-sm mb-4', t.muted)}>{message}</p> : null}

      {rooms.length === 0 ? (
        <p className={cn('text-sm', t.muted)}>No FlierTeam rooms in the database.</p>
      ) : (
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
      )}
    </GlassCard>
  )
}
