/**
 * Build static item/perk icon paths from Bungie manifest JSON.
 * Icons: DestinyInventoryItemDefinition.displayProperties.icon (+ perks, classes, damage types)
 * Run: node scripts/build-item-catalog.mjs
 */
import { writeFileSync } from 'fs'
import {
  MANIFEST_TABLES,
  iconOk,
  loadManifestTables,
} from './lib/manifestClient.mjs'
import { ITEM_HASH_OVERRIDES } from './loot-icon-overrides.mjs'

const ITEM_NAMES = [
  'Ophidian Aspect',
  'Cuirass of the Falling Star',
  'Wormgod Caress',
  'Praxic Blade',
  'Getaway Artist',
  'Gifted Conviction',
  'Stronghold',
  'Starfire Protocol',
  'Star-Eater Scales',
  'Outbreak Perfected',
  'Witherhoard',
  'Raiden Flux',
  'Gyrfalcon',
  'Thunderlord',
  'Icefall Mantle',
  'Divinity',
  'Wish-Keeper',
  'Cataclysmic',
  "Calus's Selected",
  'Null Composure',
  'Stormchaser',
  'Submission',
  'Imminence',
  'Supremacy',
  'Explosive Personality',
  'Zephyr Reward',
  'Bleak Watcher',
  'Sword',
  'Nova Bomb',
  'Healing Rift',
  'Void Grenade',
  'Echo of Undermining',
  'Echo of Instability',
  'Prismatic',
  'Arc',
  'Solar',
  'Void',
  'Strand',
  'Stasis',
  'Warlock',
  'Titan',
  'Hunter',
  'Emblem of the Guardian',
  'Emblem of the Brave',
  // Weekly rotation chase loot (activityLoot.ts)
  'Touch of Malice',
  'Kingslayer',
  'Smite of Merain',
  'Defiance of Yasmin',
  'Vex Mythoclast',
  'Fatebringer',
  'Vision of Confluence',
  'Hezen Vengeance',
  'Zealot\'s Robe',
  'Zealot\'s Reward',
  "Emperor's Courtesy",
  'Reckless Endangerment',
  'One Thousand Voices',
  'Nation of Beasts',
  'Chattering Bone',
  'Age-Old Bond',
  'Necrochasm',
  'Swordbreaker',
  "Omnigul's Grieve",
  'Abyssal Defiant',
  'Conditional Finality',
  "Rufus's Fury",
  "Mykel's Reverence",
  "Nimrod's Hunter",
  "Lubrae's Ruin",
  'Forbearance',
  'Insidious',
  'Deliverance',
  'Eyes of Tomorrow',
  'Heritage',
  'Commemoration',
  'Posterity',
  'Ergo Sum',
  'Non-Denouement',
  'Forthcoming Deviance',
  'Tarrabah',
  'Apex Predator',
  'Beloved',
  'Gjallarhorn',
  'Xenophage',
  'Eyasluna',
  'The Comedian',
  'Wish-Ender',
  'Twilight Oath',
  'The Tyranny of Heaven',
  'Transfiguration',
  'Hierarchy of Needs',
  "Zaouli's Wrath",
  'Forgiveness',
  'Terminus Horizon',
  'Heartshadow',
  'Incursion',
  'Fixed Odds',
  'The Navigator',
  "Rufus's Fire",
  'Under Your Skin',
  'Out of Bounds',
  'Ballista',
  "The Militia's Birthright",
  'The Clever Rat',
  'The Long Goodbye',
  'Heretic',
  'Perfect Pitch',
  'IKELOS SMG',
  'IKELOS Shotgun',
  'IKELOS Sniper',
  'Midnight Coup',
  'Dark Age Arsenal',
  'Incisor',
  'Outlast',
  "Vesper's Host",
  'Cold Comfort',
  'Touch of Malice Catalyst',
  "Zaouli's Bane",
  'Heretic',
  "Warlord's Spear",
  'Thoughtless',
  "Acacia's Dejection",
  'Word of Crota',
  'Abyss Defiant',
  'Icefall Mantle',
  'Prime Zealot Cuirass',
  'Bushido Plate',
  'Fused Aurum Plate',
  "Willbreaker's Resolve",
  'Moonfang-X7 Rig',
  'Resonant Fury Plate',
  'Eidolon Pursuant Plate',
  "Legacy's Oath Plate",
  'Untethered Edge Plate',
  'Twofold Crown Plate',
  'Opulent Duelist Plate',
  'Reverie Dawn Plate',
  'Seventh Seraph Plate',
  "Temptation's Bond",
  'Deep Explorer Plate',
  'Mark of the Unassailable',
  'Tusked Allegiance Plate',
  'Dark Age Chestrig',
  'BrayTech Combat Vest',
  'Perfect Pitch',
  'Duality',
  'Xenophage Catalyst',
  'IKELOS_SMG_v1.0.1',
  'IKELOS_SG_v1.0.1',
  'IKELOS_SR_v1.0.1',
]

const EMBLEM_HASHES = [29194593, 31953746, 54004489, 54004491, 19962737, 10493725]

const ITEM_NAME_ALIASES = {
  supremacy: 'the supremacy',
  'void grenade': 'vortex grenade',
  sword: 'falling guillotine',
  'zephyr reward': 'zephyr',
  'ikelos smg': 'ikeleos smg v1.0.1',
  'ikeleos smg': 'ikeleos smg v1.0.1',
  'ikeleos_submachine_gun_v1.0.1.': 'ikeleos smg v1.0.1',
  'ikeleos smg v1.0.1': 'ikeleos smg v1.0.1',
  'ikeleos smg': 'ikeleos smg v1.0.1',
  'ikeleos shotgun': 'ikeleos shotgun v1.0.1',
  'ikeleos sniper': 'ikeleos sniper v1.0.1',
  kingslayer: 'touch of malice catalyst',
  'dark age arsenal': 'warlord\'s spear',
  "vesper's host": 'icefall mantle',
  "rufus's fire": 'thoughtless',
  "omnigul's grieve": 'word of crota',
  'abyssal defiant': 'abyss defiant',
  "nimrod's hunter": 'acacia\'s dejection',
  "zealot's robe": 'prime zealot cuirass',
  "zaouli's wrath": 'zaouli\'s bane',
  "zealot's reward": 'zealot\'s reward',
  ballista: 'heretic',
  'the clever rat': 'perfect pitch',
  incursion: 'duality',
  navigator: 'the navigator',
}

const CLASS_TARGETS = new Set(['warlock', 'titan', 'hunter'])
const DAMAGE_TARGETS = new Set(['arc', 'solar', 'void', 'stasis', 'strand', 'prismatic'])
const PERK_TARGETS = new Set([
  'nova bomb',
  'healing rift',
  'void grenade',
  'echo of undermining',
  'echo of instability',
  'bleak watcher',
])

const ITEM_OVERRIDES = {
  ...ITEM_HASH_OVERRIDES,
  supremacy: 686951703,
  'void grenade': 1016030582,
  sword: 243425374,
  'zephyr reward': 3400256755,
}

function norm(s) {
  return s.trim().toLowerCase().replace(/^the\s+/i, '')
}

function resolveTarget(name) {
  const key = norm(name)
  return ITEM_NAME_ALIASES[key] ?? key
}

function scoreName(displayName, target) {
  const d = norm(displayName)
  const t = resolveTarget(target)
  if (d === t) return 100
  return 0
}

function tablesForTarget(key) {
  if (CLASS_TARGETS.has(key)) {
    return [{ defs: classes, entity: MANIFEST_TABLES.classes }]
  }
  if (DAMAGE_TARGETS.has(key)) {
    return [{ defs: damageTypes, entity: MANIFEST_TABLES.damageTypes }]
  }
  if (PERK_TARGETS.has(key)) {
    return [{ defs: perks, entity: MANIFEST_TABLES.perks }]
  }
  return [{ defs: inventory, entity: MANIFEST_TABLES.inventory }]
}

const { tables } = await loadManifestTables([
  MANIFEST_TABLES.inventory,
  MANIFEST_TABLES.perks,
  MANIFEST_TABLES.classes,
  MANIFEST_TABLES.damageTypes,
])

const inventory = tables[MANIFEST_TABLES.inventory]
const perks = tables[MANIFEST_TABLES.perks]
const classes = tables[MANIFEST_TABLES.classes]
const damageTypes = tables[MANIFEST_TABLES.damageTypes]

const manifestTables = [
  { table: MANIFEST_TABLES.inventory, defs: inventory, entity: MANIFEST_TABLES.inventory },
  { table: MANIFEST_TABLES.perks, defs: perks, entity: MANIFEST_TABLES.perks },
  { table: MANIFEST_TABLES.classes, defs: classes, entity: MANIFEST_TABLES.classes },
  { table: MANIFEST_TABLES.damageTypes, defs: damageTypes, entity: MANIFEST_TABLES.damageTypes },
]

const catalog = {}
const iconPaths = {}

for (const target of ITEM_NAMES) {
  const key = norm(target)
  const overrideHash = ITEM_OVERRIDES[resolveTarget(target)] ?? ITEM_OVERRIDES[key]
  if (overrideHash) {
    let applied = false
    for (const { defs, entity } of manifestTables) {
      const def = defs[String(overrideHash)]
      const icon = def?.displayProperties?.icon
      if (!icon || icon.includes('missing_icon') || !(await iconOk(icon))) continue
      catalog[key] = { hash: overrideHash, entity, iconPath: icon }
      iconPaths[key] = icon
      console.log(target, '→ override', def.displayProperties.name, overrideHash, icon)
      applied = true
      break
    }
    if (applied) continue
  }

  let best = null
  for (const { defs, entity } of tablesForTarget(key)) {
    for (const [hash, def] of Object.entries(defs)) {
      const name = def?.displayProperties?.name
      const icon = def?.displayProperties?.icon
      if (!name || !icon || icon.includes('missing_icon')) continue
      const score = scoreName(name, target)
      if (score < 100) continue
      const candidate = { hash: Number(hash), name, icon, score, entity }
      if (!best || candidate.score > best.score) best = candidate
    }
  }

  if (best && (await iconOk(best.icon))) {
    catalog[key] = { hash: best.hash, entity: best.entity, iconPath: best.icon }
    iconPaths[key] = best.icon
    console.log(target, '→', best.name, best.hash, best.icon)
  } else {
    console.log('MISSING', target)
  }
}

const emblemPaths = {}
for (const hash of EMBLEM_HASHES) {
  const def = inventory[String(hash)]
  const icon = def?.displayProperties?.icon
  if (icon && (await iconOk(icon))) {
    emblemPaths[String(hash)] = icon
    console.log('Emblem', def.displayProperties.name, hash, icon)
  }
}

const iconPathsOut = `/** Verified Bungie icon paths for catalog items (HTTP-checked). */
export const ITEM_ICON_PATHS: Record<string, string> = ${JSON.stringify(iconPaths, null, 2)}

export function itemIconPathFallback(name: string): string | undefined {
  return ITEM_ICON_PATHS[name.trim().toLowerCase()]
}
`

const emblemOut = `/** Emblem icon paths by inventory hash — used for mock/demo avatars. */
export const EMBLEM_ICON_PATHS: Record<number, string> = ${JSON.stringify(
  Object.fromEntries(Object.entries(emblemPaths).map(([k, v]) => [Number(k), v])),
  null,
  2
)}

export const MOCK_EMBLEM_ICON_URLS: string[] = ${JSON.stringify(Object.values(emblemPaths).map((p) => `https://www.bungie.net${p}`))}

export function emblemIconUrlForHash(hash: number): string | undefined {
  const path = EMBLEM_ICON_PATHS[hash]
  return path ? \`https://www.bungie.net\${path}\` : undefined
}

export function emblemIconUrlForRank(rank: number): string | undefined {
  if (!MOCK_EMBLEM_ICON_URLS.length) return undefined
  return MOCK_EMBLEM_ICON_URLS[(rank - 1) % MOCK_EMBLEM_ICON_URLS.length]
}
`

const catalogOut = `/**
 * Fallback Bungie definition hashes when manifest lookup is unavailable.
 * Regenerate: node scripts/build-item-catalog.mjs
 */

export type ManifestEntityType =
  | 'DestinyInventoryItemDefinition'
  | 'DestinyActivityDefinition'
  | 'DestinyActivityModeDefinition'
  | 'DestinySandboxPerkDefinition'
  | 'DestinyClassDefinition'
  | 'DestinyDamageTypeDefinition'
  | 'DestinyStatDefinition'
  | 'DestinyEquipableItemSetDefinition'
  | 'DestinyPlugSetDefinition'
  | 'DestinyPresentationNodeDefinition'

export interface CatalogEntry {
  hash: number
  entity: ManifestEntityType
  iconPath?: string
}

import { ITEM_ICON_PATHS } from '@/lib/destiny/itemIconPaths'

/** Name → hash catalog (case-insensitive lookup in resolver). */
export const ITEM_CATALOG: Record<string, CatalogEntry> = {
${Object.entries(catalog)
  .map(([key, entry]) => {
    return `  '${key.replace(/'/g, "\\'")}': { hash: ${entry.hash}, entity: '${entry.entity}'${entry.iconPath ? `, iconPath: '${entry.iconPath}'` : ''} },`
  })
  .join('\n')}
}

export function catalogLookup(name: string): CatalogEntry | undefined {
  const key = name.trim().toLowerCase()
  const entry = ITEM_CATALOG[key]
  if (!entry) return undefined
  const iconPath = entry.iconPath ?? ITEM_ICON_PATHS[key]
  return iconPath ? { ...entry, iconPath } : entry
}

export const MOCK_EMBLEM_HASHES = [${EMBLEM_HASHES.join(', ')}]
`

writeFileSync('src/lib/destiny/itemIconPaths.ts', iconPathsOut)
writeFileSync('src/lib/destiny/emblemIconPaths.ts', emblemOut)
writeFileSync('src/lib/destiny/itemsCatalog.ts', catalogOut)
console.log('Updated itemIconPaths.ts, emblemIconPaths.ts, itemsCatalog.ts')
