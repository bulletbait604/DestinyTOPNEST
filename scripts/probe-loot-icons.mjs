import { loadManifestTables, MANIFEST_TABLES } from './lib/manifestClient.mjs'

const { tables } = await loadManifestTables([MANIFEST_TABLES.inventory])
const inv = tables[MANIFEST_TABLES.inventory]

function search(term, filterFn) {
  const out = []
  for (const [hash, def] of Object.entries(inv)) {
    const name = def?.displayProperties?.name ?? ''
    const type = def?.itemTypeDisplayName ?? ''
    if (!name.toLowerCase().includes(term.toLowerCase())) continue
    if (filterFn && !filterFn(type, name, def)) continue
    out.push({ name, type, hash: Number(hash) })
  }
  return out.sort((a, b) => a.name.localeCompare(b.name))
}

const weaponTerms = ['kingslayer', 'ballista', 'clever rat', 'incursion', 'dark age arsenal', 'rufus', 'zaouli', 'hierarchy', 'forgiveness', 'zealot', 'emperor', 'war priest', 'memorial', 'praetorian', 'bushido', 'immanence', 'throne-cursed', 'peregrine', 'transcendent', 'gull', 'nightmare bond', 'sundered', 'doctrine', 'ikeleos', 'ikelos']

console.log('## fuzzy weapons')
for (const t of weaponTerms) {
  const hits = search(t, (type) => /rifle|shotgun|launcher|sword|bow|sidearm|glaive|hand cannon|machine gun|fusion|trace|scout|pulse|smg|grenade|intrinsic|catalyst|ornament/i.test(type) || type === '')
  if (hits.length) console.log(t, '->', hits.slice(0, 4).map((h) => `${h.name} [${h.type}] #${h.hash}`).join(' | '))
}

console.log('\n## armor chest pieces')
for (const t of ['memorial', 'praetorian', 'garden', 'last wish', 'immanence', 'throne', 'legacy oath', 'transcendent', 'opulent', 'gull', 'seraph', 'nightmare', 'deep explorer', 'heretic', 'prophecy', 'dark age', 'braytech', 'sundered', 'doctrine', 'king']) {
  const hits = search(t, (type) => /chest|plate|vest|robe|chestrig|overcoat/i.test(type))
  if (hits.length) console.log(t, '->', hits.slice(0, 4).map((h) => `${h.name} [${h.type}] #${h.hash}`).join(' | '))
}
