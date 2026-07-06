import { readFileSync } from 'fs'

const source = readFileSync('src/lib/destiny/activityArmorSets.ts', 'utf8')
const pathsFile = readFileSync('src/lib/destiny/itemIconPaths.ts', 'utf8')
const iconItems = [...source.matchAll(/iconItem:\s*(['"])((?:\\.|(?!\1).)*)\1/g)].map((m) => m[2])

const missing = []
const has = []
for (const name of iconItems) {
  const key = name.trim().toLowerCase()
  if (pathsFile.includes(`"${key}"`)) has.push(name)
  else missing.push(name)
}

console.log('Total armor sets:', iconItems.length)
console.log('Has icons:', has.length, has)
console.log('Missing icons:', missing.length)
for (const name of missing) console.log(' -', name)

if (missing.length > 0) process.exit(1)
