import type { ArmorSlotLabel, BuildSnapshot, ExternalBuildSource } from '@/lib/destiny/types'
import { formatArmorSetBonusesForCopy } from '@/lib/destiny/armorSetBonusFormat'
import type { ArmoryRow } from '@/app/components/destiny/WeaponArmoryTable'

const ARMOR_SLOT_LABEL: Record<ArmorSlotLabel, string> = {
  helmet: 'Helm',
  gauntlets: 'Arms',
  chest: 'Chest',
  legs: 'Legs',
  class: 'Class',
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

  const slots: ArmorSlotLabel[] = ['helmet', 'gauntlets', 'chest', 'legs', 'class']
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

export function loadoutCopyText(build: BuildSnapshot): string {
  const lines = [
    `${build.subclass} ${build.characterClass}`,
    `Super: ${build.super}`,
    build.aspects.length ? `Aspects: ${build.aspects.join(', ')}` : '',
    build.fragments.length ? `Fragments: ${build.fragments.join(', ')}` : '',
    `Weapons: ${build.kineticWeapon} / ${build.energyWeapon} / ${build.powerWeapon}`,
  ]

  if (build.exoticArmor && build.exoticArmor !== '—') {
    lines.push(`Exotic armor: ${build.exoticArmor}`)
  }

  const setBonusLines = formatArmorSetBonusesForCopy(build.armorSetBonuses)
  if (setBonusLines.length) {
    lines.push('Armor set bonuses:')
    lines.push(...setBonusLines.map((line) => `- ${line}`))
  }

  if (build.armorMods.length) {
    lines.push(`Mods: ${build.armorMods.join(', ')}`)
  }

  return lines.filter(Boolean).join('\n')
}
