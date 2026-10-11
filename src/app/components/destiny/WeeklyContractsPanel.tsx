'use client'

import { Check, ScrollText } from 'lucide-react'
import { GlassCard, SectionTitle, StatusPill } from '@/app/components/destiny/DestinyUi'
import { getDestinyTheme } from '@/app/components/destiny/destinyTheme'
import { PASSPORT_FRAME_LABELS } from '@/lib/destiny/weeklyContractCatalog'
import type { WeeklyContractsSnapshot } from '@/lib/destiny/types'
import { cn } from '@/lib/utils'

export default function WeeklyContractsPanel({
  board,
  darkMode,
  compact = false,
}: {
  board: WeeklyContractsSnapshot
  darkMode: boolean
  compact?: boolean
}) {
  const t = getDestinyTheme(darkMode)
  const tier = board.seasonTier

  return (
    <GlassCard darkMode={darkMode} padding={compact ? 'compact' : 'default'}>
      <div className="flex items-start gap-2 mb-1">
        <ScrollText className="w-4 h-4 mt-0.5 text-amber-300/90 shrink-0" />
        <SectionTitle
          title="Weekly contracts"
          subtitle={`${board.weekLabel} · resets in ${board.resetsInLabel}`}
          darkMode={darkMode}
          compact={compact}
        />
      </div>
      <p className={cn('text-xs mb-3', t.muted)}>
        Verified from PGCR clears. Completing a contract earns season tier points — badges, titles, and frames, not leaderboard score.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
        <div className="d2-profile-stat-tile">
          <p className="d2-profile-stat-label">Season tier</p>
          <p className="d2-profile-stat-value">{tier.tier}</p>
        </div>
        <div className="d2-profile-stat-tile">
          <p className="d2-profile-stat-label">Tier points</p>
          <p className="d2-profile-stat-value">{board.seasonTierPoints}</p>
        </div>
        <div className="d2-profile-stat-tile">
          <p className="d2-profile-stat-label">This week</p>
          <p className="d2-profile-stat-value">{board.weekTierPoints}</p>
        </div>
        <div className="d2-profile-stat-tile">
          <p className="d2-profile-stat-label">Frame</p>
          <p className="d2-profile-stat-value text-base sm:text-lg">{PASSPORT_FRAME_LABELS[tier.frame]}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <StatusPill label={tier.title} tone="gold" />
        {tier.pointsToNext != null ? (
          <span className={cn('text-xs', t.muted)}>{tier.pointsToNext} pts to the next tier</span>
        ) : (
          <span className={cn('text-xs', t.muted)}>Top season tier</span>
        )}
      </div>

      <div className="space-y-2">
        {board.contracts.map((contract) => (
          <div
            key={contract.id}
            className={cn(
              'rounded-xl ring-1 p-3',
              contract.completed ? 'ring-emerald-400/40 bg-emerald-400/[0.06]' : 'ring-white/10 bg-white/[0.03]'
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className={cn('text-sm font-semibold', t.heading)}>{contract.title}</p>
                <p className={cn('text-xs mt-1', t.muted)}>{contract.description}</p>
                <p className={cn('text-xs mt-2', contract.completed ? 'text-emerald-200' : t.body)}>
                  {contract.progressLabel}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className={cn('text-sm font-semibold tabular-nums', t.gold)}>+{contract.tierPoints}</p>
                <p className={cn('text-[10px] uppercase tracking-wide', t.caption)}>tier pts</p>
                {contract.completed ? (
                  <span className="mt-1 inline-flex items-center gap-1 text-[11px] text-emerald-300">
                    <Check className="w-3 h-3" /> Done
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  )
}
