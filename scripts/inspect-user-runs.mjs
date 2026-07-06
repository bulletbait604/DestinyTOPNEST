/**
 * Inspect run records for a Bungie display name or site user id.
 *
 * Usage:
 *   npx vercel env run --environment production -- node scripts/inspect-user-runs.mjs silverwolf
 */

import dns from 'node:dns/promises'
import { MongoClient } from 'mongodb'

dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1'])

const needle = (process.argv[2] ?? '').trim()
if (!needle) {
  console.error('Usage: node scripts/inspect-user-runs.mjs <name-or-userId-fragment>')
  process.exit(1)
}

const uri = process.env.MONGODB_URI?.trim().replace(/^["']|["']$/g, '')
const dbName = process.env.MONGODB_DB_NAME?.trim() || 'destinytopnest'
if (!uri) {
  console.error('Set MONGODB_URI first.')
  process.exit(1)
}

const regex = new RegExp(needle, 'i')
const client = new MongoClient(uri)
await client.connect()
const db = client.db(dbName)

const users = await db
  .collection('destiny_users')
  .find({ $or: [{ bungieDisplayName: regex }, { userId: regex }] })
  .toArray()

console.log(
  'Users:',
  users.map((u) => ({
    userId: u.userId,
    bungie: u.bungieDisplayName,
    membership: u.bungieMembershipId,
  }))
)

const userIds = users.map((u) => u.userId)
const runs = await db
  .collection('destiny_run_records')
  .find({
    $or: [
      { ownerUserId: { $in: userIds } },
      { ownerDisplayName: regex },
      { 'teamMembers.displayName': regex },
      { activityName: regex },
    ],
  })
  .sort({ completedAt: -1 })
  .limit(30)
  .toArray()

console.log(`\nRuns matching "${needle}" (${runs.length}):`)
for (const r of runs) {
  console.log('\n---')
  console.log(
    JSON.stringify(
      {
        id: r.id,
        activity: r.activityName,
        type: r.type,
        status: r.verificationStatus,
        suspiciousScore: r.suspiciousScore,
        durationSeconds: r.durationSeconds,
        completed: r.completed,
        checkpointLikely: r.checkpointLikely,
        playerCount: r.teamMembers?.length,
        pointsAwarded: r.pointsAwarded,
        aiReasons: r.aiReview?.reasons,
        aiSummary: r.aiReview?.summary,
        adminNotes: r.adminNotes,
        owner: r.ownerDisplayName,
        completedAt: r.completedAt,
        teamMembers: (r.teamMembers ?? []).map((m) => ({
          name: m.displayName,
          kills: m.kills,
          deaths: m.deaths,
          assists: m.assists,
          score: m.score,
          power: m.powerLevel,
        })),
      },
      null,
      2
    )
  )
}

const reviews = await db
  .collection('destiny_admin_reviews')
  .find({ $or: [{ 'run.ownerDisplayName': regex }, { 'run.activityName': regex }] })
  .sort({ updatedAt: -1 })
  .limit(15)
  .toArray()

console.log(`\nAdmin reviews (${reviews.length}):`)
for (const review of reviews) {
  console.log(
    JSON.stringify(
      {
        id: review.id,
        status: review.status,
        decision: review.decision,
        runId: review.runId,
        activity: review.run?.activityName,
        owner: review.run?.ownerDisplayName,
        verification: review.run?.verificationStatus,
        score: review.suspiciousScore,
        reasons: review.run?.aiReview?.reasons,
        notes: review.notes,
      },
      null,
      2
    )
  )
}

await client.close()
