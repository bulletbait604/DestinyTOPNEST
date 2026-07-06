'use client'

import { ExternalLink } from 'lucide-react'
import type { DestinyCharacterClass } from '@/lib/destiny/types'
import ExternalMetaBuildCard from '@/app/components/destiny/ExternalMetaBuildCard'
import CommunityBuildCard from '@/app/components/destiny/CommunityBuildCard'
import { EmptyBlock, GlassCard, SectionTitle, StatusPill } from '@/app/components/destiny/DestinyUi'
import type { RankedSuggestedLoadout } from '@/lib/destiny/metaBuildRanker'
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
  picks: RankedSuggestedLoadout[]
  summary: string
}) {
  const t = getDestinyTheme(darkMode)
  const label = characterClass.charAt(0).toUpperCase() + characterClass.slice(1)

  return (
    <GlassCard darkMode={darkMode}>
      <SectionTitle
        title={`Suggested ${label} loadouts`}
        subtitle="Ranked from amalgamated build sites + verified Top Nest clears"
        darkMode={darkMode}
      />
      <p className={cn('text-sm mb-4 leading-relaxed', t.muted)}>{summary}</p>

      {!picks.length ? (
        <EmptyBlock
          darkMode={darkMode}
          message={`No suggestions for ${label} yet`}
          hint="Link Bungie and sync runs, or check the Top builds tab for global meta."
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
                  <StatusPill
                    label={pick.kind === 'meta' ? 'Meta research' : 'Verified'}
                    tone={pick.kind === 'meta' ? 'purple' : 'green'}
                  />
                  <span className={cn('text-[10px] uppercase tracking-wide', t.gold)}>{pick.scoreLabel}</span>
                </div>
              </div>
              <div className="p-4">
                {pick.external ? (
                  <ExternalMetaBuildCard build={pick.external} darkMode={darkMode} compact />
                ) : pick.verified ? (
                  <CommunityBuildCard build={pick.verified} darkMode={darkMode} compact />
                ) : null}
                {pick.summary ? (
                  <p className={cn('text-xs mt-3 leading-relaxed', t.muted)}>{pick.summary}</p>
                ) : null}
                {pick.external?.sourceUrl ? (
                  <a
                    href={pick.external.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-3 text-xs text-sky-300/90 hover:text-sky-200"
                  >
                    View on {pick.external.sourceSite ?? 'source'} <ExternalLink className="w-3 h-3" />
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
