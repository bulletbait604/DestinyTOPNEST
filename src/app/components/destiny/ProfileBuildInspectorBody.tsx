'use client'

import type { BuildSnapshot, DestinyIconRef } from '@/lib/destiny/types'
import { buildArmorRows } from '@/lib/destiny/loadoutDisplay'
import {
  AbilityChip,
  BuildSection,
  GlowIcon,
} from '@/app/components/destiny/destinyGameUi'
import ArmorStatMatrix from '@/app/components/destiny/ArmorStatMatrix'
import BuildSynergyRail from '@/app/components/destiny/BuildSynergyRail'
import WeaponArmoryTable, { buildWeaponRows } from '@/app/components/destiny/WeaponArmoryTable'
import { ItemExternalLink, ItemLink } from '@/app/components/destiny/ItemLink'
import { subclassGlow } from '@/app/components/destiny/destinyTheme'
import { cn } from '@/lib/utils'

const ABILITY_SLOTS = [
  { slot: 'Super', getRef: (l: BuildSnapshot) => l.superRef, getFallback: (l: BuildSnapshot) => l.super },
  { slot: 'Class', getRef: (l: BuildSnapshot) => l.classAbilityRef, getFallback: (l: BuildSnapshot) => l.abilities?.[1] },
  { slot: 'Jump', getRef: (l: BuildSnapshot) => l.jumpRef, getFallback: (l: BuildSnapshot) => l.abilities?.[2] },
  { slot: 'Melee', getRef: (l: BuildSnapshot) => l.meleeRef, getFallback: (l: BuildSnapshot) => l.abilities?.[3] },
  { slot: 'Grenade', getRef: (l: BuildSnapshot) => l.grenadeRef, getFallback: (l: BuildSnapshot) => l.abilities?.[4] },
] as const

function AbilitySlotCell({
  slot,
  item,
  fallback,
  glow,
  compact,
}: {
  slot: string
  item?: DestinyIconRef
  fallback?: string
  glow: 'gold' | 'arc' | 'void' | 'solar' | 'strand' | 'stasis' | 'neutral' | 'auto'
  compact?: boolean
}) {
  return (
    <div className="flex flex-col items-center min-w-0">
      <AbilityChip item={item} fallback={fallback} size={compact ? 40 : 48} glow={glow} slotLabel={slot} />
      <span className="d2-slot-label truncate w-full">{slot}</span>
    </div>
  )
}

function ModSlotCell({
  item,
  kind,
  glow,
}: {
  item: DestinyIconRef
  kind: 'Aspect' | 'Fragment'
  glow: 'gold' | 'arc' | 'void' | 'solar' | 'strand' | 'stasis' | 'neutral' | 'auto'
}) {
  return (
    <div className="d2-mod-cell">
      <span className="d2-mod-kind">{kind}</span>
      <ItemExternalLink item={item}>
        <GlowIcon item={item} size={40} glow={glow} className="rounded-lg mx-auto" />
      </ItemExternalLink>
      <ItemLink item={item} className="d2-mod-name line-clamp-2 block" />
    </div>
  )
}

function AbilitiesPanel({
  build,
  elementGlow,
}: {
  build: BuildSnapshot
  elementGlow: ReturnType<typeof subclassGlow>
}) {
  return (
    <BuildSection label="Abilities" className="d2-profile-build-panel d2-profile-abilities-panel">
      <div className="d2-ability-grid d2-ability-grid-profile">
        {ABILITY_SLOTS.map(({ slot, getRef, getFallback }) => (
          <AbilitySlotCell
            key={slot}
            slot={slot}
            item={getRef(build)}
            fallback={getFallback(build)}
            glow={elementGlow}
            compact
          />
        ))}
      </div>
      {build.aspectRefs?.length || build.fragmentRefs?.length ? (
        <div className="d2-mod-grid d2-mod-grid-profile-side">
          {build.aspectRefs?.map((aspect) => (
            <ModSlotCell key={aspect.name} item={aspect} kind="Aspect" glow={elementGlow} />
          ))}
          {build.fragmentRefs?.map((fragment) => (
            <ModSlotCell key={fragment.name} item={fragment} kind="Fragment" glow={elementGlow} />
          ))}
        </div>
      ) : null}
    </BuildSection>
  )
}

function StatsPanel({ build }: { build: BuildSnapshot }) {
  if (!Object.keys(build.stats).length) return null
  return (
    <BuildSection label="Stats" className="d2-profile-build-panel d2-profile-stats-panel">
      <ArmorStatMatrix stats={build.stats} loadout />
    </BuildSection>
  )
}

function WeaponsPanel({ rows }: { rows: ReturnType<typeof buildWeaponRows> }) {
  if (!rows.length) return null
  return (
    <BuildSection label="Weapons" className="d2-profile-build-panel">
      <WeaponArmoryTable rows={rows} title="Weapons" iconSize={44} />
    </BuildSection>
  )
}

function ArmorPanel({ rows }: { rows: ReturnType<typeof buildArmorRows> }) {
  if (!rows.length) return null
  return (
    <BuildSection label="Armor" className="d2-profile-build-panel d2-profile-armor-panel">
      <WeaponArmoryTable rows={rows} title="Armor" iconSize={44} />
    </BuildSection>
  )
}

/** Shared guardian / loadout build grid. */
export default function ProfileBuildInspectorBody({
  build,
  showSynergy = true,
}: {
  build: BuildSnapshot
  showSynergy?: boolean
}) {
  const elementGlow = subclassGlow(build.subclass)
  const weaponRows = buildWeaponRows(build)
  const armorRows = buildArmorRows(build)
  const statsPanel = <StatsPanel build={build} />
  const abilitiesPanel = <AbilitiesPanel build={build} elementGlow={elementGlow} />
  const hasStats = Object.keys(build.stats).length > 0

  return (
    <div className="d2-profile-build-body">
      {showSynergy ? <BuildSynergyRail build={build} /> : null}

      <div className={cn('d2-loadout-build-grid', !hasStats && 'd2-loadout-build-grid--no-stats')}>
        <div className="d2-loadout-build-weapons">
          <WeaponsPanel rows={weaponRows} />
        </div>
        {hasStats ? <div className="d2-loadout-build-stats">{statsPanel}</div> : null}
        <div className="d2-loadout-build-armor">
          <ArmorPanel rows={armorRows} />
        </div>
        <div className="d2-loadout-build-abilities">{abilitiesPanel}</div>
      </div>
    </div>
  )
}
