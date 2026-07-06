import type { ArmorPiece, ArmorSlotLabel, BuildSnapshot, ExternalBuildSource } from '@/lib/destiny/types'
import type { ArmoryRow } from '@/app/components/destiny/WeaponArmoryTable'

const ARMOR_SLOT_LABEL: Record<ArmorSlotLabel, string> = {
  helmet: 'Helm',
  gauntlets: 'Arms',
  chest: 'Chest',
  legs: 'Legs',
}

export function armorSlotLabel(slot: ArmorSlotLabel): string {
  return ARMOR_SLOT_LABEL[slot]
}

export function buildArmorRows(build: Pick<BuildSnapshot, 'armorPieces' | 'exoticArmor' | 'exoticArmorRef'>): ArmoryRow[] {
  if (build.armorPieces?.length) {
    return build.armorPieces.map((piece) => ({
      slot: armorSlotLabel(piece.slot),
      item: piece.ref,
      fallback: piece.name,
      perks: piece.mods,
    }))
  }

  if (build.exoticArmor && build.exoticArmor !== '—') {
    return [
      {
        slot: 'Exo',
        item: build.exoticArmorRef,
        fallback: build.exoticArmor,
      },
    ]
  }

  return []
}

export function buildExternalArmorRows(build: ExternalBuildSource): ArmoryRow[] {
  const rows: ArmoryRow[] = []

  if (build.exoticArmor) {
    rows.push({
      slot: 'Exo',
      item: build.exoticArmorRef,
      fallback: build.exoticArmor,
    })
  }

  const slots: ArmorSlotLabel[] = ['helmet', 'gauntlets', 'chest', 'legs']
  for (const slot of slots) {
    const name = build.legendaryArmor?.[slot]
    if (!name) continue
    rows.push({
      slot: armorSlotLabel(slot),
      item: build.legendaryArmorRefs?.[slot],
      fallback: name,
    })
  }

  return rows
}

export function abilityRows(build: BuildSnapshot): ArmoryRow[] {
  const entries: { slot: string; ref?: BuildSnapshot['superRef']; fallback?: string }[] = [
    { slot: 'Super', ref: build.superRef, fallback: build.super },
    { slot: 'Class', ref: build.classAbilityRef, fallback: build.abilities[1] },
    { slot: 'Melee', ref: build.meleeRef, fallback: build.abilities[3] },
    { slot: 'Grenade', ref: build.grenadeRef, fallback: build.abilities[4] },
    { slot: 'Jump', ref: build.jumpRef, fallback: build.abilities[2] },
  ]

  return entries
    .filter((e) => (e.ref?.name ?? e.fallback) && (e.ref?.name ?? e.fallback) !== '—')
    .map((e) => ({
      slot: e.slot,
      item: e.ref,
      fallback: e.ref?.name ?? e.fallback,
    }))
}

export function loadoutCopyText(build: BuildSnapshot): string {
  const lines = [
    `${build.subclass} ${build.characterClass}`,
    `Super: ${build.super}`,
    build.aspects.length ? `Aspects: ${build.aspects.join(', ')}` : '',
    build.fragments.length ? `Fragments: ${build.fragments.join(', ')}` : '',
    `Weapons: ${build.kineticWeapon} / ${build.energyWeapon} / ${build.powerWeapon}`,
  ]

  if (build.armorPieces?.length) {
    lines.push(`Armor: ${build.armorPieces.map((p) => p.name).join(' · ')}`)
  } else if (build.exoticArmor !== '—') {
    lines.push(`Exotic armor: ${build.exoticArmor}`)
  }

  if (build.armorMods.length) {
    lines.push(`Mods: ${build.armorMods.join(', ')}`)
  }

  return lines.filter(Boolean).join('\n')
}
