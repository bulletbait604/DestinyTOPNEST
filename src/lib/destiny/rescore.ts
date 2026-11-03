import clientPromise from '@/lib/mongodb'
import { getMongoDbName } from '@/lib/database'
import { DESTINY_COLLECTIONS } from '@/lib/destiny/collections'
import { listOauthDestinyUsers, type StoredDestinyUser } from '@/lib/destiny/destinyUserStore'
import { destinyApiConfigured } from '@/lib/destiny/env'
import {
  bungieBoardKey,
  loadKickGuardianMembershipIds,
  resolveUnregisteredKickOwner,
} from '@/lib/destiny/kickGuardians'
import { syncRunsForUser } from '@/lib/destiny/runIngestion'
import { HISTORY_PAGE_SIZE } from '@/lib/destiny/runLookup'
import { assignStoredClearPoints } from '@/lib/destiny/scoring'
import type { DestinyPlatform, RunRecord } from '@/lib/destiny/types'

const FULL_HISTORY_PAGES = 80
const CURSOR_ID = 'readable-history'

export interface StoredRescoreResult {
  examined: number
  updated: number
  unchanged: number
  duplicates: number
}

export interface HistoryRescoreResult extends StoredRescoreResult {
  skipped: boolean
  players: number
  imported: number
  failed: number
  nextIndex: number
  done: boolean
}

type RescoreCursor = { id: string; index: number }

function membershipTypeFor(platform: DestinyPlatform | undefined): number {
  if (platform === 'xbox') return 1
  if (platform === 'playstation') return 2
  if (platform === 'epic') return 6
  if (platform === 'stadia') return 5
  return 3
}

function trackedPlayer(input: {
  membershipId: string
  displayName?: string
  platform?: DestinyPlatform
  membershipType?: number
}): StoredDestinyUser {
  const membershipId = input.membershipId.trim()
  const membershipType = input.membershipType || membershipTypeFor(input.platform)
  return {
    userId: bungieBoardKey(membershipId),
    bungieMembershipId: membershipId,
    bungieDisplayName: input.displayName?.trim() || membershipId,
    platform: input.platform ?? 'steam',
    destinyMembershipType: membershipType,
  }
}

async function runsCollection() {
  const client = await clientPromise
  return client.db(getMongoDbName()).collection<RunRecord>(DESTINY_COLLECTIONS.runRecords)
}

/**
 * Rewrite stored clear points to raid 3 / dungeon 1.
 * The same PGCR is scored once. Incomplete, rejected, and checkpoint clears stay at 0.
 */
export async function rescoreStoredRuns(): Promise<StoredRescoreResult> {
  const col = await runsCollection()
  const cursor = col.find(
    {},
    {
      projection: {
        id: 1,
        pgcrId: 1,
        type: 1,
        completed: 1,
        verificationStatus: 1,
        checkpointLikely: 1,
        staffApprovedFullClear: 1,
        pointsAwarded: 1,
      },
    }
  )
  const runs: RunRecord[] = []
  for await (const run of cursor) runs.push(run)
  const assignments = assignStoredClearPoints(runs)
  const byId = new Map(runs.map((run) => [run.id, run]))
  let examined = 0
  let updated = 0
  let unchanged = 0
  let duplicates = 0
  for (const assignment of assignments) {
    examined += 1
    if (assignment.duplicate) duplicates += 1
    const current = byId.get(assignment.id)
    if ((current?.pointsAwarded ?? 0) === assignment.points) {
      unchanged += 1
      continue
    }
    await col.updateOne({ id: assignment.id }, { $set: { pointsAwarded: assignment.points } })
    updated += 1
  }
  return { examined, updated, unchanged, duplicates }
}

async function historyTargets(): Promise<StoredDestinyUser[]> {
  const users = await listOauthDestinyUsers(2000)
  const seen = new Set(users.map((user) => user.bungieMembershipId).filter(Boolean))
  const targets = [...users]

  const roster = await loadKickGuardianMembershipIds()
  for (const membershipId of Array.from(roster)) {
    if (seen.has(membershipId)) continue
    const owner = await resolveUnregisteredKickOwner({ membershipId })
    if (!owner) continue
    seen.add(membershipId)
    targets.push(owner)
  }

  const col = await runsCollection()
  const members = col.find(
    { 'teamMembers.membershipId': { $exists: true } },
    { projection: { teamMembers: 1 } }
  )
  for await (const run of members) {
    for (const member of run.teamMembers ?? []) {
      const membershipId = member.membershipId?.trim()
      if (!membershipId || seen.has(membershipId)) continue
      seen.add(membershipId)
      targets.push(
        trackedPlayer({
          membershipId,
          displayName: member.displayName,
          platform: member.platform,
        })
      )
    }
  }
  return targets
}

async function cursorCollection() {
  const client = await clientPromise
  return client.db(getMongoDbName()).collection<RescoreCursor>(DESTINY_COLLECTIONS.rescoreCursor)
}

/**
 * Re-fetch readable raid and dungeon history, then rewrite stored points.
 * One call handles `limit` players and remembers where it stopped.
 * Calling it again continues, then wraps to the start. Safe to repeat.
 */
export async function rescoreReadableHistory(limit = 3): Promise<HistoryRescoreResult> {
  const stored = await rescoreStoredRuns()
  if (!destinyApiConfigured()) {
    return { ...stored, skipped: true, players: 0, imported: 0, failed: 0, nextIndex: 0, done: true }
  }

  const targets = await historyTargets()
  if (!targets.length) {
    return { ...stored, skipped: false, players: 0, imported: 0, failed: 0, nextIndex: 0, done: true }
  }

  const cursors = await cursorCollection()
  const saved = await cursors.findOne({ id: CURSOR_ID })
  const start = saved && saved.index < targets.length ? saved.index : 0
  const count = Math.max(1, Math.min(limit, targets.length))
  let imported = 0
  let failed = 0
  let index = start
  for (let step = 0; step < count; step += 1) {
    const player = targets[index % targets.length]
    index += 1
    try {
      const result = await syncRunsForUser(player, {
        pages: FULL_HISTORY_PAGES,
        countPerPage: HISTORY_PAGE_SIZE,
        includePrevious: true,
        walkUntilEmpty: true,
      })
      imported += result.imported
    } catch (error) {
      failed += 1
      console.warn('[rescore] history failed', player.bungieMembershipId, error)
    }
    const nextIndex = index % targets.length
    await cursors.updateOne({ id: CURSOR_ID }, { $set: { id: CURSOR_ID, index: nextIndex } }, { upsert: true })
  }
  const nextIndex = index % targets.length
  const after = await rescoreStoredRuns()
  return {
    ...after,
    skipped: false,
    players: count,
    imported,
    failed,
    nextIndex,
    done: nextIndex === 0,
  }
}
