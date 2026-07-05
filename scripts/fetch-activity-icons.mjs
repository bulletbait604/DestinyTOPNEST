const activities = {
  'garden of salvation': 2659723068,
  "king's fall": 1374392663,
  'root of nightmares': 2381413764,
  'deep stone crypt': 910380154,
  'vault of glass': 3881495763,
  'vow of the disciple': 1441982566,
  'last wish': 2122313384,
  "crota's end": 107319834,
  "salvation's edge": 4169645674,
  'crown of sorrow': 333743995,
  'spire of the watcher': 2924076770,
  'pit of heresy': 1375089622,
  'ghosts of the deep': 3138280882,
  duality: 2823159265,
  'shattered throne': 2032534090,
  "warlord's ruin": 1290915544,
  'grasp of avarice': 1064261507,
  prophecy: 2546884575,
  "vesper's host": 3926382689,
}

for (const [name, hash] of Object.entries(activities)) {
  const url = `https://www.bungie.net/Platform/Destiny2/Manifest/DestinyActivityDefinition/${hash}/`
  const res = await fetch(url)
  const j = await res.json()
  const icon = j?.Response?.displayProperties?.icon
  console.log(JSON.stringify({ name, hash, icon }))
  await new Promise((r) => setTimeout(r, 150))
}
