const manifest = (await fetch('https://www.bungie.net/Platform/Destiny2/Manifest/').then((r) => r.json()))
  .Response
const url = `https://www.bungie.net${manifest.jsonWorldComponentContentPaths.en.DestinyPresentationNodeDefinition}`
console.log('fetching presentation nodes')
const defs = await fetch(url).then((r) => r.json())
const targets = [
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
for (const target of targets) {
  const hits = []
  for (const [hash, def] of Object.entries(defs)) {
    const name = def?.displayProperties?.name
    const icon = def?.displayProperties?.icon
    if (!name || !icon || icon.includes('missing_icon')) continue
    const n = name.toLowerCase()
    const t = target.toLowerCase()
    if (n === t || n.includes(t) || t.includes(n)) hits.push({ name, hash, icon })
  }
  console.log('\n', target, hits.length)
  hits.slice(0, 3).forEach((h) => console.log(' ', h.name, h.hash, h.icon))
}
