/**
 * Copy Top Nest MongoDB data from the SDHQCC `sdhq` database into `destinytopnest`.
 *
 * Usage (from repo root):
 *   set MONGODB_URI=your_connection_string
 *   node scripts/migrate-from-sdhq.mjs
 *
 * Optional:
 *   SOURCE_DB_NAME=sdhq          (default)
 *   MONGODB_DB_NAME=destinytopnest (default target)
 *   DRY_RUN=1                    (count only, no writes)
 */

import dns from 'node:dns/promises'
import { MongoClient } from 'mongodb'

const SOURCE_DB = process.env.SOURCE_DB_NAME || 'sdhq'
const TARGET_DB = process.env.MONGODB_DB_NAME || 'destinytopnest'
const DRY_RUN = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true'

/** Node on Windows can fail SRV lookups; fall back to public DNS. */
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1'])

const DESTINY_COLLECTION_NAMES = [
  'destiny_users',
  'destiny_run_records',
  'destiny_leaderboard_entries',
  'destiny_fireteam_lobbies',
  'destiny_reputation_reviews',
  'destiny_build_snapshots',
  'destiny_seasons',
  'destiny_admin_reviews',
  'destiny_external_build_sources',
  'destiny_manifest_cache',
  'destiny_prize_claims',
  'destiny_trust_reviews',
  'bungie_oauth_states',
]

function requireUri() {
  const uri = process.env.MONGODB_URI?.trim()
  if (!uri) {
    console.error('Missing MONGODB_URI. Set it to your Atlas connection string (without a fixed db name is fine).')
    process.exit(1)
  }
  return uri
}

async function copyCollection(sourceDb, targetDb, name) {
  const source = sourceDb.collection(name)
  const target = targetDb.collection(name)
  const total = await source.countDocuments()

  if (total === 0) {
    console.log(`  ${name}: 0 documents (skipped)`)
    return { name, copied: 0, skipped: true }
  }

  if (DRY_RUN) {
    console.log(`  ${name}: would copy ${total} documents`)
    return { name, copied: total, dryRun: true }
  }

  const cursor = source.find({})
  const batchSize = 500
  let copied = 0
  let batch = []

  while (await cursor.hasNext()) {
    batch.push(await cursor.next())
    if (batch.length >= batchSize) {
      await target.insertMany(batch, { ordered: false })
      copied += batch.length
      batch = []
    }
  }

  if (batch.length > 0) {
    await target.insertMany(batch, { ordered: false })
    copied += batch.length
  }

  console.log(`  ${name}: copied ${copied} documents`)
  return { name, copied }
}

async function copyKickUsers(sourceDb, targetDb) {
  const destinyUsers = sourceDb.collection('destiny_users')
  const userIds = await destinyUsers.distinct('userId')
  const usernames = userIds.filter(Boolean)

  if (usernames.length === 0) {
    console.log('  users: no destiny_users.userId values (skipped)')
    return { name: 'users', copied: 0, skipped: true }
  }

  const sourceUsers = sourceDb.collection('users')
  let rows = await sourceUsers
    .find({ username: { $in: usernames.map((u) => String(u).toLowerCase()) } })
    .toArray()

  if (rows.length === 0) {
    rows = await sourceUsers
      .find({ $or: [{ username: { $in: usernames } }, { _id: { $in: usernames } }] })
      .toArray()
  }

  const unique = new Map()
  for (const row of rows) {
    unique.set(String(row._id), row)
  }
  const docs = [...unique.values()]

  if (docs.length === 0) {
    console.log(`  users: 0 matching Kick users for ${usernames.length} destiny profile(s) (skipped)`)
    return { name: 'users', copied: 0, skipped: true }
  }

  if (DRY_RUN) {
    console.log(`  users: would copy ${docs.length} Kick user record(s)`)
    return { name: 'users', copied: docs.length, dryRun: true }
  }

  await targetDb.collection('users').insertMany(docs, { ordered: false })
  console.log(`  users: copied ${docs.length} Kick user record(s)`)
  return { name: 'users', copied: docs.length }
}

async function main() {
  const uri = requireUri()
  const client = new MongoClient(uri)

  console.log(`Migrating Top Nest data`)
  console.log(`  source database: ${SOURCE_DB}`)
  console.log(`  target database: ${TARGET_DB}`)
  if (DRY_RUN) console.log('  mode: DRY RUN (no writes)')

  await client.connect()
  const sourceDb = client.db(SOURCE_DB)
  const targetDb = client.db(TARGET_DB)

  const existing = await targetDb.listCollections().toArray()
  const destinyTargets = existing.filter((c) => c.name.startsWith('destiny_') || c.name === 'bungie_oauth_states')
  if (destinyTargets.length > 0 && !DRY_RUN) {
    console.error(
      `\nTarget database "${TARGET_DB}" already has Top Nest collections. ` +
        'Re-run with a fresh database or drop those collections first to avoid duplicates.'
    )
    await client.close()
    process.exit(1)
  }

  const sourceCollections = (await sourceDb.listCollections().toArray()).map((c) => c.name)
  const toCopy = DESTINY_COLLECTION_NAMES.filter((name) => sourceCollections.includes(name))
  const missing = DESTINY_COLLECTION_NAMES.filter((name) => !sourceCollections.includes(name))

  console.log('\nCollections to copy:')
  for (const name of toCopy) {
    await copyCollection(sourceDb, targetDb, name)
  }

  for (const name of missing) {
    console.log(`  ${name}: not present in ${SOURCE_DB} (skipped)`)
  }

  console.log('\nKick auth users referenced by destiny_users:')
  await copyKickUsers(sourceDb, targetDb)

  await client.close()
  console.log('\nDone.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
