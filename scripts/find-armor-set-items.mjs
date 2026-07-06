import { MANIFEST_TABLES, loadManifestTables } from './lib/manifestClient.mjs'

const QUERIES = [
  "oryx's memory",
  "atheon's memory",
  'kentarch 3',
  'great hunt',
  "crota's memory",
  "nezarec's nightmare",
  'promised',
  'yearning echo',
  'tm custom',
  'taken king',
  'coda',
]

const { tables } = await loadManifestTables([MANIFEST_TABLES.inventory])
const inventory = tables[MANIFEST_TABLES.inventory]

for (const q of QUERIES) {
  console.log('\n===', q, '===')
  const matches = []
  for (const [hash, def] of Object.entries(inventory)) {
    const name = def?.displayProperties?.name?.toLowerCase() ?? ''
    if (!name.includes(q)) continue
    const icon = def?.displayProperties?.icon
    if (!icon || icon.includes('missing_icon')) continue
    matches.push({ hash: Number(hash), name: def.displayProperties.name, icon })
  }
  matches.sort((a, b) => a.name.localeCompare(b.name))
  for (const m of matches.slice(0, 12)) {
    console.log(m.hash, m.name, m.icon)
  }
  if (matches.length > 12) console.log(`... +${matches.length - 12} more`)
}
