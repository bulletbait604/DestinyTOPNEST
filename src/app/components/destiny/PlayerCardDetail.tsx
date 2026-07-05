'use client'

import { Loader2 } from 'lucide-react'
import type { BuildSnapshot, DestinyIconRef, PlayerProfile } from '@/lib/destiny/types'
import { profileViewForCharacter } from '@/lib/destiny/activeCharacter'
import {
  AbilityChip,
  BuildSection,
  GameCard,
  GlowIcon,
  IconTooltip,
  PowerBadge,
  TrustRankBadge,
} from '@/app/components/destiny/destinyGameUi'
import ArmorStatMatrix from '@/app/components/destiny/ArmorStatMatrix'
import BuildSynergyRail from '@/app/components/destiny/BuildSynergyRail'
import { CharacterTileRow } from '@/app/components/destiny/CharacterTile'
import GuardianProfileBanner from '@/app/components/destiny/GuardianProfileBanner'
import WeaponArmoryTable, { buildWeaponRows } from '@/app/components/destiny/WeaponArmoryTable'
import { getDestinyTheme, subclassGlow } from '@/app/components/destiny/destinyTheme'
import { cn } from '@/lib/utils'

interface Props {
  profile: PlayerProfile
  darkMode: boolean
  switchingCharacter?: boolean
  onCharacterSelect?: (characterId: string) => void
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
      <AbilityChip item={item} fallback={fallback} size={44} glow={glow} slotLabel={slot} />
      <span className="d2-slot-label truncate w-full">{slot}</span>
    </div>
  )
}

function classLabel(className?: string) {
  if (!className) return 'Guardian'
  return className.charAt(0).toUpperCase() + className.slice(1)
}

/** Live Bungie build inspector with character switching. */
export default function PlayerCardDetail({
  profile,
  darkMode,
  switchingCharacter,
  onCharacterSelect,
}: Props) {
  const t = getDestinyTheme(darkMode)
  const activeId = profile.activeCharacterId
  const viewProfile = activeId ? profileViewForCharacter(profile, activeId) : profile
  const loadout = profile.currentLoadout
  const elementGlow = subclassGlow(loadout?.subclass)
  const characters = profile.characters ?? []
  const canSwitch = characters.length > 1 && !!onCharacterSelect
  const clanLine = profile.clanName ?? null

  return (
    <GameCard className="w-full overflow-hidden p-0 d2-profile-build-card">
      <GuardianProfileBanner profile={viewProfile} clanLine={clanLine} compact>
        {characters.length ? (
          <div className="mt-2.5 space-y-2">
            <div className="flex items-center justify-between gap-2 px-0.5">
              <p className="d2-profile-char-label">
                {canSwitch ? 'Select character' : 'Characters'}
              </p>
              {switchingCharacter ? (
                <span className="inline-flex items-center gap-1.5 text-[11px] text-white/50">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Syncing from Bungie…
                </span>
              ) : null}
            </div>
            <CharacterTileRow
              characters={characters}
              activeCharacterId={activeId}
              selectable={canSwitch}
              onCharacterSelect={onCharacterSelect}
              switching={switchingCharacter}
              subtitleFor={(c) =>
                c.characterId === activeId && loadout?.subclass ? loadout.subclass : undefined
              }
            />
          </div>
        ) : null}
      </GuardianProfileBanner>

      <div className="d2-profile-build-bar">
        <TrustRankBadge trust={profile.trustRank} darkMode={darkMode} compact />
        <div className="ml-auto flex items-center gap-2">
          <span className={cn('text-sm font-semibold capitalize', t.body)}>
            {classLabel(viewProfile.characterClass)}
            {loadout?.subclass ? ` · ${loadout.subclass}` : ''}
          </span>
          <PowerBadge
            power={viewProfile.powerLevel}
            rank={profile.guardianRank}
            showRankAlways
          />
        </div>
      </div>

      {!loadout ? (
        <p className={cn('px-4 py-6 text-sm text-center', t.muted)}>
          {switchingCharacter ? 'Loading equipped gear…' : 'Sync Bungie to load live build data.'}
        </p>
      ) : (
        <div className="d2-profile-build-body">
          <BuildSynergyRail build={loadout} />

          <div className="d2-profile-build-grid">
            <BuildSection label="Equipped gear" className="d2-profile-build-panel">
              <WeaponArmoryTable rows={buildWeaponRows(loadout)} title="Weapons & armor" />
            </BuildSection>

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
            </BuildSection>
          </div>

          {(loadout.aspectRefs?.length || loadout.fragmentRefs?.length) ? (
            <BuildSection label="Aspects & fragments" className="d2-profile-build-panel">
              <div className="flex flex-wrap gap-2">
                {loadout.aspectRefs?.map((a) => (
                  <AbilityChip key={a.name} item={a} size={40} glow={elementGlow} slotLabel="Aspect" />
                ))}
                {loadout.fragmentRefs?.map((f) => (
                  <IconTooltip key={f.name} slotLabel="Fragment" name={f.name} tier={f.tierLabel}>
                    <GlowIcon item={f} size={34} glow={elementGlow} className="rounded-lg" />
                  </IconTooltip>
                ))}
              </div>
            </BuildSection>
          ) : null}

          <BuildSection label="Armor stats" className="d2-profile-build-panel">
            <ArmorStatMatrix stats={loadout.stats} compact />
          </BuildSection>
        </div>
      )}
    </GameCard>
  )
}
