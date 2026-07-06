import type { ArmorPiece, ArmorSlotLabel, BuildSnapshot, ExternalBuildSource } from '@/lib/destiny/types'
import { buildExternalArmorRows } from '@/lib/destiny/loadoutDisplay'

function armorPiecesFromExternal(build: ExternalBuildSource): ArmorPiece[] {
  return buildExternalArmorRows(build).map((row) => ({
    slot: rowSlotToArmorSlot(row.slot),
    name: row.item?.name ?? row.fallback ?? '—',
    ref: row.item,
    mods: [],
  }))
}

function rowSlotToArmorSlot(slot: string): ArmorSlotLabel {
  switch (slot) {
    case 'Helm':
      return 'helmet'
    case 'Arms':
      return 'gauntlets'
    case 'Chest':
      return 'chest'
    case 'Legs':
      return 'legs'
    default:
      return 'class'
  }
}

/** Convert a researched meta build into a BuildSnapshot for the shared loadout inspector. */
export function externalBuildToSnapshot(build: ExternalBuildSource): BuildSnapshot {
  const weapons = build.weapons ?? []
  const kinetic = weapons[0] ?? '—'
  const energy = weapons[1] ?? '—'
  const power = build.exoticWeapon && weapons.length < 3 ? build.exoticWeapon : weapons[2] ?? '—'

  return {
    id: build.id,
    runId: '',
    userId: '',
    characterClass: build.class,
    subclass: build.subclass,
    super: '—',
    aspects: build.aspects ?? [],
    fragments: build.fragments ?? [],
    abilities: ['—', '—', '—', '—', '—'],
    exoticArmor: build.exoticArmor ?? '—',
    exoticWeapon: build.exoticWeapon,
    armorPieces: armorPiecesFromExternal(build),
    kineticWeapon: kinetic,
    energyWeapon: energy,
    powerWeapon: power,
    armorMods: build.armorMods ?? [],
    artifactPerks: [],
    stats: {},
    activityId: 0,
    activityName: build.activityFocus ?? 'Meta build',
    difficulty: 'normal',
    completedAt: build.publishedAt ?? build.lastChecked,
    durationSeconds: 0,
    deaths: 0,
    fireteamComposition: 'meta',
    classRef: build.classRef,
    subclassRef: build.subclassRef,
    exoticArmorRef: build.exoticArmorRef,
    exoticWeaponRef: build.exoticWeaponRef,
    kineticWeaponRef: build.weaponRefs?.[0],
    energyWeaponRef: build.weaponRefs?.[1],
    powerWeaponRef: build.weaponRefs?.[2] ?? build.exoticWeaponRef,
    aspectRefs: build.aspectRefs,
    fragmentRefs: build.fragmentRefs,
    loadoutSource: 'meta',
    loadoutName: build.title,
  }
}
