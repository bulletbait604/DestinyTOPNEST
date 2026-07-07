/**
 * Verify static catalog resolves meta build display names.
 * Run: npx tsx scripts/verify-icon-catalog.ts
 */
import { catalogLookup } from '../src/lib/destiny/itemsCatalog'
import { itemNameLookupCandidates } from '../src/lib/destiny/itemNameAliases'
import { staticIconUrlForLabel } from '../src/lib/destiny/clientManifestIcon'

const META_NAMES = [
  'Bleakwatch',
  "Winter's Resilience",
  'Gyrfalcon',
  'Dynamism',
  'Lightning Storm',
  'Shock Absorber',
  'Waveframe Trace Rifle',
  'Touch of Devour',
  'Lament',
  'Contraverse Hold',
  'Harmonic Siphon',
  'Facet of Courage',
  'Prismatic',
  'Null Composure',
  'Khvostov 7G-0X',
]

let ok = 0
let fail = 0
for (const name of META_NAMES) {
  const catalog = catalogLookup(name)
  const staticUrl = staticIconUrlForLabel(name)
  const candidates = itemNameLookupCandidates(name)
  if (catalog?.iconPath || staticUrl) {
    console.log('OK', name, '→', catalog?.iconPath ? 'catalog' : 'static', candidates[0])
    ok++
  } else {
    console.log('FAIL', name, candidates)
    fail++
  }
}
console.log(`\n${ok} ok, ${fail} fail`)
process.exit(fail > 0 ? 1 : 0)
