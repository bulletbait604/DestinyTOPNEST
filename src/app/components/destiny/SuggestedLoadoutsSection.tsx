'use client'

import { ExternalLink } from 'lucide-react'
import type { DestinyCharacterClass } from '@/lib/destiny/types'
import ExternalMetaBuildCard from '@/app/components/destiny/ExternalMetaBuildCard'
import { EmptyBlock, GlassCard, SectionTitle, StatusPill } from '@/app/components/destiny/DestinyUi'
import type { RankedRecommendedLoadout } from '@/lib/destiny/recommendedBuildOptimizer'
import { getDestinyTheme } from '@/app/components/destiny/destinyTheme'
import { cn } from '@/lib/utils'

export default function SuggestedLoadoutsSection({
  darkMode,
  characterClass,
  picks,
  summary,
}: {
  darkMode: boolean
  characterClass: DestinyCharacterClass
  picks: RankedRecommendedLoadout[]
  summary: string
}) {
  const t = getDestinyTheme(darkMode)
  const label = characterClass.charAt(0).toUpperCase() + characterClass.slice(1)

  return (
    <GlassCard darkMode={darkMode}>
      <SectionTitle
        title={`Recommended ${label} loadouts`}
        subtitle="Armor 3.0 hybrid builds — meta sites cross-referenced with verified Top Nest clears"
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
                  <p className={cn('text-xs', t.muted)}>
                    {pick.sourceLabel} · {pick.subclass}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill label="Optimized" tone="purple" />
                  <span className={cn('text-[10px] uppercase tracking-wide', t.gold)}>{pick.scoreLabel}</span>
                </div>
              </div>
              <div className="p-4">
                <ExternalMetaBuildCard build={pick.build} darkMode={darkMode} compact />
                {pick.summary ? (
                  <p className={cn('text-xs mt-3 leading-relaxed', t.muted)}>{pick.summary}</p>
                ) : null}
                {pick.optimizationNotes.length ? (
                  <ul className={cn('text-xs mt-2 space-y-1 list-disc list-inside', t.muted)}>
                    {pick.optimizationNotes.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                ) : null}
                {pick.build.sourceUrl ? (
                  <a
                    href={pick.build.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-3 text-xs text-sky-300/90 hover:text-sky-200"
                  >
                    View original meta source <ExternalLink className="w-3 h-3" />
                  </a>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  )
}
