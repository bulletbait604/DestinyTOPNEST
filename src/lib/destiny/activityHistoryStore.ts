import clientPromise from '@/lib/mongodb'
import { getMongoDbName } from '@/lib/database'
import { DESTINY_COLLECTIONS } from '@/lib/destiny/collections'
import type { CachedPgcr } from '@/lib/destiny/activityHistoryPgcr'
import {
  activityKindLabel,
  emptyStatBucket,
  escapeRegex,
  fallbackActivityName,
  kdRatio,
  type ActivityHistoryKind,
  type ActivityStatBucket,
  type HistoryCharacterCursor,
  type ParsedHistoryActivity,
} from '@/lib/destiny/activityHistoryModel'

export interface StoredActivityRun extends ParsedHistoryActivity {
  userId: string
  membershipId: string
  membershipType: number
  characterId: string
  characterKey: string
  characterDeleted: boolean
  activityName: string
  iconUrl?: string
  syncedAt: string
}

export interface ActivityHistorySyncDocument {
  _id: string
  characters: HistoryCharacterCursor[]
  limitations: string[]
  status: 'idle' | 'running' | 'complete' | 'error'
  activitiesStored: number
  pagesFetched: number
  error?: string
  discoveredAt?: string
  updatedAt: string
  lockUntil?: string
}

export interface ActivityHistoryQuery {
  userId: string
  activityType?: ActivityHistoryKind
  referenceId?: number
  characterKey?: string
  completed?: 'all' | 'clears' | 'incomplete'
  q?: string
  page?: number
  pageSize?: number
}

export interface ActivityGroup extends ActivityStatBucket {
  activityType: ActivityHistoryKind
  label: string
  referenceId: number
  activityName: string
  iconUrl?: string
}

export interface ActivityTypeGroup extends ActivityStatBucket {
  activityType: ActivityHistoryKind
  label: string
}

const LOCK_MS = 25_000
let indexesPromise: Promise<void> | null = null

async function db() {
  const client = await clientPromise
  return client.db(getMongoDbName())
}

export async function ensureActivityHistoryIndexes(): Promise<void> {
  if (!indexesPromise) {
    indexesPromise = ensureActivityHistoryIndexesOnce().catch((error) => {
      indexesPromise = null
      throw error
    })
  }
  await indexesPromise
}

async function ensureActivityHistoryIndexesOnce(): Promise<void> {
  const database = await db()
  const runs = database.collection(DESTINY_COLLECTIONS.activityHistory)
  await runs.createIndex({ userId: 1, period: -1 })
  await runs.createIndex({ userId: 1, activityType: 1, period: -1 })
  await runs.createIndex({ userId: 1, referenceId: 1, period: -1 })
  await runs.createIndex({ userId: 1, characterKey: 1, period: -1 })
  await runs.createIndex({ userId: 1, activityName: 1 })
  await database.collection(DESTINY_COLLECTIONS.activityPgcr).createIndex({ userId: 1, fetchedAt: -1 })
}

function runsCollection() {
  return db().then((database) => database.collection(DESTINY_COLLECTIONS.activityHistory))
}

function syncCollection() {
  return db().then((database) => database.collection<ActivityHistorySyncDocument>(DESTINY_COLLECTIONS.activityHistorySync))
}

export function emptySyncDocument(userId: string): ActivityHistorySyncDocument {
  return {
    _id: userId,
    characters: [],
    limitations: [],
    status: 'idle',
    activitiesStored: 0,
    pagesFetched: 0,
    updatedAt: new Date().toISOString(),
  }
}

export async function getActivitySyncState(userId: string): Promise<ActivityHistorySyncDocument> {
  await ensureActivityHistoryIndexes()
  const existing = await (await syncCollection()).findOne({ _id: userId })
  return existing ?? emptySyncDocument(userId)
}

export async function saveActivitySyncState(state: ActivityHistorySyncDocument): Promise<void> {
  await ensureActivityHistoryIndexes()
  const { _id, error, lockUntil, ...rest } = state
  const $set: Record<string, unknown> = { ...rest, updatedAt: new Date().toISOString() }
  const $unset: Record<string, ''> = {}
  if (error) $set.error = error
  else $unset.error = ''
  if (lockUntil) $set.lockUntil = lockUntil
  else $unset.lockUntil = ''
  const update = Object.keys($unset).length ? { $set, $unset } : { $set }
  await (await syncCollection()).updateOne({ _id }, update as never, { upsert: true })
}

/** Claim a short lock so two sync requests cannot page the same character at once. */
export async function claimActivitySyncLock(
  userId: string
): Promise<{ state: ActivityHistorySyncDocument; claimed: boolean }> {
  await ensureActivityHistoryIndexes()
  const collection = await syncCollection()
  const now = new Date().toISOString()
  const { _id: _ignored, ...insert } = emptySyncDocument(userId)
  await collection.updateOne({ _id: userId }, { $setOnInsert: insert }, { upsert: true })
  const claimed = await collection.findOneAndUpdate(
    {
      _id: userId,
      $or: [{ lockUntil: { $lte: now } }, { lockUntil: { $exists: false } }, { lockUntil: '' }],
    },
    { $set: { lockUntil: new Date(Date.now() + LOCK_MS).toISOString(), status: 'running' } },
    { returnDocument: 'after' }
  )
  const state = claimed.value
  if (!state) {
    const current = await getActivitySyncState(userId)
    return { state: current, claimed: false }
  }
  return { state, claimed: true }
}

export async function releaseActivitySyncLock(userId: string): Promise<void> {
  await (await syncCollection()).updateOne({ _id: userId }, { $unset: { lockUntil: '' } })
}

export async function upsertParsedActivities(
  userId: string,
  cursor: HistoryCharacterCursor,
  runs: ParsedHistoryActivity[]
): Promise<void> {
  if (!runs.length) return
  await ensureActivityHistoryIndexes()
  const collection = await runsCollection()
  const syncedAt = new Date().toISOString()
  const chunkSize = 400
  for (let index = 0; index < runs.length; index += chunkSize) {
    const slice = runs.slice(index, index + chunkSize)
    await collection.bulkWrite(
      slice.map((run) => ({
        updateOne: {
          filter: { _id: `${userId}:${run.instanceId}` },
          update: {
            $set: {
              userId,
              membershipId: cursor.membershipId,
              membershipType: cursor.membershipType,
              characterId: cursor.characterId,
              characterKey: cursor.key,
              characterDeleted: cursor.deleted,
              instanceId: run.instanceId,
              period: run.period,
              referenceId: run.referenceId,
              directorActivityHash: run.directorActivityHash,
              mode: run.mode,
              modes: run.modes,
              activityType: run.activityType,
              kills: run.kills,
              deaths: run.deaths,
              assists: run.assists,
              score: run.score,
              completed: run.completed,
              completionReason: run.completionReason,
              timePlayedSeconds: run.timePlayedSeconds,
              durationSeconds: run.durationSeconds,
              isPrivate: run.isPrivate,
              syncedAt,
            },
            $setOnInsert: {
              activityName: fallbackActivityName(run.referenceId),
            },
          },
          upsert: true,
        },
      })),
      { ordered: false }
    )
  }
}

export async function countStoredActivities(userId: string): Promise<number> {
  return (await runsCollection()).countDocuments({ userId })
}

export async function renameActivities(
  userId: string,
  referenceId: number,
  activityName: string,
  iconUrl?: string
): Promise<void> {
  const set: Record<string, string> = { activityName }
  if (iconUrl) set.iconUrl = iconUrl
  await (await runsCollection()).updateMany(
    { userId, referenceId, activityName: fallbackActivityName(referenceId) },
    { $set: set }
  )
}

export async function listUnresolvedActivityHashes(userId: string, limit: number): Promise<number[]> {
  const rows = await (await runsCollection())
    .find({ userId, activityName: /^Activity \d+$/ })
    .project({ referenceId: 1 })
    .limit(Math.max(limit * 4, limit))
    .toArray()
  const hashes: number[] = []
  const seen = new Set<number>()
  for (const row of rows) {
    const hash = Number(row.referenceId)
    if (!hash || seen.has(hash)) continue
    seen.add(hash)
    hashes.push(hash)
    if (hashes.length >= limit) break
  }
  return hashes
}

function bucketFromAggregate(row: {
  runs?: number
  clears?: number
  kills?: number
  deaths?: number
  timePlayedSeconds?: number
  fastestClearSeconds?: number | null
}): ActivityStatBucket {
  const bucket = emptyStatBucket()
  bucket.runs = row.runs ?? 0
  bucket.clears = row.clears ?? 0
  bucket.kills = row.kills ?? 0
  bucket.deaths = row.deaths ?? 0
  bucket.timePlayedSeconds = row.timePlayedSeconds ?? 0
  bucket.fastestClearSeconds =
    typeof row.fastestClearSeconds === 'number' && row.fastestClearSeconds > 0
      ? row.fastestClearSeconds
      : null
  bucket.kd = kdRatio(bucket.kills, bucket.deaths)
  return bucket
}

function runFilter(query: ActivityHistoryQuery, options?: { ignoreType?: boolean; ignoreActivity?: boolean; ignoreText?: boolean }) {
  const filter: Record<string, unknown> = { userId: query.userId }
  if (!options?.ignoreType && query.activityType) filter.activityType = query.activityType
  if (!options?.ignoreActivity && query.referenceId) filter.referenceId = query.referenceId
  if (query.characterKey) filter.characterKey = query.characterKey
  if (query.completed === 'clears') filter.completed = true
  if (query.completed === 'incomplete') filter.completed = false
  const text = query.q?.trim()
  if (!options?.ignoreText && text) {
    filter.activityName = { $regex: escapeRegex(text), $options: 'i' }
  }
  return filter
}

const STATS_GROUP = {
  runs: { $sum: 1 },
  clears: { $sum: { $cond: ['$completed', 1, 0] } },
  kills: { $sum: '$kills' },
  deaths: { $sum: '$deaths' },
  timePlayedSeconds: { $sum: '$timePlayedSeconds' },
  fastestClearSeconds: {
    $min: {
      $cond: [{ $and: ['$completed', { $gt: ['$durationSeconds', 0] }] }, '$durationSeconds', null],
    },
  },
}

export async function queryActivityHistory(query: ActivityHistoryQuery): Promise<{
  overall: ActivityStatBucket
  byType: ActivityTypeGroup[]
  byActivity: ActivityGroup[]
  runs: StoredActivityRun[]
  runsTotal: number
  page: number
  pageSize: number
}> {
  await ensureActivityHistoryIndexes()
  const collection = await runsCollection()
  const pageSize = Math.min(50, Math.max(1, query.pageSize ?? 25))
  const page = Math.max(0, query.page ?? 0)
  const statsMatch = runFilter(query, { ignoreType: true, ignoreActivity: true, ignoreText: true })
  const listMatch = runFilter(query)

  const [stats, runsTotal, runs] = await Promise.all([
    collection
      .aggregate<{
        overall: Array<{
          runs: number
          clears: number
          kills: number
          deaths: number
          timePlayedSeconds: number
          fastestClearSeconds: number | null
        }>
        byType: Array<{
          _id: ActivityHistoryKind
          runs: number
          clears: number
          kills: number
          deaths: number
          timePlayedSeconds: number
          fastestClearSeconds: number | null
        }>
        byActivity: Array<{
          _id: { referenceId: number; activityType: ActivityHistoryKind }
          activityName?: string
          iconUrl?: string
          runs: number
          clears: number
          kills: number
          deaths: number
          timePlayedSeconds: number
          fastestClearSeconds: number | null
        }>
      }>([
        { $match: statsMatch },
        {
          $facet: {
            overall: [{ $group: { _id: null, ...STATS_GROUP } }],
            byType: [{ $group: { _id: '$activityType', ...STATS_GROUP } }, { $sort: { runs: -1 } }],
            byActivity: [
              {
                $group: {
                  _id: { referenceId: '$referenceId', activityType: '$activityType' },
                  activityName: { $first: '$activityName' },
                  iconUrl: { $first: '$iconUrl' },
                  ...STATS_GROUP,
                },
              },
              {
                $addFields: {
                  kindRank: {
                    $switch: {
                      branches: [
                        { case: { $eq: ['$_id.activityType', 'raid'] }, then: 0 },
                        { case: { $eq: ['$_id.activityType', 'dungeon'] }, then: 1 },
                      ],
                      default: 2,
                    },
                  },
                },
              },
              { $sort: { kindRank: 1, runs: -1 } },
              { $limit: 200 },
            ],
          },
        },
      ])
      .toArray(),
    collection.countDocuments(listMatch),
    collection
      .find(listMatch)
      .sort({ period: -1, instanceId: -1 })
      .skip(page * pageSize)
      .limit(pageSize)
      .toArray(),
  ])

  const facet = stats[0]
  const overall = bucketFromAggregate(facet?.overall?.[0] ?? {})
  const byType = (facet?.byType ?? []).map((row) => ({
    ...bucketFromAggregate(row),
    activityType: row._id,
    label: activityKindLabel(row._id),
  }))
  const typeFilter = query.activityType
  const byActivity = (facet?.byActivity ?? [])
    .filter((row) => !typeFilter || row._id.activityType === typeFilter)
    .map((row) => ({
      ...bucketFromAggregate(row),
      activityType: row._id.activityType,
      label: activityKindLabel(row._id.activityType),
      referenceId: row._id.referenceId,
      activityName: row.activityName || fallbackActivityName(row._id.referenceId),
      iconUrl: row.iconUrl,
    }))

  return {
    overall,
    byType,
    byActivity,
    runs: runs as unknown as StoredActivityRun[],
    runsTotal,
    page,
    pageSize,
  }
}

export async function findOwnedActivity(
  userId: string,
  instanceId: string
): Promise<StoredActivityRun | null> {
  const row = await (await runsCollection()).findOne({ userId, instanceId })
  return row as StoredActivityRun | null
}

export async function readCachedPgcr(userId: string, instanceId: string): Promise<CachedPgcr | null> {
  const database = await db()
  const row = await database.collection(DESTINY_COLLECTIONS.activityPgcr).findOne({
    _id: `${userId}:${instanceId}`,
  })
  if (!row) return null
  const { _id: _ignored, ...cached } = row
  return cached as unknown as CachedPgcr
}

export async function writeCachedPgcr(report: CachedPgcr): Promise<void> {
  const database = await db()
  const { instanceId, userId, ...rest } = report
  await database.collection(DESTINY_COLLECTIONS.activityPgcr).updateOne(
    { _id: `${userId}:${instanceId}` },
    { $set: { ...rest, instanceId, userId } },
    { upsert: true }
  )
}
