/** Find icons for dungeons across manifest tables. */
const manifest = (await fetch('https://www.bungie.net/Platform/Destiny2/Manifest/').then((r) => r.json()))
  .Response

async function load(component) {
  const path = manifest.jsonWorldComponentContentPaths.en[component]
  console.log('Loading', component)
  return fetch(`https://www.bungie.net${path}`).then((r) => r.json())
}

const targets = [
  'Pit of Heresy',
  'Shattered Throne',
  'Grasp of Avarice',
  'Prophecy',
  'Crown of Sorrow',
]

const tables = [
  'DestinyPresentationNodeDefinition',
  'DestinyCollectibleDefinition',
  'DestinyRecordDefinition',
  'DestinyActivityDefinition',
]

for (const table of tables) {
  const defs = await load(table)
  console.log('\n===', table, '===')
  for (const target of targets) {
    const words = target.toLowerCase().split(/\s+/)
    const hits = []
    for (const [hash, def] of Object.entries(defs)) {
      const name = def?.displayProperties?.name
      const icon = def?.displayProperties?.icon
      if (!name || !icon || icon.includes('missing_icon')) continue
      const n = name.toLowerCase()
      if (words.every((w) => n.includes(w))) hits.push({ name, hash, icon })
    }
    console.log(target, hits.length)
    hits.slice(0, 4).forEach((h) => console.log(' ', h.name, h.icon))
  }
}
