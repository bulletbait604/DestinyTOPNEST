'use client'

import type { BuildIntelligenceCard, DestinyCharacterClass, ExternalBuildSource } from '@/lib/destiny/types'
import { GlassCard, SectionTitle, EmptyBlock } from '@/app/components/destiny/DestinyUi'
import CommunityBuildCard from '@/app/components/destiny/CommunityBuildCard'
import ExternalMetaBuildCard from '@/app/components/destiny/ExternalMetaBuildCard'
import { getDestinyTheme } from '@/app/components/destiny/destinyTheme'
import { cn } from '@/lib/utils'

const CLASS_LABELS: Record<DestinyCharacterClass, string> = {
  titan: 'Titan',
  hunter: 'Hunter',
  warlock: 'Warlock',
}

type MetaProps = {
  variant?: 'meta'
  topByClass: Record<DestinyCharacterClass, ExternalBuildSource[]>
}

type VerifiedProps = {
  variant: 'verified'
  topByClass: Record<DestinyCharacterClass, BuildIntelligenceCard[]>
}

interface BaseProps {
  darkMode: boolean
  compact?: boolean
  title?: string
  subtitle?: string
  activeCharacterId?: string
  activeCharacterClass?: DestinyCharacterClass
}

type Props = BaseProps & (MetaProps | VerifiedProps)

export default function TopLoadoutsByClass({
  darkMode,
  topByClass,
  compact,
  variant = 'meta',
  title = variant === 'meta' ? 'Top meta loadouts by class' : 'Top loadouts by class',
  subtitle = variant === 'meta'
    ? 'Cross-referenced from Blueberries.gg, light.gg, togame.io, and more'
    : 'Most-used builds from verified clears this season',
  activeCharacterId,
  activeCharacterClass,
}: Props) {
  const t = getDestinyTheme(darkMode)
  const hasAny = (['titan', 'hunter', 'warlock'] as const).some((c) => topByClass[c]?.length)

  if (!hasAny) {
    return (
      <GlassCard darkMode={darkMode}>
        <SectionTitle title={title} subtitle={subtitle} darkMode={darkMode} />
        <EmptyBlock
          darkMode={darkMode}
          message={variant === 'meta' ? 'No meta loadout data yet' : 'No community loadout data yet'}
          hint={
            variant === 'meta'
              ? 'Meta builds are checked each week with the Destiny reset.'
              : 'Sync verified runs from Home after linking Bungie.'
          }
        />
      </GlassCard>
    )
  }

  return (
    <GlassCard darkMode={darkMode}>
      <SectionTitle title={title} subtitle={subtitle} darkMode={darkMode} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {(['titan', 'hunter', 'warlock'] as const).map((cls) => (
          <div key={cls}>
            <p className={cn('d2-class-divider', `d2-class-${cls}`)}>{CLASS_LABELS[cls]}</p>
            <div className="space-y-3">
              {topByClass[cls]?.length ? (
                topByClass[cls].map((b) =>
                  variant === 'verified' ? (
                    <CommunityBuildCard
                      key={(b as BuildIntelligenceCard).id}
                      build={b as BuildIntelligenceCard}
                      darkMode={darkMode}
                      compact={compact}
                    />
                  ) : (
                    <ExternalMetaBuildCard
                      key={(b as ExternalBuildSource).id}
                      build={b as ExternalBuildSource}
                      darkMode={darkMode}
                      compact={compact}
                      characterId={activeCharacterId}
                      characterClass={activeCharacterClass ?? (b as ExternalBuildSource).class}
                    />
                  )
                )
              ) : (
                <p className={cn('text-sm', t.muted)}>No data for {CLASS_LABELS[cls]} yet.</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  )
}
