/**
 * Verify every ACTIVITY_LOOT drop resolves in the static catalog.
 * Run: node scripts/audit-activity-loot-icons.mjs
 */
import { readFileSync } from 'fs'
import { ITEM_HASH_OVERRIDES } from './loot-icon-overrides.mjs'

const LOOT_ALIASES = {
  'the tyranny of heaven': 'tyranny of heaven',
  "the militia's birthright": "militia's birthright",
  'the long goodbye': 'long goodbye',
  'the comedian': 'comedian',
  'the navigator': 'the navigator',
  kingslayer: 'touch of malice catalyst',
  "omnigul's grieve": 'word of crota',
  'abyssal defiant': 'abyss defiant',
  "nimrod's hunter": "acacia's dejection",
  "rufus's fire": 'thoughtless',
  "calus's selected": 'optative',
  ballista: 'heretic',
  'the clever rat': 'perfect pitch',
  incursion: 'duality',
  "zealot's robe": 'prime zealot cuirass',
  "zaouli's wrath": "zaouli's bane",
  'ikelos_smg_v1.0.1': 'ikelos_smg_v1.0.1',
  'ikelos_sg_v1.0.1': 'ikelos_sg_v1.0.1',
  'ikelos_sr_v1.0.1': 'ikelos_sr_v1.0.1',
}

function norm(s) {
  return s.trim().toLowerCase()
}

function lookupName(name) {
  return LOOT_ALIASES[norm(name)] ?? norm(name)
}

const catalogSrc = readFileSync('src/lib/destiny/itemsCatalog.ts', 'utf8')
const iconSrc = readFileSync('src/lib/destiny/itemIconPaths.ts', 'utf8')
const lootSrc = readFileSync('src/lib/destiny/activityLoot.ts', 'utf8')

const catalogKeys = new Set([...catalogSrc.matchAll(/'([^']+)': \{ hash:/g)].map((m) => m[1]))
const iconKeys = new Set([...iconSrc.matchAll(/"([^"]+)": "\/common/g)].map((m) => m[1]))
const dropNames = [...lootSrc.matchAll(/\{ name: '([^']+)', kind: '/g)].map((m) => m[1])

const missing = []
for (const drop of dropNames) {
  const key = lookupName(drop)
  const hasOverride = ITEM_HASH_OVERRIDES[key] || ITEM_HASH_OVERRIDES[norm(drop)]
  const hasCatalog = catalogKeys.has(key) || catalogKeys.has(norm(drop))
  const hasIcon = iconKeys.has(key) || iconKeys.has(norm(drop))
  if (!hasOverride && !hasCatalog && !hasIcon) {
    missing.push({ drop, key })
  }
}

if (missing.length) {
  console.error('Missing catalog entries for activity loot drops:')
  for (const row of missing) console.error(`  ${row.drop} → ${row.key}`)
  process.exit(1)
}

console.log(`OK — ${dropNames.length} loot drops covered by catalog/overrides.`)
