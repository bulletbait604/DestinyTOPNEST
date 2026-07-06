/**
 * List (and optionally delete) FlierTeam rooms across all databases on the cluster.
 *
 * Usage:
 *   set MONGODB_URI=...
 *   node scripts/list-fireteam-rooms.mjs
 *   node scripts/list-fireteam-rooms.mjs --delete-all
 *   node scripts/list-fireteam-rooms.mjs --delete <lobbyId>
 */

import dns from 'node:dns/promises'
import { MongoClient } from 'mongodb'

dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1'])

const uri = process.env.MONGODB_URI?.trim().replace(/^["']|["']$/g, '')
if (!uri) {
  console.error('Set MONGODB_URI first.')
  process.exit(1)
}

const deleteAll = process.argv.includes('--delete-all')
const deleteIdx = process.argv.indexOf('--delete')
const deleteId = deleteIdx >= 0 ? process.argv[deleteIdx + 1] : null

const client = new MongoClient(uri)
await client.connect()

const { databases } = await client.db().admin().listDatabases()
const hits = []

for (const meta of databases) {
  if (['admin', 'local'].includes(meta.name)) continue
  const db = client.db(meta.name)
  const cols = await db.listCollections().toArray()
  for (const col of cols) {
    if (!col.name.includes('fireteam')) continue
    const collection = db.collection(col.name)
    const rows = await collection.find({}).sort({ createdAt: -1 }).toArray()
    for (const row of rows) {
      hits.push({ database: meta.name, collection: col.name, room: row })
    }
  }
}

if (!hits.length) {
  console.log('No FlierTeam rooms found on this cluster.')
  await client.close()
  process.exit(0)
}

console.log(`Found ${hits.length} room(s):`)
for (const { database, collection, room } of hits) {
  console.log(
    `- ${room.id} | db=${database}.${collection} | host=${room.hostDisplayName} (${room.hostUserId}) | ${room.activityName} | status=${room.status}`
  )
}

if (deleteAll) {
  let deleted = 0
  for (const { database, collection } of hits) {
    const result = await client.db(database).collection(collection).deleteMany({})
    deleted += result.deletedCount ?? 0
  }
  console.log(`Deleted ${deleted} room(s).`)
} else if (deleteId) {
  const target = hits.find((h) => h.room.id === deleteId)
  if (!target) {
    console.error(`Room ${deleteId} not found.`)
    process.exit(1)
  }
  const result = await client
    .db(target.database)
    .collection(target.collection)
    .deleteOne({ id: deleteId })
  console.log(`Deleted ${result.deletedCount ?? 0} room(s) for id ${deleteId}.`)
}

await client.close()
