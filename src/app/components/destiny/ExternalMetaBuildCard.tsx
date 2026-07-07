'use client'

import { Copy, ExternalLink } from 'lucide-react'
import type { ExternalBuildSource, DestinyCharacterClass } from '@/lib/destiny/types'
import { StatusPill, SubclassBadge } from '@/app/components/destiny/DestinyUi'
import ProfileBuildInspectorBody from '@/app/components/destiny/ProfileBuildInspectorBody'
import MetaBuildApplyPanel from '@/app/components/destiny/MetaBuildApplyPanel'
import { externalBuildToSnapshot } from '@/lib/destiny/externalBuildToSnapshot'
import { getDestinyTheme } from '@/app/components/destiny/destinyTheme'
import { cn } from '@/lib/utils'

export default function ExternalMetaBuildCard({
  build,
  darkMode,
  compact = false,
  characterId,
  characterClass,
}: {
  build: ExternalBuildSource
  darkMode: boolean
  compact?: boolean
  characterId?: string
  characterClass?: DestinyCharacterClass
}) {
  const t = getDestinyTheme(darkMode)
  const snapshot = externalBuildToSnapshot(build)
  const activeClass = characterClass ?? build.class

  const copyText = [
    build.title,
    `${build.subclass} ${build.class}`,
    build.exoticArmor ? `Exotic armor: ${build.exoticArmor}` : '',
    build.exoticWeapon ? `Exotic weapon: ${build.exoticWeapon}` : '',
    build.weapons?.length ? `Weapons: ${build.weapons.join(' / ')}` : '',
    build.legendaryArmor
      ? `Legendary armor: ${Object.entries(build.legendaryArmor)
          .map(([slot, name]) => `${slot}: ${name}`)
          .join(', ')}`
      : '',
    build.aspects?.length ? `Aspects: ${build.aspects.join(', ')}` : '',
    build.fragments?.length ? `Fragments: ${build.fragments.join(', ')}` : '',
    build.armorMods?.length ? `Mods: ${build.armorMods.join(', ')}` : '',
    build.statPriorities?.length ? `Stat focus: ${build.statPriorities.join(', ')}` : '',
    build.summary ?? '',
    build.sourceUrl,
  ]
    .filter(Boolean)
    .join('\n')

  if (compact) {
    return (
      <div className="space-y-3">
        <div className="min-w-0">
          <p className={cn('font-semibold text-sm tracking-tight', t.heading)}>{build.title}</p>
          <p className={cn('text-xs mt-0.5', t.muted)}>
            {build.source}
            {build.publishedAt && <> · {new Date(build.publishedAt).toLocaleDateString()}</>}
          </p>
        </div>
        <SubclassBadge
          classRef={build.classRef}
          subclassRef={build.subclassRef}
          characterClass={build.class}
          subclass={build.subclass}
          darkMode={darkMode}
        />
        {build.aiScoreLabel ? <StatusPill label={build.aiScoreLabel} tone="gold" /> : null}
      </div>
    )
  }

  return (
    <div className="d2-panel-inset p-0 rounded-lg overflow-visible d2-profile-build-card">
      <div className="px-4 pt-4 pb-2 space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="d2-panel-header-title text-[14px]">{build.title}</p>
            <p className={cn('text-xs mt-0.5', t.muted)}>
              {build.source}
              {build.publishedAt && <> · {new Date(build.publishedAt).toLocaleDateString()}</>}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {build.excelsIn ? <StatusPill label={build.excelsIn} tone="purple" /> : null}
            {build.aiScoreLabel ? <StatusPill label={build.aiScoreLabel} tone="gold" /> : null}
          </div>
        </div>
        <SubclassBadge
          classRef={build.classRef}
          subclassRef={build.subclassRef}
          characterClass={build.class}
          subclass={build.subclass}
          darkMode={darkMode}
        />
        {build.summary ? <p className={cn('text-sm leading-relaxed', t.muted)}>{build.summary}</p> : null}
        {build.statPriorities?.length ? (
          <p className={cn('text-xs', t.gold)}>Stat focus: {build.statPriorities.join(' · ')}</p>
        ) : null}
        {build.activityFocus ? (
          <p className={cn('text-xs', t.muted)}>Best for: {build.activityFocus}</p>
        ) : null}
      </div>

      <ProfileBuildInspectorBody build={snapshot} showSynergy={false} />

      <MetaBuildApplyPanel
        build={build}
        darkMode={darkMode}
        characterId={characterId}
        characterClass={activeClass}
      />

      <div className="flex flex-wrap gap-2 px-4 py-3 border-t border-white/[0.06]">
        <a
          href={build.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-sky-500/15 text-sky-200 border border-sky-500/25"
        >
          View source <ExternalLink className="w-3 h-3" />
        </a>
        <button
          type="button"
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-white/5 text-white/80 border border-white/10"
          onClick={() => navigator.clipboard.writeText(copyText)}
        >
          <Copy className="w-3 h-3" /> Copy full build
        </button>
      </div>
    </div>
  )
}
