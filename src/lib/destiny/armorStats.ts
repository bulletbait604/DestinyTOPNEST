/**
 * Destiny 2 Armor 3.0 stats (Edge of Fate → Monument of Triumph).
 * Bungie API stat hashes are unchanged from Armor 2.0; display names + benefits differ.
 * Live icons / descriptions also sync into Mongo via `scripts/sync-armor-mod-catalog.mjs`.
 */

export type ArmorStatKey = 'Weapons' | 'Health' | 'Class' | 'Super' | 'Grenade' | 'Melee'

/** Character screen order in Armor 3.0. */
export const ARMOR_STAT_ORDER: ReadonlyArray<{
  key: ArmorStatKey
  legacyKey: string
  hash: number
  label: string
  iconPath: string
  iconUrl: string
}> = [
  {
    key: 'Weapons',
    legacyKey: 'Mobility',
    hash: 2996146975,
    label: 'Weapons',
    iconPath: '/common/destiny2_content/icons/bc69675acdae9e6b9a68a02fb4d62e07.png',
    iconUrl: 'https://www.bungie.net/common/destiny2_content/icons/bc69675acdae9e6b9a68a02fb4d62e07.png',
  },
  {
    key: 'Health',
    legacyKey: 'Resilience',
    hash: 392767087,
    label: 'Health',
    iconPath: '/common/destiny2_content/icons/717b8b218cc14325a54869bef21d2964.png',
    iconUrl: 'https://www.bungie.net/common/destiny2_content/icons/717b8b218cc14325a54869bef21d2964.png',
  },
  {
    key: 'Class',
    legacyKey: 'Recovery',
    hash: 1943323491,
    label: 'Class',
    iconPath: '/common/destiny2_content/icons/7eb845acb5b3a4a9b7e0b2f05f5c43f1.png',
    iconUrl: 'https://www.bungie.net/common/destiny2_content/icons/7eb845acb5b3a4a9b7e0b2f05f5c43f1.png',
  },
  {
    key: 'Super',
    legacyKey: 'Intellect',
    hash: 144602215,
    label: 'Super',
    iconPath: '/common/destiny2_content/icons/585ae4ede9c3da96b34086fccccdc8cd.png',
    iconUrl: 'https://www.bungie.net/common/destiny2_content/icons/585ae4ede9c3da96b34086fccccdc8cd.png',
  },
  {
    key: 'Grenade',
    legacyKey: 'Discipline',
    hash: 1735777505,
    label: 'Grenade',
    iconPath: '/common/destiny2_content/icons/065cdaabef560e5808e821cefaeaa22c.png',
    iconUrl: 'https://www.bungie.net/common/destiny2_content/icons/065cdaabef560e5808e821cefaeaa22c.png',
  },
  {
    key: 'Melee',
    legacyKey: 'Strength',
    hash: 4244567218,
    label: 'Melee',
    iconPath: '/common/destiny2_content/icons/fa534aca76d7f2d7e7b4ba4df4271b42.png',
    iconUrl: 'https://www.bungie.net/common/destiny2_content/icons/fa534aca76d7f2d7e7b4ba4df4271b42.png',
  },
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

/** Armor 3.0 stat benefits (Monument of Triumph / Edge of Fate). */
export const ARMOR_STAT_BENEFITS: Record<
  ArmorStatKey,
  { base: readonly string[]; bonus: readonly string[] }
> = {
  Weapons: {
    base: ['Faster reload and handling', '+15% PvE damage vs minors and majors'],
    bonus: ['Extra ammo from bricks', '+15% damage vs bosses', '+6% PvP damage'],
  },
  Health: {
    base: ['+Orb healing (up to 70 HP)', '+Flinch resist (up to 10%)'],
    bonus: [
      'Faster shield recharge (up to +25%)',
      'Faster full recharge (up to 50%)',
      '+20 shield HP (PvE)',
    ],
  },
  Class: {
    base: ['Faster class ability regen', 'More class ability energy from kills'],
    bonus: ['+40 HP overshield on class ability (PvE)', '+10 HP overshield (PvP)'],
  },
  Super: {
    base: ['More Super energy from damage and orbs'],
    bonus: ['+45% Super damage'],
  },
  Grenade: {
    base: ['Faster grenade cooldown', 'More grenade energy from kills'],
    bonus: ['+65% grenade damage (PvE)'],
  },
  Melee: {
    base: ['Faster melee cooldown', 'More melee energy from kills'],
    bonus: ['+30% melee / powered / glaive damage'],
  },
}

/** All 12 Armor 3.0 archetypes after Monument of Triumph. */
export const ARMOR_ARCHETYPES: ReadonlyArray<{
  name: string
  primary: ArmorStatKey
  secondary: ArmorStatKey
}> = [
  { name: 'Bulwark', primary: 'Health', secondary: 'Class' },
  { name: 'Brawler', primary: 'Melee', secondary: 'Health' },
  { name: 'Grenadier', primary: 'Grenade', secondary: 'Super' },
  { name: 'Paragon', primary: 'Super', secondary: 'Melee' },
  { name: 'Specialist', primary: 'Class', secondary: 'Weapons' },
  { name: 'Gunner', primary: 'Weapons', secondary: 'Grenade' },
  { name: 'Siegebreaker', primary: 'Health', secondary: 'Grenade' },
  { name: 'Skirmisher', primary: 'Melee', secondary: 'Weapons' },
  { name: 'Demolitionist', primary: 'Grenade', secondary: 'Class' },
  { name: 'Colossus', primary: 'Super', secondary: 'Health' },
  { name: 'Reaver', primary: 'Class', secondary: 'Melee' },
  { name: 'Powerhouse', primary: 'Weapons', secondary: 'Super' },
]

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
