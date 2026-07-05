/**
 * Build activity catalog hashes + verified icon paths from Bungie manifest JSON.
 * Sources (in order): activity defs, presentation nodes, triumph records, emblem inventory items.
 * Run: node scripts/build-activity-icon-paths.mjs
 */
import { writeFileSync } from 'fs'

const ACTIVITY_NAMES = [
  'Garden of Salvation',
  "King's Fall",
  'Root of Nightmares',
  'Deep Stone Crypt',
  'Vault of Glass',
  'Vow of the Disciple',
  'Last Wish',
  "Crota's End",
  "Salvation's Edge",
  'Crown of Sorrow',
  'Spire of the Watcher',
  'Pit of Heresy',
  'Ghosts of the Deep',
  'Duality',
  'Shattered Throne',
  "Warlord's Ruin",
  'Grasp of Avarice',
  'Prophecy',
  "Vesper's Host",
  'Sundered Doctrine',
]

/** Curated from triumph records / emblems (light.gg, blueberries-style) when vaulted activities lack art. */
const CURATED_ICON_OVERRIDES = {
  'pit of heresy': '/common/destiny2_content/icons/87271a86b4542822aad73d8f0f56d4cb.png',
  'shattered throne': '/common/destiny2_content/icons/a2ca0f5066ae751326e9db0c7bc6ff20.jpg',
  'grasp of avarice': '/common/destiny2_content/icons/b5c87175a97d1333da0ff4300fb87f57.png',
  prophecy: '/common/destiny2_content/icons/1406f929d0c25506a5ab5ea73956fcb3.png',
  'crown of sorrow': '/common/destiny2_content/icons/9806a52b539b813c12c4d8658803c22c.png',
  'vow of the disciple': '/common/destiny2_content/icons/ac23fe09bb1460ad2919559bed75c809.png',
}

const ACTIVITY_ALIASES = {
  'the shattered throne': 'shattered throne',
}

function norm(s) {
  return s.trim().toLowerCase().replace(/\s+/g, ' ')
}

function normalizeTarget(target) {
  const key = norm(target)
  return ACTIVITY_ALIASES[key] ?? key
}

function scoreName(displayName, target) {
  const d = norm(displayName.replace(/^Dungeon:\s*/i, '').replace(/^Raid:\s*/i, '').replace(/^The\s+/i, ''))
  const t = normalizeTarget(target)
  if (d === t) return 100
  if (d.startsWith(t + ':')) return 92
  if (d.startsWith(t + ' ')) return 88
  if (d.startsWith(t)) return 80
  if (d.includes(t)) return 60
  const words = t.split(' ')
  if (words.length > 1 && words.every((w) => d.includes(w))) return 55
  return 0
}

const GENERIC_ICON_MARKERS = [
  'bd7a1fc995f87be96698263bc16698e7',
  '8b1bfd1c1ce1cab51d23c78235a6e067',
  'missing_icon',
  'placeholder.jpg',
]

function isGenericIcon(path) {
  if (!path) return true
  return GENERIC_ICON_MARKERS.some((m) => path.includes(m))
}

async function pickBestIcon(candidates) {
  const valid = []
  for (const c of candidates) {
    if (!c.icon || isGenericIcon(c.icon)) continue
    if (await iconOk(c.icon)) valid.push(c)
  }
  valid.sort((a, b) => b.score - a.score)
  return valid[0]?.icon
}

async function pickBestIconAllowGeneric(candidates) {
  const icon = await pickBestIcon(candidates)
  if (icon) return icon
  for (const c of candidates.sort((a, b) => b.score - a.score)) {
    if (c.icon && (await iconOk(c.icon))) return c.icon
  }
  return undefined
}

function pickActivityIconFields(def) {
  return [
    { icon: def?.pgcrImage, score: 96 },
    { icon: def?.selectionScreenDisplayProperties?.icon, score: 90 },
    { icon: def?.displayProperties?.icon, score: 85 },
    { icon: def?.releaseIcon, score: 80 },
  ].filter((f) => f.icon)
}

async function fetchJson(path) {
  const res = await fetch(`https://www.bungie.net${path}`)
  return res.json()
}

async function iconOk(path) {
  if (!path || path.includes('missing_icon')) return false
  const res = await fetch(`https://www.bungie.net${path}`, { method: 'HEAD' })
  return res.status === 200
}

async function bestIconFromRecords(records, target) {
  let best = null
  for (const [hash, def] of Object.entries(records)) {
    const name = def?.displayProperties?.name
    const icon = def?.displayProperties?.icon
    if (!name || !icon || icon.includes('missing_icon')) continue
    const score = scoreName(name, target)
    if (score < 55) continue
    const candidate = { name, icon, score }
    if (!best || candidate.score > best.score) best = candidate
  }
  if (best && (await iconOk(best.icon))) return best.icon
  return undefined
}

async function bestIconFromInventory(items, target) {
  let best = null
  for (const [hash, def] of Object.entries(items)) {
    const name = def?.displayProperties?.name
    const icon = def?.displayProperties?.icon
    const type = def?.itemTypeDisplayName ?? ''
    if (!name || !icon || icon.includes('missing_icon')) continue
    if (!/emblem|seal/i.test(type) && !norm(name).includes(normalizeTarget(target))) continue
    const score = scoreName(name, target)
    if (score < 80) continue
    const candidate = { name, icon, score }
    if (!best || candidate.score > best.score) best = candidate
  }
  if (best && (await iconOk(best.icon))) return best.icon
  return undefined
}

const manifest = (await fetch('https://www.bungie.net/Platform/Destiny2/Manifest/').then((r) => r.json()))
  .Response

const paths = manifest.jsonWorldComponentContentPaths.en
const [activityDefs, presentationDefs, recordDefs, inventoryDefs] = await Promise.all([
  fetchJson(paths.DestinyActivityDefinition),
  fetchJson(paths.DestinyPresentationNodeDefinition),
  fetchJson(paths.DestinyRecordDefinition),
  fetchJson(paths.DestinyInventoryItemDefinition),
])

const catalog = {}
const iconPaths = {}
const missing = []

for (const target of ACTIVITY_NAMES) {
  const key = normalizeTarget(target)

  let bestActivity = null
  for (const [hash, def] of Object.entries(activityDefs)) {
    const name = def?.displayProperties?.name
    if (!name) continue
    const score = scoreName(name, target)
    if (score < 55) continue
    const candidate = { hash: Number(hash), name, score }
    if (!bestActivity || candidate.score > bestActivity.score) bestActivity = candidate
  }

  const iconCandidates = []

  if (CURATED_ICON_OVERRIDES[key]) {
    iconCandidates.push({ icon: CURATED_ICON_OVERRIDES[key], score: 110 })
  }

  for (const [hash, def] of Object.entries(presentationDefs)) {
    const name = def?.displayProperties?.name
    const icon = def?.displayProperties?.icon
    if (!name || !icon) continue
    const score = scoreName(name, target)
    if (score >= 55) iconCandidates.push({ icon, score: score + 5 })
  }

  for (const [hash, def] of Object.entries(recordDefs)) {
    const name = def?.displayProperties?.name
    const icon = def?.displayProperties?.icon
    if (!name || !icon) continue
    const score = scoreName(name, target)
    if (score >= 55) iconCandidates.push({ icon, score })
  }

  for (const [hash, def] of Object.entries(inventoryDefs)) {
    const name = def?.displayProperties?.name
    const icon = def?.displayProperties?.icon
    const type = def?.itemTypeDisplayName ?? ''
    if (!name || !icon) continue
    if (!/emblem|seal/i.test(type) && !norm(name).includes(key)) continue
    const score = scoreName(name, target)
    if (score >= 80) iconCandidates.push({ icon, score: score - 5 })
  }

  for (const [hash, def] of Object.entries(activityDefs)) {
    const name = def?.displayProperties?.name
    if (!name) continue
    const score = scoreName(name, target)
    if (score < 55) continue
    for (const field of pickActivityIconFields(def)) {
      iconCandidates.push({ icon: field.icon, score: field.score + score / 10 })
    }
  }

  const bestIcon = await pickBestIconAllowGeneric(iconCandidates)

  if (!bestIcon) {
    missing.push(target)
    console.log('MISSING ICON', target)
  } else if (!bestActivity) {
    missing.push(`${target} (no activity hash)`)
    console.log('MISSING HASH', target, 'icon', bestIcon)
  } else {
    catalog[key] = bestActivity.hash
    iconPaths[key] = bestIcon
    console.log(target, '→', bestActivity.name, bestActivity.hash, bestIcon)
  }
}

if (missing.length) console.warn('Gaps:', missing)

const pathsOut = `/** Verified Bungie icon paths for featured raids/dungeons (HTTP-checked fallbacks). */
export const ACTIVITY_ICON_PATHS: Record<string, string> = ${JSON.stringify(iconPaths, null, 2)}

export const ACTIVITY_NAME_ALIASES: Record<string, string> = ${JSON.stringify(ACTIVITY_ALIASES, null, 2)}

/** Normalize PGCR activity names (e.g. "Spire of the Watcher: Master") to catalog keys. */
export function normalizeActivityKey(name: string): string {
  let key = name.trim().toLowerCase()
  key = ACTIVITY_NAME_ALIASES[key] ?? key
  key = key.replace(/^the\\s+/, '')
  key = key.replace(/^(raid|dungeon):\\s*/i, '')
  if (key.includes(':')) key = key.split(':')[0]?.trim() ?? key
  if (ACTIVITY_ICON_PATHS[key]) return key
  for (const catalogKey of Object.keys(ACTIVITY_ICON_PATHS)) {
    if (key.startsWith(catalogKey) || catalogKey.startsWith(key)) return catalogKey
  }
  return key
}

export function activityIconPathFallback(name: string): string | undefined {
  return ACTIVITY_ICON_PATHS[normalizeActivityKey(name)]
}

export function activityIconUrlForName(name: string): string | undefined {
  const path = activityIconPathFallback(name)
  return path ? \`https://www.bungie.net\${path}\` : undefined
}
`

const catalogOut = `/**
 * Bungie DestinyActivityDefinition hashes for raids & dungeons.
 * Regenerate: node scripts/build-activity-icon-paths.mjs
 */

import type { CatalogEntry } from '@/lib/destiny/itemsCatalog'
import { ACTIVITY_ICON_PATHS, normalizeActivityKey } from '@/lib/destiny/activityIconPaths'

/** Activity name → manifest hash (DestinyActivityDefinition). */
export const ACTIVITY_CATALOG: Record<string, CatalogEntry & { iconPath?: string }> = {
${Object.entries(catalog)
  .map(([key, hash]) => {
    const iconPath = iconPaths[key]
    return `  '${key.replace(/'/g, "\\'")}': { hash: ${hash}, entity: 'DestinyActivityDefinition'${iconPath ? `, iconPath: '${iconPath}'` : ''} },`
  })
  .join('\n')}
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
`

writeFileSync('src/lib/destiny/activityIconPaths.ts', pathsOut)
writeFileSync('src/lib/destiny/activityCatalog.ts', catalogOut)
console.log('Updated activityIconPaths.ts and activityCatalog.ts')
