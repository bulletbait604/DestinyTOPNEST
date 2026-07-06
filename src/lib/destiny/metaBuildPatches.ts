import type { ArmorSlotLabel } from '@/lib/destiny/types'

/** Optional per-build legendary overrides — merged with class templates in metaBuildClassRules. */
export const META_BUILD_ARMOR_PATCHES: Record<
  string,
  Partial<Record<ArmorSlotLabel, string>>
> = {
  'meta-togame-praxic-getaway-warlock': {
    chest: 'Spacewalk Vest',
  },
  'meta-bb-prismatic-artist-warlock': {
    chest: 'Twisting Echo Vest',
  },
  'meta-lightgg-void-grenade-warlock': {
    chest: 'Promised Reign Vest',
  },
  'meta-togame-combination-blow-hunter': {
    chest: "Willbreaker's Resolve",
  },
  'meta-bb-transcendent-tank-hunter': {
    chest: "Willbreaker's Resolve",
  },
  'meta-lightgg-prismatic-hunter': {
    chest: "Willbreaker's Resolve",
  },
  'meta-togame-praxic-stronghold-titan': {
    chest: "Willbreaker's Resolve",
  },
  'meta-bb-come-on-and-slam-titan': {
    legs: 'Untethered Edge Plate',
  },
  'meta-lightgg-raid-arc-titan': {
    chest: "Willbreaker's Resolve",
  },
}

/** Deep links to specific build guides (item pages use Bungie hashes separately). */
export const META_BUILD_SOURCE_URLS: Record<string, string> = {
  'meta-togame-praxic-getaway-warlock': 'https://togame.io/a/destiny2-pve-loadout-meta/',
  'meta-togame-praxic-stronghold-titan': 'https://togame.io/a/destiny2-pve-loadout-meta/',
  'meta-togame-combination-blow-hunter': 'https://togame.io/a/destiny2-pve-loadout-meta/',
  'meta-bb-prismatic-artist-warlock': 'https://www.blueberries.gg/armor/best-destiny-2-builds/',
  'meta-bb-come-on-and-slam-titan': 'https://www.blueberries.gg/armor/destiny-2-titan-builds/',
  'meta-bb-transcendent-tank-hunter': 'https://www.blueberries.gg/armor/destiny-2-hunter-builds/',
  'meta-lightgg-raid-arc-titan': 'https://www.light.gg/loadouts/db/?class=titan&activity=raids',
  'meta-lightgg-prismatic-getaway-warlock': 'https://www.light.gg/loadouts/db/?class=warlock&subclass=prismatic',
  'meta-lightgg-void-grenade-warlock': 'https://www.light.gg/loadouts/db/?class=warlock&subclass=void',
  'meta-lightgg-melee-titan': 'https://www.light.gg/loadouts/db/?class=titan&subclass=prismatic',
  'meta-lightgg-prismatic-hunter': 'https://www.light.gg/loadouts/db/?class=hunter&subclass=prismatic',
  'meta-builders-cuirass-contest': 'https://builders.gg/destiny/dim-builds/dn7kvli/raid',
  'meta-bb-one-two-grapple-hunter': 'https://www.blueberries.gg/armor/destiny-2-hunter-builds/',
}

/** Armor 3.0 stat focus from togame.io / Blueberries July 2026 research. */
export const META_BUILD_STAT_PRIORITIES: Record<string, string[]> = {
  'meta-togame-praxic-getaway-warlock': ['Health', 'Class', 'Grenade'],
  'meta-togame-praxic-stronghold-titan': ['Health', 'Melee', 'Weapons'],
  'meta-togame-combination-blow-hunter': ['Melee', 'Class', 'Health'],
  'meta-bb-prismatic-artist-warlock': ['Class', 'Grenade', 'Health'],
  'meta-bb-come-on-and-slam-titan': ['Melee', 'Health', 'Class'],
  'meta-bb-transcendent-tank-hunter': ['Health', 'Class', 'Melee'],
  'meta-lightgg-raid-arc-titan': ['Super', 'Weapons', 'Health'],
  'meta-lightgg-prismatic-getaway-warlock': ['Health', 'Class', 'Grenade'],
  'meta-lightgg-void-grenade-warlock': ['Grenade', 'Class', 'Health'],
  'meta-lightgg-melee-titan': ['Melee', 'Health', 'Class'],
  'meta-lightgg-prismatic-hunter': ['Melee', 'Class', 'Health'],
  'meta-bb-one-two-grapple-hunter': ['Melee', 'Class', 'Health'],
}
