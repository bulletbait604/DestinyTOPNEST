/**
 * Build static item/perk icon paths from Bungie manifest JSON.
 * Run: node scripts/build-item-catalog.mjs
 */
import { readFileSync, writeFileSync } from 'fs'

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
  "Zealot's Robe",
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
  'IKELOS SMG',
  'IKELOS Shotgun',
  'IKELOS Sniper',
  'Midnight Coup',
  'Dark Age Arsenal',
  'Incisor',
  'Outlast',
  "Vesper's Host",
  'Cold Comfort',
]

const EMBLEM_HASHES = [29194593, 31953746, 54004489, 54004491, 19962737, 10493725]

const ITEM_NAME_ALIASES = {
  supremacy: 'the supremacy',
  'void grenade': 'vortex grenade',
  sword: 'falling guillotine',
  'zephyr reward': 'zephyr',
  'ikelos smg': 'ikeleos submachine gun v1.0.1',
  'ikeleos smg': 'ikeleos submachine gun v1.0.1',
  'ikeleos_submachine_gun_v1.0.1.': 'ikeleos submachine gun v1.0.1',
  'ikeleos smg v1.0.1': 'ikeleos submachine gun v1.0.1',
  'ikeleos smg': 'ikeleos submachine gun v1.0.1',
  'ikeleos shotgun': 'ikeleos shotgun v1.0.1',
  'ikeleos sniper': 'ikeleos sniper v1.0.1',
  kingslayer: 'kingslayer catalyst',
  'dark age arsenal': 'dark age arsenal',
  "vesper's host": 'vespers host',
}

const ITEM_OVERRIDES = {
  supremacy: 686951703,
  'void grenade': 1016030582,
  sword: 243425374,
  'zephyr reward': 3400256755,
  'ikeleos smg': 1051938194,
  'ikeleos shotgun': 1051938193,
  'ikeleos sniper': 1051938195,
  'ikelos_smg_v1.0.1.': 1051938194,
  'ikelos_sg_v1.0.1.': 1051938193,
  'ikelos_sr_v1.0.1.': 1051938195,
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
  if (d.startsWith(t + ' ')) return 90
  if (d.startsWith(t)) return 85
  if (d.includes(t)) return 70
  return 0
}

async function iconOk(path) {
  if (!path || path.includes('missing_icon')) return false
  const res = await fetch(`https://www.bungie.net${path}`, { method: 'HEAD' })
  return res.status === 200
}

const manifest = (await fetch('https://www.bungie.net/Platform/Destiny2/Manifest/').then((r) => r.json()))
  .Response
const paths = manifest.jsonWorldComponentContentPaths.en

async function load(table) {
  console.log('Loading', table)
  return fetch(`https://www.bungie.net${paths[table]}`).then((r) => r.json())
}

const [inventory, perks, classes, damageTypes] = await Promise.all([
  load('DestinyInventoryItemDefinition'),
  load('DestinySandboxPerkDefinition'),
  load('DestinyClassDefinition'),
  load('DestinyDamageTypeDefinition'),
])

const tables = [
  { table: 'DestinyInventoryItemDefinition', defs: inventory, entity: 'DestinyInventoryItemDefinition' },
  { table: 'DestinySandboxPerkDefinition', defs: perks, entity: 'DestinySandboxPerkDefinition' },
  { table: 'DestinyClassDefinition', defs: classes, entity: 'DestinyClassDefinition' },
  { table: 'DestinyDamageTypeDefinition', defs: damageTypes, entity: 'DestinyDamageTypeDefinition' },
]

const catalog = {}
const iconPaths = {}

for (const target of ITEM_NAMES) {
  const overrideHash = ITEM_OVERRIDES[norm(target)]
  if (overrideHash) {
    const def = inventory[String(overrideHash)]
    const icon = def?.displayProperties?.icon
    if (icon && (await iconOk(icon))) {
      const key = norm(target)
      catalog[key] = {
        hash: overrideHash,
        entity: 'DestinyInventoryItemDefinition',
        iconPath: icon,
      }
      iconPaths[key] = icon
      console.log(target, '→ override', def.displayProperties.name, overrideHash, icon)
      continue
    }
  }

  let best = null
  for (const { defs, entity } of tables) {
    for (const [hash, def] of Object.entries(defs)) {
      const name = def?.displayProperties?.name
      const icon = def?.displayProperties?.icon
      if (!name || !icon || icon.includes('missing_icon')) continue
      const score = scoreName(name, target)
      if (score < 85) continue
      const candidate = { hash: Number(hash), name, icon, score, entity }
      if (!best || candidate.score > best.score) best = candidate
    }
  }

  if (best && (await iconOk(best.icon))) {
    const key = norm(target)
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
