/**
 * Armor 3.0 + Monument of Triumph (June 2026) build rules for recommended loadout optimization.
 * Sources: light.gg set bonuses, Edge of Fate / Reclamation armor tier system.
 */

export const META_BUILD_EARLIEST_PUBLISHED = '2026-07-05T00:00:00.000Z'

/** Ability stat soft-cap after Monument of Triumph — spread stats instead of single-stacking. */
export const ARMOR_3_ABILITY_STAT_CAP = 125

export const CORE_SURVIVAL_MODS = ['Recuperation', 'Better Already', 'Innervation'] as const
export const CORE_ABILITY_MODS = ['Harmonic Siphon', 'Ashes to Assets', 'Dynamism'] as const

/** Strong PvE set bonuses (Armor 3.0) — used for optimization notes. */
export const RECOMMENDED_ARMOR_SETS: Record<
  string,
  { twoPiece: string; fourPiece?: string; bestFor: string[] }
> = {
  Bushido: {
    twoPiece: 'Iaido — faster sword charge',
    fourPiece: 'Counterattack — melee kills grant damage resist',
    bestFor: ['hunter', 'titan'],
  },
  Techsec: {
    twoPiece: 'Accretion — kinetic precision hits grant bonus damage',
    fourPiece: 'Reactive Booster — ability kills extend buff',
    bestFor: ['hunter', 'warlock'],
  },
  'Down the Line': {
    twoPiece: 'Pantheon synergy — weapon swap on boss',
    fourPiece: 'Stacking boss DPS during damage phases',
    bestFor: ['pantheon', 'raid'],
  },
  AION: {
    twoPiece: 'Force Absorption',
    fourPiece: 'Reactive Shock — arc synergy',
    bestFor: ['warlock', 'titan'],
  },
}

/** Post–Edge of Fate exotic armor commonly featured in June 2026 meta research. */
export const RECENT_EXOTIC_ARMOR = new Set([
  'Getaway Artist',
  'Stronghold',
  'Gifted Conviction',
  'Cuirass of the Falling Star',
  'Starfire Protocol',
  'Gyrfalcon',
  'Omnioculus',
  'Mantle of Battle Harmony',
  'Hallowfire Heart',
  'Phoenix Protocol',
])

export const RECENT_EXOTIC_WEAPONS = new Set([
  'Praxic Blade',
  'Witherhoard',
  'Outbreak Perfected',
  'Khvostov 7G-0X',
  'Divinity',
  'Izanagi',
])

/** One exotic armor + at most one exotic weapon (kinetic/special/heavy). */
export function validateExoticRules(exoticArmor?: string, exoticWeapon?: string, weapons?: string[]): string[] {
  const issues: string[] = []
  if (!exoticArmor?.trim()) issues.push('Missing exotic armor — every endgame build needs one exotic piece.')
  const weaponExotics = (weapons ?? []).filter((w) =>
    /outbreak|witherhoard|praxic|izanagi|divinity|exotic/i.test(w)
  )
  if (exoticWeapon && weaponExotics.length > 1) {
    issues.push('Only one exotic weapon should be equipped.')
  }
  return issues
}

/** Suggest Armor 3.0 set strategy based on activity and class. */
export function suggestArmorSetStrategy(
  activityFocus?: string,
  characterClass?: string
): { strategy: 'four-piece' | 'dual-two-piece'; setHint: string; note: string } {
  const focus = (activityFocus ?? '').toLowerCase()
  if (focus.includes('pantheon')) {
    return {
      strategy: 'four-piece',
      setHint: 'Down the Line',
      note: '4-piece Down the Line stacks boss DPS during Pantheon encounters; pair with one exotic armor slot.',
    }
  }
  if (focus.includes('grandmaster') || focus.includes('gm')) {
    return {
      strategy: 'dual-two-piece',
      setHint: 'Bushido + Techsec',
      note: 'Dual 2-piece (Bushido + Techsec) for resist and kinetic DPS while keeping exotic flexibility in GMs.',
    }
  }
  if (characterClass === 'warlock') {
    return {
      strategy: 'four-piece',
      setHint: 'AION or Techsec',
      note: 'Warlock endgame: 4-piece set bonus + Starfire/Getaway Artist exotic for ability loops.',
    }
  }
  return {
    strategy: 'dual-two-piece',
    setHint: 'Bushido + Techsec',
    note: 'Armor 3.0: two 2-piece bonuses + exotic is the default flexible raid/dungeon layout.',
  }
}

export function isPublishedAfterCutoff(iso?: string, cutoff = META_BUILD_EARLIEST_PUBLISHED): boolean {
  if (!iso) return false
  return Date.parse(iso) >= Date.parse(cutoff)
}
