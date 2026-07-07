/**
 * Append meta-build catalog entries verified against live manifest JSON.
 * Run: node scripts/merge-meta-catalog.mjs
 */
import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { loadManifestTables, MANIFEST_TABLES } from './lib/manifestClient.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const catalogPath = resolve(__dirname, '../src/lib/destiny/itemsCatalog.ts')
const pathsPath = resolve(__dirname, '../src/lib/destiny/itemIconPaths.ts')

/** name key → { hash, entity, searchTerms } */
const META_ENTRIES = [
  { key: 'bleakwatch', search: 'Bleak Watcher', entity: MANIFEST_TABLES.perks },
  { key: "winter's resilience", search: "Winter's Shroud", entity: MANIFEST_TABLES.inventory },
  { key: 'gyrfalcon', search: "Gyrfalcon's Hauberk", entity: MANIFEST_TABLES.inventory },
  { key: 'melas penoplia', search: 'Melas Panoplia', entity: MANIFEST_TABLES.inventory },
  { key: 'dynamism', search: 'Innervation', entity: MANIFEST_TABLES.inventory },
  { key: 'lightning storm', search: 'Touch of Thunder', entity: MANIFEST_TABLES.inventory },
  { key: 'shock absorber', search: 'Electrostatic Mind', entity: MANIFEST_TABLES.inventory },
  { key: 'lament', search: 'The Lament', entity: MANIFEST_TABLES.inventory },
  { key: 'contraverse hold', search: 'Contraverse Hold', entity: MANIFEST_TABLES.inventory },
  { key: 'tractor cannon', search: 'Tractor Cannon', entity: MANIFEST_TABLES.inventory },
  { key: 'touch of flame', search: 'Touch of Flame', entity: MANIFEST_TABLES.inventory },
  { key: 'hellion', search: 'Hellion', entity: MANIFEST_TABLES.inventory },
  { key: 'ember of ashes', search: 'Ember of Ashes', entity: MANIFEST_TABLES.inventory },
  { key: 'ember of benevolence', search: 'Ember of Benevolence', entity: MANIFEST_TABLES.inventory },
  { key: 'ember of char', search: 'Ember of Char', entity: MANIFEST_TABLES.inventory },
  { key: 'lethal current', search: 'Lethal Current', entity: MANIFEST_TABLES.inventory },
  { key: 'gathering storm', search: 'Gathering Storm', entity: MANIFEST_TABLES.inventory },
  { key: 'spark of amplitude', search: 'Spark of Amplitude', entity: MANIFEST_TABLES.inventory },
  { key: 'spark of volts', search: 'Spark of Volts', entity: MANIFEST_TABLES.inventory },
  { key: 'touch of devour', search: 'Feed the Void', entity: MANIFEST_TABLES.inventory },
  { key: 'feed the void', search: 'Feed the Void', entity: MANIFEST_TABLES.inventory },
  { key: 'echo of remnants', search: 'Echo of Remnants', entity: MANIFEST_TABLES.inventory },
  { key: 'grenade font', search: 'Grenade Font', entity: MANIFEST_TABLES.inventory },
  { key: 'bomber', search: 'Bomber', entity: MANIFEST_TABLES.inventory },
  { key: 'surge', search: 'Harmonic Siphon', entity: MANIFEST_TABLES.inventory },
  { key: 'waveframe trace rifle', search: 'Null Composure', entity: MANIFEST_TABLES.inventory },
  { key: "gyrfalcon's hauberk", search: "Gyrfalcon's Hauberk", entity: MANIFEST_TABLES.inventory },
  { key: 'melas panoplia', search: 'Melas Panoplia', entity: MANIFEST_TABLES.inventory },
  { key: "winter's shroud", search: "Winter's Shroud", entity: MANIFEST_TABLES.inventory },
  { key: 'the lament', search: 'The Lament', entity: MANIFEST_TABLES.inventory },
  { key: 'peacekeepers', search: 'Peacekeepers', entity: MANIFEST_TABLES.inventory },
  { key: 'lucky pants', search: 'Lucky Pants', entity: MANIFEST_TABLES.inventory },
  { key: 'parasite', search: 'Parasite', entity: MANIFEST_TABLES.inventory },
  { key: "stormdancer's brace", search: "Stormdancer's Brace", entity: MANIFEST_TABLES.inventory },
  { key: 'omnioculus', search: 'Omnioculus', entity: MANIFEST_TABLES.inventory },
  { key: 'mantle of battle harmony', search: 'Mantle of Battle Harmony', entity: MANIFEST_TABLES.inventory },
  { key: 'hallowfire heart', search: 'Hallowfire Heart', entity: MANIFEST_TABLES.inventory },
  { key: 'phoenix protocol', search: 'Phoenix Protocol', entity: MANIFEST_TABLES.inventory },
]

function norm(s) {
  return s.trim().toLowerCase()
}

function findDef(tables, search, preferredEntity) {
  const target = norm(search)
  const entityOrder = preferredEntity
    ? [preferredEntity, MANIFEST_TABLES.inventory, MANIFEST_TABLES.perks]
    : [MANIFEST_TABLES.inventory, MANIFEST_TABLES.perks]

  for (const entity of entityOrder) {
    for (const [hash, def] of Object.entries(tables[entity] || {})) {
      const name = def?.displayProperties?.name
      const icon = def?.displayProperties?.icon
      if (!name || !icon || icon.includes('missing_icon')) continue
      if (norm(name) === target) {
        return { hash: Number(hash), entity, iconPath: icon, name }
      }
    }
  }
  return null
}

const { tables } = await loadManifestTables([
  MANIFEST_TABLES.inventory,
  MANIFEST_TABLES.perks,
])

const catalog = {}
const iconPaths = {}

for (const entry of META_ENTRIES) {
  const found = findDef(tables, entry.search, entry.entity)
  if (!found) {
    console.log('MISSING', entry.key, '→', entry.search)
    continue
  }
  catalog[entry.key] = { hash: found.hash, entity: found.entity, iconPath: found.iconPath }
  iconPaths[entry.key] = found.iconPath
  console.log('OK', entry.key, '→', found.name, found.hash)
}

// Merge into existing itemsCatalog.ts ITEM_CATALOG object
const catalogSrc = readFileSync(catalogPath, 'utf8')
const pathsSrc = readFileSync(pathsPath, 'utf8')

const catalogMatch = catalogSrc.match(/const ITEM_CATALOG[^=]*=\s*\{([\s\S]*?)\n\}/)
if (!catalogMatch) throw new Error('Could not parse ITEM_CATALOG')

let existingCatalog = {}
// Parse existing keys from file - crude but works for our format
const keyRe = /^\s*'([^']+)':\s*\{\s*hash:\s*(\d+),\s*entity:\s*'([^']+)',\s*iconPath:\s*'([^']+)'\s*\}/gm
let m
while ((m = keyRe.exec(catalogSrc))) {
  existingCatalog[m[1]] = { hash: Number(m[2]), entity: m[3], iconPath: m[4] }
}

const merged = { ...existingCatalog, ...catalog }
const sortedKeys = Object.keys(merged).sort()

const catalogBody = sortedKeys
  .map((key) => {
    const e = merged[key]
    const escaped = key.replace(/'/g, "\\'")
    return `  '${escaped}': { hash: ${e.hash}, entity: '${e.entity}', iconPath: '${e.iconPath}' },`
  })
  .join('\n')

const newCatalogSrc = catalogSrc.replace(
  /const ITEM_CATALOG[^=]*=\s*\{[\s\S]*?\n\}/,
  `const ITEM_CATALOG: Record<string, CatalogEntry> = {\n${catalogBody}\n}`
)

writeFileSync(catalogPath, newCatalogSrc)

// Merge icon paths
const pathsMatch = pathsSrc.match(/export const ITEM_ICON_PATHS[^=]*=\s*\{([\s\S]*?)\n\}/)
let existingPaths = {}
const pathRe = /^\s*"([^"]+)":\s*"([^"]+)"/gm
while ((m = pathRe.exec(pathsSrc))) {
  existingPaths[m[1]] = m[2]
}
const mergedPaths = { ...existingPaths, ...iconPaths }
const pathsBody = Object.keys(mergedPaths)
  .sort()
  .map((key) => `  "${key}": "${mergedPaths[key]}",`)
  .join('\n')

const newPathsSrc = pathsSrc.replace(
  /export const ITEM_ICON_PATHS[^=]*=\s*\{[\s\S]*?\n\}/,
  `export const ITEM_ICON_PATHS: Record<string, string> = {\n${pathsBody}\n}`
)
writeFileSync(pathsPath, newPathsSrc)

console.log('Merged', Object.keys(catalog).length, 'meta entries into catalog')
