'use client'

import type { DestinyCharacterClass } from '@/lib/destiny/types'
import ExternalMetaBuildCard from '@/app/components/destiny/ExternalMetaBuildCard'
import { EmptyBlock, GlassCard, SectionTitle, StatusPill } from '@/app/components/destiny/DestinyUi'
import type { RankedRecommendedLoadout } from '@/lib/destiny/recommendedBuildOptimizer'
import { getDestinyTheme } from '@/app/components/destiny/destinyTheme'
import { cn } from '@/lib/utils'

export default function SuggestedLoadoutsSection({
  darkMode,
  characterClass,
  characterId,
  picks,
  summary,
}: {
  darkMode: boolean
  characterClass: DestinyCharacterClass
  characterId?: string
  picks: RankedRecommendedLoadout[]
  summary: string
}) {
  const t = getDestinyTheme(darkMode)
  const label = characterClass.charAt(0).toUpperCase() + characterClass.slice(1)

  return (
    <GlassCard darkMode={darkMode}>
      <SectionTitle
        title={`Recommended ${label} loadouts`}
        subtitle="Real meta builds from Blueberries.gg, light.gg, and togame.io (published after June 5, 2026) — cross-referenced with verified clears"
        darkMode={darkMode}
      />
      <p className={cn('text-sm mb-4 leading-relaxed', t.muted)}>{summary}</p>

      {!picks.length ? (
        <EmptyBlock
          darkMode={darkMode}
          message={`No recommendations for ${label} yet`}
          hint="Sync verified runs and check Top builds for unmodified meta and PGCR lists."
        />
      ) : (
        <div className="space-y-4">
          {picks.map((pick) => (
            <div key={pick.id} className="rounded-xl border border-white/[0.08] bg-black/20 overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-b border-white/[0.06] bg-white/[0.03]">
                <div className="min-w-0">
                  <p className={cn('text-sm font-semibold', t.heading)}>{pick.title}</p>
                  <p className={cn('text-base', t.muted)}>
                    {pick.sourceLabel} · {pick.subclass}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill label="Optimized" tone="purple" />
                  <span className={cn('text-[14px] uppercase tracking-wide', t.gold)}>{pick.scoreLabel}</span>
                </div>
              </div>
              <ExternalMetaBuildCard
                build={pick.build}
                darkMode={darkMode}
                characterId={characterId}
                characterClass={characterClass}
              />
              {pick.summary || pick.optimizationNotes.length ? (
                <div className="px-4 pb-4 space-y-2">
                  {pick.summary ? (
                    <p className={cn('text-sm leading-relaxed', t.muted)}>{pick.summary}</p>
                  ) : null}
                  {pick.optimizationNotes.length ? (
                    <ul className={cn('text-sm space-y-1 list-disc list-inside', t.muted)}>
                      {pick.optimizationNotes.map((note) => (
                        <li key={note}>{note}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  )
}
