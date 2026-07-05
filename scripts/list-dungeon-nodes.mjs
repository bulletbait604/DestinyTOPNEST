const manifest = (await fetch('https://www.bungie.net/Platform/Destiny2/Manifest/').then((r) => r.json()))
  .Response
const url = `https://www.bungie.net${manifest.jsonWorldComponentContentPaths.en.DestinyPresentationNodeDefinition}`
const defs = await fetch(url).then((r) => r.json())
for (const [hash, def] of Object.entries(defs)) {
  const name = def?.displayProperties?.name
  const icon = def?.displayProperties?.icon
  if (!name || !icon || icon.includes('missing_icon')) continue
  if (name.toLowerCase().includes('dungeon')) console.log(name, hash, icon)
}
