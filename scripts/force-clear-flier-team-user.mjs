/**
 * Force-clear FlierTeam membership for a site user id.
 *
 * Usage:
 *   npx vercel env run --environment production -- node scripts/force-clear-flier-team-user.mjs bulletbait604
 */

import dns from 'node:dns/promises'
import { MongoClient } from 'mongodb'

dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1'])

const userId = (process.argv[2] ?? '').trim().toLowerCase()
if (!userId) {
  console.error('Usage: node scripts/force-clear-flier-team-user.mjs <siteUserId>')
  process.exit(1)
}

const uri = process.env.MONGODB_URI?.trim().replace(/^["']|["']$/g, '')
const dbName = process.env.MONGODB_DB_NAME?.trim() || 'destinytopnest'
if (!uri) {
  console.error('Set MONGODB_URI first (or run via vercel env run).')
  process.exit(1)
}

function sameUser(a, b) {
  return String(a ?? '').trim().toLowerCase() === String(b ?? '').trim().toLowerCase()
}

const client = new MongoClient(uri)
await client.connect()
const col = client.db(dbName).collection('destiny_fireteam_lobbies')
const rows = await col.find({}).toArray()

let cleared = 0
for (const lobby of rows) {
  const isHost = sameUser(lobby.hostUserId, userId)
  const isMember =
    (lobby.memberUserIds ?? []).some((id) => sameUser(id, userId)) ||
    (lobby.memberRoster ?? []).some((member) => sameUser(member.userId, userId))

  if (!isHost && !isMember) continue

  if (isHost) {
    await col.deleteOne({ id: lobby.id })
    console.log(`Deleted host room ${lobby.id} (${lobby.activityName})`)
    cleared++
    continue
  }

  const memberRoster = (lobby.memberRoster ?? []).filter((member) => !sameUser(member.userId, userId))
  const memberUserIds = memberRoster.map((member) => member.userId)
  const currentPlayers = 1 + memberRoster.length
  await col.updateOne(
    { id: lobby.id },
    {
      $set: {
        memberRoster,
        memberUserIds,
        currentPlayers,
        status: currentPlayers >= lobby.maxPlayers ? 'full' : 'open',
        updatedAt: new Date().toISOString(),
      },
    }
  )
  console.log(`Removed ${userId} from room ${lobby.id}`)
  cleared++
}

console.log(cleared > 0 ? `Cleared ${cleared} room link(s).` : `No FlierTeam rooms found for ${userId}.`)
await client.close()
