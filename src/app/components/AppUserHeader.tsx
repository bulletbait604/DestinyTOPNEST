'use client'

import { Loader2, LogOut, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useBungieLink, SYNC_RECENT_MS } from '@/hooks/useBungieLink'
import { useAutoBungieSync } from '@/hooks/useAutoBungieSync'
import { cn } from '@/lib/utils'

interface Props {
  displayName: string
  onLogout: () => void
}

export default function AppUserHeader({ displayName, onLogout }: Props) {
  const bungie = useBungieLink()
  useAutoBungieSync(bungie)
  const [, setSyncTick] = useState(0)

  useEffect(() => {
    if (!bungie.lastSyncedAt) return
    const remaining = bungie.lastSyncedAt + SYNC_RECENT_MS - Date.now()
    if (remaining <= 0) return
    const id = window.setTimeout(() => setSyncTick((n) => n + 1), remaining + 250)
    return () => window.clearTimeout(id)
  }, [bungie.lastSyncedAt])

  const recentlySynced = bungie.isRecentlySynced
  const canSync = bungie.linked && !bungie.status?.needsReconnect

  return (
    <header className="d2-app-header flex items-center gap-2 px-3 sm:px-4 py-2">
      <div className="flex items-center gap-2 min-w-0 mr-auto">
        <span className="text-xs text-white/55 truncate max-w-[40vw] sm:max-w-none">{displayName}</span>
        {canSync ? (
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              title="Sync runs from Bungie"
              disabled={bungie.syncing}
              onClick={() => void bungie.syncRuns()}
              className="inline-flex items-center justify-center w-7 h-7 rounded-md text-white/70 ring-1 ring-white/10 hover:bg-white/[0.06] hover:text-white transition-colors disabled:opacity-50"
            >
              {bungie.syncing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
            </button>
            {recentlySynced ? (
              <span className="text-[10px] font-semibold text-emerald-400/90 uppercase tracking-wide">
                Synced
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onLogout}
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/75',
          'ring-1 ring-d2-arc/25 hover:bg-d2-arc/10 transition-colors shrink-0'
        )}
      >
        <LogOut className="w-3.5 h-3.5" />
        Log out
      </button>
    </header>
  )
}
