/**
 * Delete every document in destiny_fireteam_lobbies.
 *
 * Usage (from repo root):
 *   set MONGODB_URI=your_connection_string
 *   node scripts/clear-fireteam-rooms.mjs
 *
 * Optional:
 *   MONGODB_DB_NAME=destinytopnest
 *   DRY_RUN=1
 */

import dns from 'node:dns/promises'
import { MongoClient } from 'mongodb'

const TARGET_DB = process.env.MONGODB_DB_NAME || 'destinytopnest'
const COLLECTION = 'destiny_fireteam_lobbies'
const DRY_RUN = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true'

dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1'])

function requireUri() {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    console.error('Set MONGODB_URI before running this script.')
    process.exit(1)
  }
  return uri
}

async function main() {
  const client = new MongoClient(requireUri())
  await client.connect()
  const col = client.db(TARGET_DB).collection(COLLECTION)
  const count = await col.countDocuments()

  console.log(`Found ${count} FlierTeam room${count === 1 ? '' : 's'} in ${TARGET_DB}.${COLLECTION}`)

  if (DRY_RUN) {
    console.log('DRY_RUN=1 — no documents deleted.')
    await client.close()
    return
  }

  if (count === 0) {
    await client.close()
    return
  }

  const result = await col.deleteMany({})
  console.log(`Deleted ${result.deletedCount ?? 0} room${result.deletedCount === 1 ? '' : 's'}.`)
  await client.close()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
