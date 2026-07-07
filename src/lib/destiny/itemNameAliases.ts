/**
 * Map display names from build sites / meta research to Bungie manifest names or catalog keys.
 * Keys are normalized via normalizeItemKey().
 */

export const ITEM_NAME_ALIASES: Record<string, string> = {
  // Meta site shorthand → Bungie name
  bleakwatch: 'bleak watcher',
  "winter's resilience": "winter's shroud",
  gyrfalcon: "gyrfalcon's hauberk",
  'melas penoplia': 'melas panoplia',
  lament: 'the lament',
  'waveframe trace rifle': 'null composure',
  'touch of devour': 'feed the void',
  'tractor cannon': 'tractor cannon',
  // Solar fragments / aspects (exact names in manifest)
  'touch of flame': 'touch of flame',
  hellion: 'hellion',
  'ember of ashes': 'ember of ashes',
  'ember of benevolence': 'ember of benevolence',
  'ember of char': 'ember of char',
  // Arc hunter / titan
  'lethal current': 'lethal current',
  'gathering storm': 'gathering storm',
  'spark of amplitude': 'spark of amplitude',
  'spark of volts': 'spark of volts',
  'lightning storm': 'touch of thunder',
  'shock absorber': 'electrostatic mind',
  // Void warlock
  'feed the void': 'feed the void',
  'echo of remnants': 'echo of remnants',
  // Armor mods
  dynamism: 'innervation',
  'grenade font': 'grenade font',
  bomber: 'bomber',
  surge: 'harmonic siphon',
  // Exotics / armor
  'contraverse hold': 'contraverse hold',
  conversate: 'contraverse hold',
  // Weapon nicknames
  khvostov: 'khvostov 7g-0x',
  'khvostov 7g': 'khvostov 7g-0x',
  zephyr: 'zephyr reward',
  supremacy: 'supremacy',
  'calus selected': "calus's selected",
  // Prismatic facets already match; Bleak Watcher catalog uses perk entity
}

export function normalizeItemKey(name: string): string {
  return name.trim().toLowerCase().replace(/^the\s+/i, '').replace(/[''`]/g, "'").replace(/\s+/g, ' ')
}

/** Resolve a display label to the best catalog / manifest lookup key. */
export function resolveItemDisplayName(name: string): string {
  const key = normalizeItemKey(name)
  const alias = ITEM_NAME_ALIASES[key]
  return alias ? normalizeItemKey(alias) : key
}

export function itemNameLookupCandidates(name: string): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  const push = (value: string) => {
    const key = normalizeItemKey(value)
    if (!key || seen.has(key)) return
    seen.add(key)
    out.push(key)
  }
  push(name)
  const alias = ITEM_NAME_ALIASES[normalizeItemKey(name)]
  if (alias) push(alias)
  push(name.replace(/^the\s+/i, ''))
  return out
}
