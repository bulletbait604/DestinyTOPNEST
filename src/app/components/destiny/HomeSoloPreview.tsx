'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { LeaderboardEntry } from '@/lib/destiny/types'
import { ItemIcon } from '@/app/components/destiny/DestinyUi'
import { getDestinyTheme } from '@/app/components/destiny/destinyTheme'
import { soloLeaderboardIconUrl } from '@/lib/destiny/navArt'
import { OVERVIEW_REFRESH_EVENT } from '@/lib/destiny/syncEvents'
import { cn } from '@/lib/utils'

const SOLO_PREVIEW_SLOTS = 3

function buildSoloSlots(entries: LeaderboardEntry[], slots = SOLO_PREVIEW_SLOTS) {
  const byRank = new Map(entries.map((entry) => [entry.rank, entry]))
  return Array.from({ length: slots }, (_, index) => byRank.get(index + 1) ?? null)
}

function SoloPreviewRow({
  rank,
  entry,
  darkMode,
}: {
  rank: number
  entry: LeaderboardEntry | null
  darkMode: boolean
}) {
  const t = getDestinyTheme(darkMode)

  return (
    <div
      className={cn(
        'd2-leaderboard-row d2-leaderboard-row-hero',
        !entry && 'tn-home-solo-row-empty'
      )}
    >
      <span className="d2-leaderboard-rank d2-leaderboard-rank-hero d2-leaderboard-rank-top">
        {rank}.
      </span>
      {entry ? (
        <>
          {entry.emblemUrl ? (
            <ItemIcon iconUrl={entry.emblemUrl} name={entry.bungieDisplayName} size={22} />
          ) : (
            <div className="w-[22px] h-[22px] rounded-sm bg-black/40 shrink-0 ring-1 ring-white/10" />
          )}
          <div className="flex-1 min-w-0">
            <p className={cn('font-semibold truncate text-[11px] leading-tight', t.heading)}>
              {entry.bungieDisplayName}
            </p>
          </div>
          <div className="text-right shrink-0 leading-none">
            <p className={cn('d2-stat-card-value tabular-nums text-xs', t.heading)}>
              {entry.points}
              <span className={cn('ml-0.5 text-[9px] font-semibold uppercase', t.caption)}>pts</span>
            </p>
          </div>
        </>
      ) : (
        <div className="flex-1 min-w-0" aria-hidden />
      )}
    </div>
  )
}

/** Solo top-3 preview beside the home hero title — empty slots show rank only. */
export default function HomeSoloPreview({ darkMode }: { darkMode: boolean }) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    try {
      const res = await fetch('/api/destiny/overview', { credentials: 'include' })
      if (!res.ok) return
      const json = await res.json()
      setEntries((json.guardiansTop3 ?? json.clanTop5 ?? []).slice(0, SOLO_PREVIEW_SLOTS))
    } catch {
      if (!opts?.silent) setEntries([])
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const onRefresh = () => void load({ silent: true })
    window.addEventListener(OVERVIEW_REFRESH_EVENT, onRefresh)
    return () => window.removeEventListener(OVERVIEW_REFRESH_EVENT, onRefresh)
  }, [load])

  const slots = useMemo(() => buildSoloSlots(entries), [entries])
  const iconUrl = soloLeaderboardIconUrl()

  return (
    <aside className="tn-home-solo-preview tn-home-hero-side-panel">
      <div className="tn-home-solo-header">
        {iconUrl ? (
          <img
            src={iconUrl}
            alt=""
            className="tn-home-solo-icon"
            width={32}
            height={32}
            decoding="async"
          />
        ) : null}
        <p className="tn-home-solo-label">Solo Leaderboard</p>
      </div>
      <div className="-mx-1">
        {slots.map((entry, index) => (
          <SoloPreviewRow
            key={`solo-slot-${index + 1}`}
            rank={index + 1}
            entry={entry}
            darkMode={darkMode}
          />
        ))}
      </div>
    </aside>
  )
}
