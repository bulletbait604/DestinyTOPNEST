/**
 * Assign kinetic / energy / power slots for researched meta builds without duplicating exotics.
 */

import type { DestinyIconRef, ExternalBuildSource } from '@/lib/destiny/types'

export interface MetaWeaponSlotAssignment {
  kinetic: string
  energy: string
  power: string
  kineticRef?: DestinyIconRef
  energyRef?: DestinyIconRef
  powerRef?: DestinyIconRef
  exoticWeapon?: string
  exoticWeaponRef?: DestinyIconRef
}

function namesMatch(a?: string, b?: string): boolean {
  if (!a || !b) return false
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

function refsMatch(a?: DestinyIconRef, b?: DestinyIconRef): boolean {
  if (a?.hash && b?.hash) return a.hash === b.hash
  return namesMatch(a?.name, b?.name)
}

function refForWeaponName(name: string, refs?: DestinyIconRef[]): DestinyIconRef | undefined {
  if (!name || name === '—' || !refs?.length) return undefined
  return refs.find((ref) => namesMatch(ref.name, name))
}

/** Meta builds list exotic separately from the 3-weapon row — dedupe before display/apply. */
export function assignMetaWeaponSlots(build: ExternalBuildSource): MetaWeaponSlotAssignment {
  const weapons = (build.weapons ?? []).map((w) => w.trim()).filter(Boolean)
  const exotic = build.exoticWeapon?.trim()
  const exoticInWeapons = Boolean(exotic && weapons.some((w) => namesMatch(w, exotic)))

  const kinetic = weapons[0] ?? '—'
  const energy = weapons[1] ?? '—'
  let power = weapons[2] ?? '—'

  if (exotic && !exoticInWeapons && (power === '—' || !weapons[2])) {
    power = exotic
  }

  const kineticRef = refForWeaponName(kinetic, build.weaponRefs) ?? build.weaponRefs?.[0]
  const energyRef = refForWeaponName(energy, build.weaponRefs) ?? build.weaponRefs?.[1]
  let powerRef = refForWeaponName(power, build.weaponRefs) ?? build.weaponRefs?.[2]

  if (exotic && !exoticInWeapons && !powerRef && build.exoticWeaponRef) {
    powerRef = build.exoticWeaponRef
  }

  return {
    kinetic,
    energy,
    power,
    kineticRef,
    energyRef,
    powerRef,
    exoticWeapon: exotic,
    exoticWeaponRef: build.exoticWeaponRef,
  }
}

export function exoticWeaponAlreadyInArmoryRows(assignment: MetaWeaponSlotAssignment): boolean {
  const exotic = assignment.exoticWeapon
  const exoticRef = assignment.exoticWeaponRef
  if (!exotic && !exoticRef) return false

  return (
    namesMatch(exotic, assignment.kinetic) ||
    namesMatch(exotic, assignment.energy) ||
    namesMatch(exotic, assignment.power) ||
    refsMatch(exoticRef, assignment.kineticRef) ||
    refsMatch(exoticRef, assignment.energyRef) ||
    refsMatch(exoticRef, assignment.powerRef)
  )
}
