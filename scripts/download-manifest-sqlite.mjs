/**
 * Download the latest English Destiny 2 manifest SQLite bundle (ZIP).
 * Useful for offline queries: displayProperties.icon, pgcrImage, etc.
 *
 * Requires DESTINY_API or BUNGIE_API_KEY in .env.local or environment.
 * Run: node scripts/download-manifest-sqlite.mjs
 */
import { createWriteStream, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { pipeline } from 'stream/promises'
import { loadManifestTables } from './lib/manifestClient.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = resolve(__dirname, '../.cache/destiny-manifest')

async function main() {
  mkdirSync(OUT_DIR, { recursive: true })

  const { version, mobileAssetContentPath } = await loadManifestTables([])
  if (!mobileAssetContentPath) {
    throw new Error('Manifest response missing mobileAssetContentPath')
  }

  const url = `https://www.bungie.net${mobileAssetContentPath}`
  console.log(`Downloading manifest SQLite bundle (v${version})…`)
  console.log(url)

  const res = await fetch(url)
  if (!res.ok) throw new Error(`Download failed: ${res.status}`)

  const outPath = resolve(OUT_DIR, `destiny2-manifest-${version}.zip`)
  await pipeline(res.body, createWriteStream(outPath))
  console.log('Saved:', outPath)
  console.log('Extract the ZIP and query tables like DestinyInventoryItemDefinition for displayProperties.icon paths.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
