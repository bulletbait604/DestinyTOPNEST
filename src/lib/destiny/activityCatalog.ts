/**
 * Bungie DestinyActivityDefinition hashes for raids & dungeons.
 * Regenerate: node scripts/build-activity-icon-paths.mjs
 */

import type { CatalogEntry } from '@/lib/destiny/itemsCatalog'
import { ACTIVITY_ICON_PATHS } from '@/lib/destiny/activityIconPaths'

/** Activity name → manifest hash (DestinyActivityDefinition). */
export const ACTIVITY_CATALOG: Record<string, CatalogEntry & { iconPath?: string }> = {
  'garden of salvation': { hash: 1042180643, entity: 'DestinyActivityDefinition', iconPath: '/common/destiny2_content/icons/73145145af7557234148e93a9f504518.png' },
  'king\'s fall': { hash: 1063970578, entity: 'DestinyActivityDefinition', iconPath: '/common/destiny2_content/icons/1be2de95099f3b1fc8495b6eddde9024.png' },
  'root of nightmares': { hash: 2381413764, entity: 'DestinyActivityDefinition', iconPath: '/common/destiny2_content/icons/ce77d2b6221740fa0177d49ee38c7f61.png' },
  'deep stone crypt': { hash: 910380154, entity: 'DestinyActivityDefinition', iconPath: '/common/destiny2_content/icons/ee3cec197ac9f92bdb6ebf635ab7a972.png' },
  'vault of glass': { hash: 3711931140, entity: 'DestinyActivityDefinition', iconPath: '/common/destiny2_content/icons/7049fbb34ea9fa16c11ca5cd28622770.jpg' },
  'vow of the disciple': { hash: 2906950631, entity: 'DestinyActivityDefinition', iconPath: '/common/destiny2_content/icons/ac23fe09bb1460ad2919559bed75c809.png' },
  'last wish': { hash: 1661734046, entity: 'DestinyActivityDefinition', iconPath: '/common/destiny2_content/icons/09e201179e0cbdd9b8661be51cb953dc.png' },
  'crota\'s end': { hash: 107319834, entity: 'DestinyActivityDefinition', iconPath: '/common/destiny2_content/icons/e9890ad9660190df90ef95623c7f064c.png' },
  'salvation\'s edge': { hash: 2192826039, entity: 'DestinyActivityDefinition', iconPath: '/common/destiny2_content/icons/d5b4d5163d7b60a73ef9f98c6e73753a.png' },
  'crown of sorrow': { hash: 960175301, entity: 'DestinyActivityDefinition', iconPath: '/common/destiny2_content/icons/bd7a1fc995f87be96698263bc16698e7.png' },
  'spire of the watcher': { hash: 943878085, entity: 'DestinyActivityDefinition', iconPath: '/common/destiny2_content/icons/a6c1372576b30b7083a3957ffdb85258.png' },
  'pit of heresy': { hash: 785700673, entity: 'DestinyActivityDefinition', iconPath: '/common/destiny2_content/icons/ec0cd75ba1d20333fe93f126046fc1d2.png' },
  'ghosts of the deep': { hash: 124340010, entity: 'DestinyActivityDefinition', iconPath: '/common/destiny2_content/icons/5dd499f44342548f746a17071deccc70.png' },
  'duality': { hash: 1668217731, entity: 'DestinyActivityDefinition', iconPath: '/common/destiny2_content/icons/a790fbe7847f14d2db958e3e76615179.png' },
  'shattered throne': { hash: 2032534090, entity: 'DestinyActivityDefinition', iconPath: '/common/destiny2_content/icons/ec0cd75ba1d20333fe93f126046fc1d2.png' },
  'warlord\'s ruin': { hash: 2004855007, entity: 'DestinyActivityDefinition', iconPath: '/common/destiny2_content/icons/4737711fc9169f3f4215abcd53dbe114.png' },
  'grasp of avarice': { hash: 1112917203, entity: 'DestinyActivityDefinition', iconPath: '/common/destiny2_content/icons/ec0cd75ba1d20333fe93f126046fc1d2.png' },
  'prophecy': { hash: 1077850348, entity: 'DestinyActivityDefinition', iconPath: '/common/destiny2_content/icons/ec0cd75ba1d20333fe93f126046fc1d2.png' },
  'vesper\'s host': { hash: 1915770060, entity: 'DestinyActivityDefinition', iconPath: '/common/destiny2_content/icons/9c74785fc5b64f29cc302bc1212c2d6e.png' },
}

export function activityCatalogLookup(name: string): (CatalogEntry & { iconPath?: string }) | undefined {
  const key = name.trim().toLowerCase()
  const entry = ACTIVITY_CATALOG[key]
  if (!entry) return undefined
  const iconPath = entry.iconPath ?? ACTIVITY_ICON_PATHS[key]
  return iconPath ? { ...entry, iconPath } : entry
}

export function allCatalogActivityNames(): string[] {
  return Object.keys(ACTIVITY_CATALOG)
}
