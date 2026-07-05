/**
 * Build activity catalog hashes + verified icon paths from Bungie manifest JSON.
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
]

const MANUAL_ICON_OVERRIDES = {
  'crown of sorrow': '/common/destiny2_content/icons/bd7a1fc995f87be96698263bc16698e7.png',
  'pit of heresy': '/common/destiny2_content/icons/ec0cd75ba1d20333fe93f126046fc1d2.png',
  'shattered throne': '/common/destiny2_content/icons/ec0cd75ba1d20333fe93f126046fc1d2.png',
  'grasp of avarice': '/common/destiny2_content/icons/ec0cd75ba1d20333fe93f126046fc1d2.png',
  prophecy: '/common/destiny2_content/icons/ec0cd75ba1d20333fe93f126046fc1d2.png',
}

function norm(s) {
  return s.trim().toLowerCase().replace(/\s+/g, ' ')
}

function scoreName(displayName, target) {
  const d = norm(displayName.replace(/^Dungeon:\s*/i, '').replace(/^Raid:\s*/i, ''))
  const t = norm(target)
  if (d === t) return 100
  if (d.startsWith(t + ':')) return 90
  if (d.startsWith(t)) return 80
  if (d.includes(t)) return 60
  return 0
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

const manifest = (await fetch('https://www.bungie.net/Platform/Destiny2/Manifest/').then((r) => r.json()))
  .Response

const [activityDefs, presentationDefs] = await Promise.all([
  fetchJson(manifest.jsonWorldComponentContentPaths.en.DestinyActivityDefinition),
  fetchJson(manifest.jsonWorldComponentContentPaths.en.DestinyPresentationNodeDefinition),
])

const catalog = {}
const paths = {}
const missing = []

for (const target of ACTIVITY_NAMES) {
  const key = norm(target)

  let bestActivity = null
  for (const [hash, def] of Object.entries(activityDefs)) {
    const name = def?.displayProperties?.name
    if (!name) continue
    const score = scoreName(name, target)
    if (score < 60) continue
    const candidate = { hash: Number(hash), name, score }
    if (!bestActivity || candidate.score > bestActivity.score) bestActivity = candidate
  }

  let bestIcon = MANUAL_ICON_OVERRIDES[key]
  if (bestIcon && !(await iconOk(bestIcon))) bestIcon = undefined

  if (!bestIcon) {
    let bestNode = null
    for (const [hash, def] of Object.entries(presentationDefs)) {
      const name = def?.displayProperties?.name
      const icon = def?.displayProperties?.icon
      if (!name || !icon) continue
      const score = scoreName(name, target)
      if (score < 60) continue
      const candidate = { hash: Number(hash), name, icon, score }
      if (!bestNode || candidate.score > bestNode.score) bestNode = candidate
    }
    if (bestNode && (await iconOk(bestNode.icon))) {
      bestIcon = bestNode.icon
    }
  }

  if (!bestIcon) {
    missing.push(target)
    console.log('MISSING ICON', target)
  } else if (!bestActivity) {
    missing.push(`${target} (no activity hash)`)
    console.log('MISSING HASH', target, 'icon', bestIcon)
  } else {
    catalog[key] = bestActivity.hash
    paths[key] = bestIcon
    console.log(target, '→', bestActivity.name, bestActivity.hash, bestIcon)
  }
}

if (missing.length) console.warn('Gaps:', missing)

const pathsOut = `/** Verified Bungie icon paths for featured raids/dungeons (HTTP-checked fallbacks). */
export const ACTIVITY_ICON_PATHS: Record<string, string> = ${JSON.stringify(paths, null, 2)}

export function activityIconPathFallback(name: string): string | undefined {
  return ACTIVITY_ICON_PATHS[name.trim().toLowerCase()]
}
`

const catalogOut = `/**
 * Bungie DestinyActivityDefinition hashes for raids & dungeons.
 * Regenerate: node scripts/build-activity-icon-paths.mjs
 */

import type { CatalogEntry } from '@/lib/destiny/itemsCatalog'
import { ACTIVITY_ICON_PATHS } from '@/lib/destiny/activityIconPaths'

/** Activity name → manifest hash (DestinyActivityDefinition). */
export const ACTIVITY_CATALOG: Record<string, CatalogEntry & { iconPath?: string }> = {
${Object.entries(catalog)
  .map(([key, hash]) => {
    const iconPath = paths[key]
    return `  '${key.replace(/'/g, "\\'")}': { hash: ${hash}, entity: 'DestinyActivityDefinition'${iconPath ? `, iconPath: '${iconPath}'` : ''} },`
  })
  .join('\n')}
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
`

writeFileSync('src/lib/destiny/activityIconPaths.ts', pathsOut)
writeFileSync('src/lib/destiny/activityCatalog.ts', catalogOut)
console.log('Updated activityIconPaths.ts and activityCatalog.ts')
