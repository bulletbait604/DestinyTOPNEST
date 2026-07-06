import type { ArmorSlotLabel, BuildSnapshot } from '@/lib/destiny/types'
import { exoticArmorOccupiesSlot } from '@/lib/destiny/metaBuildClassRules'

const ARMOR_SLOTS: ArmorSlotLabel[] = ['helmet', 'gauntlets', 'chest', 'legs', 'class']

function isFilled(value?: string): boolean {
  const v = value?.trim()
  return Boolean(v && v !== '—' && v !== 'Subclass')
}

function armorSlotFilled(build: BuildSnapshot, slot: ArmorSlotLabel): boolean {
  if (
    isFilled(build.exoticArmor) &&
    exoticArmorOccupiesSlot(build.exoticArmor, slot)
  ) {
    return true
  }
  return Boolean(
    build.armorPieces?.some((piece) => piece.slot === slot && isFilled(piece.name))
  )
}

/** Count empty core slots: subclass, 3 weapons, 5 armor. */
export function countMissingLoadoutSlots(build: BuildSnapshot): number {
  let missing = 0

  if (!isFilled(build.subclass)) missing++
  if (!isFilled(build.kineticWeapon)) missing++
  if (!isFilled(build.energyWeapon)) missing++
  if (!isFilled(build.powerWeapon)) missing++

  for (const slot of ARMOR_SLOTS) {
    if (!armorSlotFilled(build, slot)) missing++
  }

  return missing
}

/** Saved/in-game loadouts must be mostly complete — hide if more than `maxMissing` slots are empty. */
export function shouldDisplaySavedLoadout(build: BuildSnapshot, maxMissing = 5): boolean {
  const missing = countMissingLoadoutSlots(build)
  if (missing > maxMissing) return false

  const weapons =
    Number(isFilled(build.kineticWeapon)) +
    Number(isFilled(build.energyWeapon)) +
    Number(isFilled(build.powerWeapon))
  const armor = ARMOR_SLOTS.filter((slot) => armorSlotFilled(build, slot)).length

  return weapons >= 2 && armor >= 3 && isFilled(build.subclass)
}

export function tagLoadoutCompleteness(build: BuildSnapshot): BuildSnapshot {
  const missing = countMissingLoadoutSlots(build)
  return {
    ...build,
    missingLoadoutSlots: missing,
    loadoutIncomplete: missing > 0,
  }
}

export function filterDisplayableSavedLoadouts(builds: BuildSnapshot[]): BuildSnapshot[] {
  return builds.filter((build) => shouldDisplaySavedLoadout(build))
}
