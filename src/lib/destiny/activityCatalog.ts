/**
 * Bungie DestinyActivityDefinition hashes for raids & dungeons.
 * Regenerate: node scripts/build-activity-icon-paths.mjs
 */

import type { CatalogEntry } from '@/lib/destiny/itemsCatalog'
import { ACTIVITY_ICON_PATHS, normalizeActivityKey } from '@/lib/destiny/activityIconPaths'

/** Activity name → manifest hash (DestinyActivityDefinition). */
export const ACTIVITY_CATALOG: Record<string, CatalogEntry & { iconPath?: string }> = {
  pantheon: { hash: 107319834, entity: 'DestinyActivityDefinition', iconPath: '/img/destiny_content/pgcr/raid_crotas_end.jpg' },
  'garden of salvation': { hash: 1042180643, entity: 'DestinyActivityDefinition', iconPath: '/img/destiny_content/pgcr/raid_garden_of_salvation.jpg' },
  'king\'s fall': { hash: 1063970578, entity: 'DestinyActivityDefinition', iconPath: '/img/destiny_content/pgcr/raid_kings_fall.jpg' },
  'root of nightmares': { hash: 2381413764, entity: 'DestinyActivityDefinition', iconPath: '/img/destiny_content/pgcr/raid_root_of_nightmares.jpg' },
  'deep stone crypt': { hash: 910380154, entity: 'DestinyActivityDefinition', iconPath: '/img/destiny_content/pgcr/europa-raid-deep-stone-crypt.jpg' },
  'vault of glass': { hash: 3711931140, entity: 'DestinyActivityDefinition', iconPath: '/img/destiny_content/pgcr/vault_of_glass.jpg' },
  'vow of the disciple': { hash: 2906950631, entity: 'DestinyActivityDefinition', iconPath: '/common/destiny2_content/icons/ac23fe09bb1460ad2919559bed75c809.png' },
  'last wish': { hash: 1661734046, entity: 'DestinyActivityDefinition', iconPath: '/img/destiny_content/pgcr/raid_beanstalk.jpg' },
  'crota\'s end': { hash: 107319834, entity: 'DestinyActivityDefinition', iconPath: '/img/destiny_content/pgcr/raid_crotas_end.jpg' },
  'salvation\'s edge': { hash: 2192826039, entity: 'DestinyActivityDefinition', iconPath: '/img/destiny_content/pgcr/raid_splinter.jpg' },
  'crown of sorrow': { hash: 960175301, entity: 'DestinyActivityDefinition', iconPath: '/common/destiny2_content/icons/9806a52b539b813c12c4d8658803c22c.png' },
  'spire of the watcher': { hash: 943878085, entity: 'DestinyActivityDefinition', iconPath: '/img/destiny_content/pgcr/dungeon_spire_of_the_watcher.jpg' },
  'pit of heresy': { hash: 785700673, entity: 'DestinyActivityDefinition', iconPath: '/common/destiny2_content/icons/87271a86b4542822aad73d8f0f56d4cb.png' },
  'ghosts of the deep': { hash: 124340010, entity: 'DestinyActivityDefinition', iconPath: '/img/destiny_content/pgcr/dungeon_ghosts_of_the_deep.jpg' },
  'duality': { hash: 1668217731, entity: 'DestinyActivityDefinition', iconPath: '/img/destiny_content/pgcr/dungeon_duality.jpg' },
  'shattered throne': { hash: 2032534090, entity: 'DestinyActivityDefinition', iconPath: '/common/destiny2_content/icons/a2ca0f5066ae751326e9db0c7bc6ff20.jpg' },
  'warlord\'s ruin': { hash: 2004855007, entity: 'DestinyActivityDefinition', iconPath: '/img/destiny_content/pgcr/dungeon_ridgeline.jpg' },
  'grasp of avarice': { hash: 1112917203, entity: 'DestinyActivityDefinition', iconPath: '/common/destiny2_content/icons/b5c87175a97d1333da0ff4300fb87f57.png' },
  'prophecy': { hash: 1077850348, entity: 'DestinyActivityDefinition', iconPath: '/common/destiny2_content/icons/1406f929d0c25506a5ab5ea73956fcb3.png' },
  'vesper\'s host': { hash: 1915770060, entity: 'DestinyActivityDefinition', iconPath: '/img/destiny_content/pgcr/vespers_host.jpg' },
  'sundered doctrine': { hash: 247869137, entity: 'DestinyActivityDefinition', iconPath: '/img/destiny_content/pgcr/dungeon_delver.jpg' },
}

export function activityCatalogLookup(name: string): (CatalogEntry & { iconPath?: string }) | undefined {
  const key = normalizeActivityKey(name)
  const entry = ACTIVITY_CATALOG[key]
  if (!entry) return undefined
  const iconPath = entry.iconPath ?? ACTIVITY_ICON_PATHS[key]
  return iconPath ? { ...entry, iconPath } : entry
}

export function allCatalogActivityNames(): string[] {
  return Object.keys(ACTIVITY_CATALOG)
}
