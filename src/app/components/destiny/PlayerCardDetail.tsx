'use client'

import type { BuildSnapshot, DestinyIconRef, PlayerProfile } from '@/lib/destiny/types'
import { profileViewForCharacter } from '@/lib/destiny/activeCharacter'
import { buildArmorRows } from '@/lib/destiny/loadoutDisplay'
import {
  AbilityChip,
  BuildSection,
  GameCard,
  GlowIcon,
  PowerBadge,
  TrustRankBadge,
} from '@/app/components/destiny/destinyGameUi'
import ArmorStatMatrix from '@/app/components/destiny/ArmorStatMatrix'
import BuildSynergyRail from '@/app/components/destiny/BuildSynergyRail'
import GuardianProfileBanner from '@/app/components/destiny/GuardianProfileBanner'
import WeaponArmoryTable, { buildWeaponRows } from '@/app/components/destiny/WeaponArmoryTable'
import { ItemExternalLink, ItemLink } from '@/app/components/destiny/ItemLink'
import { getDestinyTheme, subclassGlow } from '@/app/components/destiny/destinyTheme'
import { cn } from '@/lib/utils'

interface Props {
  profile: PlayerProfile
  darkMode: boolean
  switchingCharacter?: boolean
}

const ABILITY_SLOTS = [
  { slot: 'Super', getRef: (l?: BuildSnapshot) => l?.superRef, getFallback: (l?: BuildSnapshot) => l?.super },
  { slot: 'Class', getRef: (l?: BuildSnapshot) => l?.classAbilityRef, getFallback: (l?: BuildSnapshot) => l?.abilities?.[1] },
  { slot: 'Jump', getRef: (l?: BuildSnapshot) => l?.jumpRef, getFallback: (l?: BuildSnapshot) => l?.abilities?.[2] },
  { slot: 'Melee', getRef: (l?: BuildSnapshot) => l?.meleeRef, getFallback: (l?: BuildSnapshot) => l?.abilities?.[3] },
  { slot: 'Grenade', getRef: (l?: BuildSnapshot) => l?.grenadeRef, getFallback: (l?: BuildSnapshot) => l?.abilities?.[4] },
] as const

function AbilitySlotCell({
  slot,
  item,
  fallback,
  glow,
}: {
  slot: string
  item?: DestinyIconRef
  fallback?: string
  glow: 'gold' | 'arc' | 'void' | 'solar' | 'strand' | 'stasis' | 'neutral' | 'auto'
}) {
  return (
    <div className="flex flex-col items-center min-w-0">
      <AbilityChip item={item} fallback={fallback} size={48} glow={glow} slotLabel={slot} />
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

function classLabel(className?: string) {
  if (!className) return 'Guardian'
  return className.charAt(0).toUpperCase() + className.slice(1)
}

/** Live Bungie build inspector for the active character. */
export default function PlayerCardDetail({ profile, darkMode, switchingCharacter }: Props) {
  const t = getDestinyTheme(darkMode)
  const activeId = profile.activeCharacterId
  const viewProfile = activeId ? profileViewForCharacter(profile, activeId) : profile
  const loadout = profile.currentLoadout
  const elementGlow = subclassGlow(loadout?.subclass)
  const clanLine = profile.clanName ?? null
  const emblemBackground =
    viewProfile.displayEmblem?.backgroundUrl ??
    viewProfile.emblemBackgroundUrl ??
    undefined
  const weaponRows = loadout ? buildWeaponRows(loadout) : []
  const armorRows = loadout ? buildArmorRows(loadout) : []

  return (
    <GameCard className="w-full overflow-hidden p-0 d2-profile-build-card">
      <GuardianProfileBanner
        profile={viewProfile}
        clanLine={clanLine}
        compact
        nameTrail={<TrustRankBadge trust={profile.trustRank} darkMode={darkMode} pill />}
      />

      <div
        className="d2-profile-build-bar"
        style={
          emblemBackground
            ? ({ '--build-bar-url': `url("${emblemBackground}")` } as React.CSSProperties)
            : undefined
        }
      >
        <div className="ml-auto flex items-center gap-2 min-w-0">
          <span className={cn('d2-profile-build-bar-class truncate', t.body)}>
            {classLabel(viewProfile.characterClass)}
            {loadout?.subclass ? ` · ${loadout.subclass}` : ''}
          </span>
          <PowerBadge power={viewProfile.powerLevel} rank={profile.guardianRank} showRankAlways />
        </div>
      </div>

      {!loadout ? (
        <p className={cn('px-4 py-6 text-sm text-center', t.muted)}>
          {switchingCharacter ? 'Loading equipped gear…' : 'Sync Bungie to load live build data.'}
        </p>
      ) : (
        <div className="d2-profile-build-body">
          <BuildSynergyRail build={loadout} />

          <BuildSection label="Weapons" className="d2-profile-build-panel">
            <WeaponArmoryTable rows={weaponRows} title="Weapons" iconSize={44} />
          </BuildSection>

          <div className="d2-profile-loadout-split">
            <BuildSection label="Armor" className="d2-profile-build-panel d2-profile-armor-panel">
              <WeaponArmoryTable rows={armorRows} title="Armor" iconSize={44} />
            </BuildSection>

            <BuildSection label="Stats" className="d2-profile-build-panel d2-profile-stats-panel">
              <ArmorStatMatrix stats={loadout.stats} ingame />
            </BuildSection>
          </div>

          <BuildSection label="Abilities" className="d2-profile-build-panel">
            <div className="d2-ability-grid d2-ability-grid-profile">
              {ABILITY_SLOTS.map(({ slot, getRef, getFallback }) => (
                <AbilitySlotCell
                  key={slot}
                  slot={slot}
                  item={getRef(loadout)}
                  fallback={getFallback(loadout)}
                  glow={elementGlow}
                />
              ))}
            </div>
            {loadout.aspectRefs?.length || loadout.fragmentRefs?.length ? (
              <div className="d2-mod-grid">
                {loadout.aspectRefs?.map((aspect) => (
                  <ModSlotCell key={aspect.name} item={aspect} kind="Aspect" glow={elementGlow} />
                ))}
                {loadout.fragmentRefs?.map((fragment) => (
                  <ModSlotCell key={fragment.name} item={fragment} kind="Fragment" glow={elementGlow} />
                ))}
              </div>
            ) : null}
          </BuildSection>
        </div>
      )}
    </GameCard>
  )
}
