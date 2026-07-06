/**
 * Bungie Destiny 2 manifest loader for catalog build scripts.
 *
 * Thumbnail paths live on definition objects as relative CDN paths.
 * Prepend https://www.bungie.net to build full URLs.
 *
 * | Asset type              | Manifest table                         | Icon field(s)                          |
 * |-------------------------|----------------------------------------|----------------------------------------|
 * | Weapons & armor         | DestinyInventoryItemDefinition         | displayProperties.icon                 |
 * | Perks, aspects, mods    | DestinySandboxPerkDefinition           | displayProperties.icon                 |
 * | Raids & dungeons (card) | DestinyActivityDefinition              | pgcrImage, then displayProperties.icon |
 * | Activity graphs         | DestinyActivityGraphDefinition         | displayProperties.icon                 |
 *
 * Manifest index: https://www.bungie.net/Platform/Destiny2/Manifest/
 */

import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const BUNGIE_CDN = 'https://www.bungie.net'
const MANIFEST_INDEX = `${BUNGIE_CDN}/Platform/Destiny2/Manifest/`

export const MANIFEST_TABLES = {
  inventory: 'DestinyInventoryItemDefinition',
  perks: 'DestinySandboxPerkDefinition',
  activities: 'DestinyActivityDefinition',
  activityGraphs: 'DestinyActivityGraphDefinition',
  presentation: 'DestinyPresentationNodeDefinition',
  records: 'DestinyRecordDefinition',
  classes: 'DestinyClassDefinition',
  damageTypes: 'DestinyDamageTypeDefinition',
}

const GENERIC_ICON_MARKERS = [
  'bd7a1fc995f87be96698263bc16698e7',
  '8b1bfd1c1ce1cab51d23c78235a6e067',
  'missing_icon',
  'placeholder.jpg',
]

function loadEnvKey() {
  const envPath = resolve(__dirname, '../../.env.local')
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^(?:DESTINY_API|BUNGIE_API_KEY)\s*=\s*(.+)$/)
      if (m) return m[1].trim().replace(/^["']|["']$/g, '')
    }
  }
  return process.env.DESTINY_API || process.env.BUNGIE_API_KEY || ''
}

export function bungieCdnUrl(relativePath) {
  if (!relativePath) return undefined
  if (relativePath.startsWith('http')) return relativePath
  return `${BUNGIE_CDN}${relativePath.startsWith('/') ? '' : '/'}${relativePath}`
}

export function isGenericIcon(path) {
  if (!path) return true
  return GENERIC_ICON_MARKERS.some((marker) => path.includes(marker))
}

export async function iconOk(relativePath) {
  if (!relativePath || relativePath.includes('missing_icon')) return false
  try {
    const res = await fetch(bungieCdnUrl(relativePath), { method: 'HEAD' })
    return res.status === 200
  } catch {
    return false
  }
}

/** Best icon path from a DestinyActivityDefinition (PGCR art first). */
export function activityIconCandidates(def) {
  if (!def) return []
  return [
    def.pgcrImage,
    def.selectionScreenDisplayProperties?.icon,
    def.displayProperties?.icon,
    def.releaseIcon,
  ].filter((icon) => icon && !isGenericIcon(icon))
}

/** displayProperties.icon from inventory, perk, or graph defs. */
export function definitionIcon(def) {
  const icon = def?.displayProperties?.icon
  return icon && !isGenericIcon(icon) ? icon : undefined
}

let manifestCache = null

/** Fetch manifest index + requested English JSON component tables. */
export async function loadManifestTables(tableNames) {
  const apiKey = loadEnvKey()
  const headers = apiKey ? { 'X-API-Key': apiKey } : {}

  if (!manifestCache) {
    const res = await fetch(MANIFEST_INDEX, { headers })
    if (!res.ok) throw new Error(`Manifest index failed: ${res.status}`)
    manifestCache = (await res.json()).Response
  }

  const paths = manifestCache.jsonWorldComponentContentPaths.en
  const out = {}

  await Promise.all(
    tableNames.map(async (table) => {
      const path = paths[table]
      if (!path) {
        console.warn('Missing manifest table path:', table)
        out[table] = {}
        return
      }
      console.log('Loading', table)
      const res = await fetch(`${BUNGIE_CDN}${path}`, { headers })
      out[table] = await res.json()
    })
  )

  return {
    version: manifestCache.version,
    mobileAssetContentPath: manifestCache.mobileAssetContentPath,
    tables: out,
  }
}
