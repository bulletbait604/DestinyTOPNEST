import { MANIFEST_TABLES, loadManifestTables } from './lib/manifestClient.mjs'

const { tables } = await loadManifestTables([MANIFEST_TABLES.inventory])
const inv = tables[MANIFEST_TABLES.inventory]

const CHEST_HINTS = ['plate', 'cuirass', 'chiton', 'vest', 'robes', 'shell', 'chest']

function chestPieces(q) {
  const out = []
  for (const [hash, def] of Object.entries(inv)) {
    const name = def?.displayProperties?.name ?? ''
    if (!name.toLowerCase().includes(q)) continue
    const icon = def?.displayProperties?.icon
    if (!icon || icon.includes('missing_icon')) continue
    const lower = name.toLowerCase()
    if (lower.includes('adept') || lower.includes('memento') || lower.includes('tracker')) continue
    const slot = String(def.itemTypeDisplayName ?? '').toLowerCase()
    const isChest =
      CHEST_HINTS.some((h) => lower.includes(h)) ||
      slot.includes('chest') ||
      slot.includes('cuirass') ||
      slot.includes('robe')
    if (!isChest) continue
    out.push({ name, hash: Number(hash), icon })
  }
  const seen = new Set()
  return out.filter((row) => {
    const key = row.name + row.icon
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const queries = [
  'fused aurum',
  'eternal',
  'oracle',
  'glass plate',
  'kentarch',
  'garden',
  'sanctified',
  'evangelist',
  'crota team',
  'bane of crota',
  'word of crota',
  'nezarec',
  'nightmare',
  'yearning',
  'avarice',
  'greed',
  'coda',
  'judgment',
  'channeling',
  'taken king plate',
  'war numen',
  'plate of the great hunt',
  'promised reign',
  'tm-cogburn',
]

for (const q of queries) {
  const rows = chestPieces(q)
  if (!rows.length) continue
  console.log(`\n=== ${q} ===`)
  for (const row of rows.slice(0, 8)) console.log(row.name, row.hash, row.icon)
}
