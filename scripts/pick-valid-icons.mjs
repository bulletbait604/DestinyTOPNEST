const manifest = (await fetch('https://www.bungie.net/Platform/Destiny2/Manifest/').then((r) => r.json()))
  .Response
const url = `https://www.bungie.net${manifest.jsonWorldComponentContentPaths.en.DestinyPresentationNodeDefinition}`
const defs = await fetch(url).then((r) => r.json())
const targets = [
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

async function ok(path) {
  if (!path) return false
  const r = await fetch(`https://www.bungie.net${path}`, { method: 'HEAD' })
  return r.status === 200
}

for (const target of targets) {
  const hits = []
  for (const [hash, def] of Object.entries(defs)) {
    const name = def?.displayProperties?.name
    const icon = def?.displayProperties?.icon
    if (!name || !icon || icon.includes('missing_icon')) continue
    const n = name.toLowerCase()
    const t = target.toLowerCase()
    if (n === t || n.includes(t) || name.replace(/^Dungeon:\s*/i, '').toLowerCase() === t) {
      hits.push({ name, hash, icon })
    }
  }
  let chosen = null
  for (const h of hits) {
    if (await ok(h.icon)) {
      chosen = h
      break
    }
  }
  console.log(target, chosen ? `${chosen.name} | ${chosen.icon}` : `NO VALID (${hits.length} hits)`)
}
