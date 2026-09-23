/**
 * Sync Armor 3.0 stats + live armor/weapon mods from Bungie manifest into MongoDB.
 *
 * Usage:
 *   node scripts/sync-armor-mod-catalog.mjs
 *
 * Reads DESTINY_API / BUNGIE_API_KEY and MONGODB_URI (falls back to SDHQCC .env.local).
 */
import dns from 'node:dns/promises'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { MongoClient } from 'mongodb'
import {
  MANIFEST_TABLES,
  bungieCdnUrl,
  definitionIcon,
  loadManifestTables,
} from './lib/manifestClient.mjs'

dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1'])

const __dirname = dirname(fileURLToPath(import.meta.url))

const ARMOR_STATS = [
  {
    key: 'Weapons',
    legacyKey: 'Mobility',
    hash: 2996146975,
    order: 0,
  },
  {
    key: 'Health',
    legacyKey: 'Resilience',
    hash: 392767087,
    order: 1,
  },
  {
    key: 'Class',
    legacyKey: 'Recovery',
    hash: 1943323491,
    order: 2,
  },
  {
    key: 'Super',
    legacyKey: 'Intellect',
    hash: 144602215,
    order: 3,
  },
  {
    key: 'Grenade',
    legacyKey: 'Discipline',
    hash: 1735777505,
    order: 4,
  },
  {
    key: 'Melee',
    legacyKey: 'Strength',
    hash: 4244567218,
    order: 5,
  },
]

/** Monument of Triumph Armor 3.0 archetypes (12). */
const ARMOR_ARCHETYPES = [
  { name: 'Bulwark', primary: 'Health', secondary: 'Class' },
  { name: 'Brawler', primary: 'Melee', secondary: 'Health' },
  { name: 'Grenadier', primary: 'Grenade', secondary: 'Super' },
  { name: 'Paragon', primary: 'Super', secondary: 'Melee' },
  { name: 'Specialist', primary: 'Class', secondary: 'Weapons' },
  { name: 'Gunner', primary: 'Weapons', secondary: 'Grenade' },
  { name: 'Siegebreaker', primary: 'Health', secondary: 'Grenade' },
  { name: 'Skirmisher', primary: 'Melee', secondary: 'Weapons' },
  { name: 'Demolitionist', primary: 'Grenade', secondary: 'Class' },
  { name: 'Colossus', primary: 'Super', secondary: 'Health' },
  { name: 'Reaver', primary: 'Class', secondary: 'Melee' },
  { name: 'Powerhouse', primary: 'Weapons', secondary: 'Super' },
]

const STAT_BENEFITS = {
  Weapons: {
    base: [
      'Faster reload and handling',
      '+15% PvE damage vs minors and majors',
    ],
    bonus: [
      'Extra ammo from bricks',
      '+15% damage vs bosses',
      '+6% PvP damage',
    ],
  },
  Health: {
    base: ['+Orb healing (up to 70 HP)', '+Flinch resist (up to 10%)'],
    bonus: [
      'Faster shield recharge (up to +25%)',
      'Faster full recharge (up to 50%)',
      '+20 shield HP (PvE)',
    ],
  },
  Class: {
    base: ['Faster class ability regen', 'More class ability energy from kills'],
    bonus: ['+40 HP overshield on class ability (PvE)', '+10 HP overshield (PvP)'],
  },
  Super: {
    base: ['More Super energy from damage and orbs'],
    bonus: ['+45% Super damage'],
  },
  Grenade: {
    base: ['Faster grenade cooldown', 'More grenade energy from kills'],
    bonus: ['+65% grenade damage (PvE)'],
  },
  Melee: {
    base: ['Faster melee cooldown', 'More melee energy from kills'],
    bonus: ['+30% melee / powered / glaive damage'],
  },
}

function loadMongoUri() {
  const candidates = [
    resolve(__dirname, '../.env.local'),
    resolve(__dirname, '../.env.production.local'),
    resolve(__dirname, '../../SDHQCC/.env.local'),
  ]
  for (const envPath of candidates) {
    if (!existsSync(envPath)) continue
    for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^MONGODB_URI\s*=\s*(.+)$/)
      if (!m) continue
      let v = m[1].trim().replace(/^["']|["']$/g, '')
      if (v && v !== '[SENSITIVE]') return v
    }
  }
  return process.env.MONGODB_URI?.trim() || ''
}

function loadDbName() {
  const candidates = [
    resolve(__dirname, '../.env.local'),
    resolve(__dirname, '../.env.production.local'),
  ]
  for (const envPath of candidates) {
    if (!existsSync(envPath)) continue
    for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^MONGODB_DB_NAME\s*=\s*(.+)$/)
      if (!m) continue
      let v = m[1].trim().replace(/^["']|["']$/g, '')
      if (v && v !== '[SENSITIVE]') return v
    }
  }
  return process.env.MONGODB_DB_NAME?.trim() || 'destinytopnest'
}

function isPlaceholderName(name) {
  return /^(empty(?:\s+mod)?\s+socket|empty\s+socket|default(?:\s+ornament|\s+shader)?|hidden|locked|classified)$/i.test(
    String(name || '').trim()
  )
}

function isUsableMod(def) {
  if (!def || def.redacted) return false
  const name = def.displayProperties?.name?.trim()
  if (!name || name === 'Classified' || isPlaceholderName(name)) return false
  if (def.displayProperties?.description === 'Classified') return false
  // DestinyItemType.Mod = 19
  if (def.itemType !== 19) return false
  return true
}

/** Weapon traits and armor perks (not socket mods). Icon falls back to the linked sandbox perk. */
function classifyGearPerk(def) {
  if (!def || def.redacted || def.itemType === 19) return null
  const name = def.displayProperties?.name?.trim()
  if (!name || name === 'Classified' || isPlaceholderName(name)) return null
  if (def.displayProperties?.description === 'Classified') return null
  const type = String(def.itemTypeDisplayName || '')
  if (/^(enhanced\s+)?(origin\s+)?trait$/i.test(type)) return 'weapon-perk'
  if (/armor perk|set bonus/i.test(type)) return 'armor-perk'
  return null
}

function sandboxPerkHashOf(def) {
  const hash = (def.perks || []).find((perk) => perk?.perkHash > 0)?.perkHash
  return hash || null
}

function bestIconPath(def, perkDefs) {
  const itemIcon = definitionIcon(def)
  if (itemIcon) return itemIcon
  const perkHash = sandboxPerkHashOf(def)
  if (!perkHash) return null
  return definitionIcon(perkDefs[String(perkHash)]) || null
}

/**
 * Classify inventory mods we care about for loadouts.
 * Excludes ornaments, shaders, emotes, intrinsic frames, scopes, etc.
 */
function classifyLoadoutMod(def) {
  const plug = String(def.plug?.plugCategoryIdentifier || '').toLowerCase()
  const type = String(def.itemTypeDisplayName || '').toLowerCase()

  // Weapon combat mods (Boss Spec, Backup Mag, Adept mods, …)
  if (
    plug === 'v400.weapon.mod_guns' ||
    plug.startsWith('v400.weapon.mod_') ||
    type === 'weapon mod'
  ) {
    return 'weapon'
  }

  // Armor general / artifice / activity / raid / dungeon / tuning
  if (
    plug.startsWith('enhancements.v2_') ||
    plug.startsWith('enhancements.raid_') ||
    plug.startsWith('enhancements.activity_') ||
    plug.startsWith('enhancements.season_') ||
    plug.includes('plugs.armor.masterworks') ||
    plug.includes('armor.tuning') ||
    type === 'armor mod' ||
    type === 'combat style mod' ||
    type === 'legacy armor mod' ||
    type.includes('raid mod') ||
    type.includes('dungeon mod') ||
    type.includes('activity mod') ||
    type.includes('tuning mod') ||
    type.includes('artifice')
  ) {
    return 'armor'
  }

  // Ghost Armorer (archetype targeting) — useful for optimizer context
  if (plug.includes('ghosts.mods') && /armorer|economy|experience/i.test(def.displayProperties?.name || '')) {
    return 'ghost'
  }

  return null
}

function armorSlotFromPlug(plug) {
  if (plug.includes('v2_head') || plug.includes('_head')) return 'helmet'
  if (plug.includes('v2_arms') || plug.includes('_arms')) return 'gauntlets'
  if (plug.includes('v2_chest') || plug.includes('_chest')) return 'chest'
  if (plug.includes('v2_legs') || plug.includes('_legs')) return 'legs'
  if (plug.includes('v2_class') || plug.includes('class_item')) return 'class'
  if (plug.includes('general') || plug.includes('combatstyle') || plug.includes('activity')) {
    return 'any'
  }
  return 'any'
}

function modFamily(plug, type) {
  if (type.includes('tuning') || plug.includes('tuning')) return 'tuning'
  if (type.includes('artifice') || plug.includes('artifice')) return 'artifice'
  if (plug.includes('raid') || type.includes('raid')) return 'raid'
  if (plug.includes('dungeon') || type.includes('dungeon')) return 'dungeon'
  if (plug.includes('activity') || type.includes('activity')) return 'activity'
  if (plug.includes('masterworks')) return 'masterwork'
  if (plug.startsWith('enhancements.v2_') || type === 'armor mod') return 'general'
  if (plug.includes('weapon.mod')) return 'weapon'
  return 'other'
}

function mapMod(hash, def, kind, perkDefs = {}) {
  const plug = def.plug?.plugCategoryIdentifier || ''
  const type = def.itemTypeDisplayName || ''
  const iconPath = bestIconPath(def, perkDefs) || definitionIcon(def) || null
  return {
    _id: String(hash),
    hash,
    kind,
    name: def.displayProperties.name,
    description: def.displayProperties.description || '',
    itemTypeDisplayName: type,
    plugCategoryIdentifier: plug,
    family: kind === 'weapon-perk' || kind === 'armor-perk' ? kind : modFamily(plug, type.toLowerCase()),
    armorSlot: kind === 'armor' ? armorSlotFromPlug(plug.toLowerCase()) : null,
    energyCost: def.plug?.energyCost?.energyCost ?? null,
    energyTypeHash: def.plug?.energyCost?.energyTypeHash ?? null,
    investmentStats: (def.investmentStats || [])
      .filter((s) => s?.statTypeHash && s.value)
      .map((s) => ({ statHash: s.statTypeHash, value: s.value })),
    sandboxPerkHash: sandboxPerkHashOf(def),
    iconPath,
    iconUrl: bungieCdnUrl(iconPath),
    isDeprecated: Boolean(def.equippingBlock?.uniqueLabel?.includes('legacy')),
    updatedAt: new Date().toISOString(),
  }
}

const mongoUri = loadMongoUri()
if (!mongoUri) {
  console.error('Missing MONGODB_URI')
  process.exit(1)
}

const dbName = loadDbName()
console.log('Loading manifest…')
const { version, tables } = await loadManifestTables([
  MANIFEST_TABLES.inventory,
  MANIFEST_TABLES.perks,
  'DestinyStatDefinition',
])

const items = tables[MANIFEST_TABLES.inventory] || {}
const perkDefs = tables[MANIFEST_TABLES.perks] || {}
const statDefs = tables.DestinyStatDefinition || {}

const armorMods = []
const weaponMods = []
const ghostMods = []
const weaponPerks = []
const armorPerks = []

for (const [hashStr, def] of Object.entries(items)) {
  const hash = Number(hashStr)
  if (isUsableMod(def)) {
    const kind = classifyLoadoutMod(def)
    if (kind) {
      const row = mapMod(hash, def, kind, perkDefs)
      if (row.iconUrl) {
        if (kind === 'armor') armorMods.push(row)
        else if (kind === 'weapon') weaponMods.push(row)
        else ghostMods.push(row)
      }
    }
  }

  const perkKind = classifyGearPerk(def)
  if (!perkKind) continue
  const perkRow = mapMod(hash, def, perkKind, perkDefs)
  if (!perkRow.iconUrl) continue
  if (perkKind === 'weapon-perk') weaponPerks.push(perkRow)
  else armorPerks.push(perkRow)
}

armorMods.sort((a, b) => a.name.localeCompare(b.name))
weaponMods.sort((a, b) => a.name.localeCompare(b.name))

const now = new Date().toISOString()
const statDocs = ARMOR_STATS.map((stat) => {
  const def = statDefs[String(stat.hash)]
  const iconPath = def?.displayProperties?.icon || null
  return {
    _id: stat.key,
    key: stat.key,
    legacyKey: stat.legacyKey,
    hash: stat.hash,
    order: stat.order,
    name: def?.displayProperties?.name || stat.key,
    description: def?.displayProperties?.description || '',
    iconPath,
    iconUrl: bungieCdnUrl(iconPath),
    benefits: STAT_BENEFITS[stat.key],
    updatedAt: now,
  }
})

const archetypeDocs = ARMOR_ARCHETYPES.map((a) => ({
  _id: a.name.toLowerCase(),
  name: a.name,
  primary: a.primary,
  secondary: a.secondary,
  updatedAt: now,
}))

const metaDoc = {
  _id: 'armor_mod_catalog',
  manifestVersion: version,
  syncedAt: now,
  counts: {
    armorMods: armorMods.length,
    weaponMods: weaponMods.length,
    ghostMods: ghostMods.length,
    weaponPerks: weaponPerks.length,
    armorPerks: armorPerks.length,
    stats: statDocs.length,
    archetypes: archetypeDocs.length,
  },
  notes:
    'Armor 3.0 stats (Edge of Fate / Monument of Triumph). Armor 2.0 raid mods remain for focusable legacy raid armor.',
}

mkdirSync(resolve(__dirname, '../tmp'), { recursive: true })
writeFileSync(
  resolve(__dirname, '../tmp/armor-mod-catalog-snapshot.json'),
  JSON.stringify(
    {
      meta: metaDoc,
      stats: statDocs,
      archetypes: archetypeDocs,
      sampleArmorMods: armorMods.slice(0, 20),
      sampleWeaponMods: weaponMods.slice(0, 20),
      counts: metaDoc.counts,
    },
    null,
    2
  )
)

console.log('Connecting to Mongo…', dbName)
const client = new MongoClient(mongoUri, {
  maxPoolSize: 5,
  serverSelectionTimeoutMS: 15000,
})
await client.connect()
const db = client.db(dbName)

const COL = {
  meta: 'destiny_gear_catalog_meta',
  stats: 'destiny_armor_stats',
  archetypes: 'destiny_armor_archetypes',
  mods: 'destiny_gear_mods',
}

await db.collection(COL.meta).updateOne({ _id: metaDoc._id }, { $set: metaDoc }, { upsert: true })

for (const doc of statDocs) {
  await db.collection(COL.stats).updateOne({ _id: doc._id }, { $set: doc }, { upsert: true })
}

for (const doc of archetypeDocs) {
  await db.collection(COL.archetypes).updateOne({ _id: doc._id }, { $set: doc }, { upsert: true })
}

// Replace mod catalog for this sync so removed plugs disappear
await db.collection(COL.mods).deleteMany({
  kind: { $in: ['armor', 'weapon', 'ghost', 'weapon-perk', 'armor-perk'] },
})
if (armorMods.length) await db.collection(COL.mods).insertMany(armorMods)
if (weaponMods.length) await db.collection(COL.mods).insertMany(weaponMods)
if (ghostMods.length) await db.collection(COL.mods).insertMany(ghostMods)
if (weaponPerks.length) await db.collection(COL.mods).insertMany(weaponPerks)
if (armorPerks.length) await db.collection(COL.mods).insertMany(armorPerks)

await db.collection(COL.mods).createIndex({ kind: 1, name: 1 })
await db.collection(COL.mods).createIndex({ kind: 1, family: 1 })
await db.collection(COL.mods).createIndex({ hash: 1 }, { unique: true })
await db.collection(COL.mods).createIndex({ name: 'text', description: 'text' })

await client.close()

console.log('Synced:', metaDoc.counts)
console.log('Manifest:', version)
console.log('Snapshot: tmp/armor-mod-catalog-snapshot.json')
