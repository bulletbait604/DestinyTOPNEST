/**
 * Destiny 2 Armor 3.0 stat names (Edge of Fate).
 * Bungie API stat hashes are unchanged; only display names differ from Armor 2.0.
 */

export type ArmorStatKey = 'Weapons' | 'Health' | 'Class' | 'Super' | 'Grenade' | 'Melee'

/** Character screen order in Armor 3.0. */
export const ARMOR_STAT_ORDER: ReadonlyArray<{
  key: ArmorStatKey
  legacyKey: string
  hash: number
  label: string
}> = [
  { key: 'Weapons', legacyKey: 'Mobility', hash: 2996146975, label: 'Weapons' },
  { key: 'Health', legacyKey: 'Resilience', hash: 392767087, label: 'Health' },
  { key: 'Class', legacyKey: 'Recovery', hash: 1943323491, label: 'Class' },
  { key: 'Super', legacyKey: 'Intellect', hash: 144602215, label: 'Super' },
  { key: 'Grenade', legacyKey: 'Discipline', hash: 1735777505, label: 'Grenade' },
  { key: 'Melee', legacyKey: 'Strength', hash: 4244567218, label: 'Melee' },
]

export const ARMOR_STAT_HASH_LABEL: Record<number, ArmorStatKey> = Object.fromEntries(
  ARMOR_STAT_ORDER.map(({ hash, key }) => [hash, key])
) as Record<number, ArmorStatKey>

/** In-game stat colors (Armor 3.0). */
export const D2_ARMOR_STAT_COLORS: Record<ArmorStatKey, string> = {
  Weapons: '#3498db',
  Health: '#e74c3c',
  Class: '#2ecc71',
  Super: '#9b59b6',
  Grenade: '#f1c40f',
  Melee: '#e67e22',
}

/** Armor 3.0 stat benefits by tier (Edge of Fate). */
export const ARMOR_STAT_BENEFITS: Record<
  ArmorStatKey,
  { base: readonly string[]; bonus: readonly string[] }
> = {
  Weapons: {
    base: ['Faster reload and handling', 'Bonus damage vs minors and majors'],
    bonus: ['Boss damage bonus', 'Higher ammo brick drop chance'],
  },
  Health: {
    base: ['Healing from Orbs of Power', 'Flinch resistance'],
    bonus: ['Faster shield recharge', 'Increased shield capacity'],
  },
  Class: {
    base: ['Faster class ability cooldown', 'More class ability energy from kills'],
    bonus: ['Overshield when you cast class ability'],
  },
  Super: {
    base: ['More Super energy from damage and orbs'],
    bonus: ['Increased Super damage'],
  },
  Grenade: {
    base: ['Faster grenade cooldown', 'More grenade energy from kills'],
    bonus: ['Increased grenade damage'],
  },
  Melee: {
    base: ['Faster melee cooldown', 'More melee energy from kills'],
    bonus: ['Increased melee, powered, and glaive damage'],
  },
}

/** Plain-text summary for native title fallback. */
export function armorStatBenefitSummary(key: ArmorStatKey, value: number): string {
  const { base, bonus } = ARMOR_STAT_BENEFITS[key]
  const tier = value > 100 ? '101–200' : '1–100'
  const active = value > 100 ? bonus : base
  return `${tier}: ${active.join('; ')}`
}

/** Read a stat total from mixed legacy / Armor 3.0 payload keys. */
export function armorStatValue(stats: Record<string, number>, key: ArmorStatKey, legacyKey: string): number {
  const direct = stats[key] ?? stats[key.toLowerCase()]
  if (typeof direct === 'number') return direct
  const legacy = stats[legacyKey] ?? stats[legacyKey.toLowerCase()]
  return typeof legacy === 'number' ? legacy : 0
}

/** Normalize stored stats to Armor 3.0 keys. */
export function normalizeArmorStats(stats: Record<string, number>): Record<ArmorStatKey, number> {
  const out = {} as Record<ArmorStatKey, number>
  for (const { key, legacyKey } of ARMOR_STAT_ORDER) {
    out[key] = armorStatValue(stats, key, legacyKey)
  }
  return out
}
