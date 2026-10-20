import crypto from 'crypto'
import clientPromise from '@/lib/mongodb'
import { getMongoDbName } from '@/lib/database'
import { DESTINY_COLLECTIONS } from '@/lib/destiny/collections'
import {
  communityBuildListFilter,
  communityBuildSort,
  sanitizeIconUrl,
  sanitizePlainText,
  type CommunityBuildContent,
  type CommunityBuildListQuery,
  type CommunityBuildRecord,
  type CommunityBuildStatus,
} from '@/lib/destiny/communityBuildModel'

const MAX_BUILDS_PER_USER = 40

export interface CommunityBuildCommentRecord {
  id: string
  buildId: string
  authorUserId: string
  authorDisplayName: string
  body: string
  status: 'visible' | 'hidden'
  createdAt: string
}

async function db() {
  const client = await clientPromise
  return client.db(getMongoDbName())
}

let indexPromise: Promise<void> | null = null

export async function ensureCommunityBuildIndexes(): Promise<void> {
  if (!indexPromise) {
    indexPromise = ensureCommunityBuildIndexesOnce().catch((error) => {
      indexPromise = null
      throw error
    })
  }
  return indexPromise
}

async function ensureCommunityBuildIndexesOnce(): Promise<void> {
  const database = await db()
  const builds = database.collection(DESTINY_COLLECTIONS.communityBuilds)
  await builds.createIndex({ id: 1 }, { unique: true })
  await builds.createIndex({ status: 1, createdAt: -1 })
  await builds.createIndex({ status: 1, upvoteCount: -1, createdAt: -1 })
  await builds.createIndex({ status: 1, saveCount: -1, createdAt: -1 })
  await builds.createIndex({ ownerUserId: 1, createdAt: -1 })

  const votes = database.collection(DESTINY_COLLECTIONS.communityBuildVotes)
  await votes.createIndex({ buildId: 1, userId: 1 }, { unique: true })
  await votes.createIndex({ userId: 1, buildId: 1 })

  const saves = database.collection(DESTINY_COLLECTIONS.communityBuildSaves)
  await saves.createIndex({ buildId: 1, userId: 1 }, { unique: true })
  await saves.createIndex({ userId: 1, createdAt: -1 })

  const comments = database.collection(DESTINY_COLLECTIONS.communityBuildComments)
  await comments.createIndex({ id: 1 }, { unique: true })
  await comments.createIndex({ buildId: 1, createdAt: 1 })
}

function withoutMongoId<T>(row: T & { _id?: unknown }): T {
  const copy = { ...row }
  delete copy._id
  return copy
}

function isDuplicateKey(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: number }).code === 11000
}

export async function getCommunityBuild(id: string): Promise<CommunityBuildRecord | null> {
  await ensureCommunityBuildIndexes()
  const database = await db()
  const row = await database.collection(DESTINY_COLLECTIONS.communityBuilds).findOne({ id })
  if (!row) return null
  return withoutMongoId(row as CommunityBuildRecord & { _id?: unknown })
}

export async function listCommunityBuilds(
  query: CommunityBuildListQuery,
  viewerUserId?: string
): Promise<{ builds: CommunityBuildRecord[]; total: number }> {
  await ensureCommunityBuildIndexes()
  const database = await db()
  const buildsCol = database.collection(DESTINY_COLLECTIONS.communityBuilds)
  let savedIds: string[] | undefined
  if (query.scope === 'saved') {
    if (!viewerUserId) return { builds: [], total: 0 }
    const rows = await database
      .collection(DESTINY_COLLECTIONS.communityBuildSaves)
      .find({ userId: viewerUserId })
      .project({ buildId: 1 })
      .toArray()
    savedIds = rows.map((row) => String(row.buildId))
    if (!savedIds.length) return { builds: [], total: 0 }
  }

  const filter = communityBuildListFilter(query, {
    ownerUserId: viewerUserId,
    savedIds,
  })
  const total = await buildsCol.countDocuments(filter)
  const rows = await buildsCol
    .find(filter)
    .sort(communityBuildSort(query.sort))
    .skip(query.offset)
    .limit(query.limit)
    .toArray()

  return {
    builds: rows.map((row) => withoutMongoId(row as CommunityBuildRecord & { _id?: unknown })),
    total,
  }
}

export async function listFeaturedCommunityBuilds(
  query: CommunityBuildListQuery
): Promise<CommunityBuildRecord[]> {
  await ensureCommunityBuildIndexes()
  const database = await db()
  const filter = communityBuildListFilter({ ...query, scope: 'public' }, {})
  filter.listing = 'featured'
  const rows = await database
    .collection(DESTINY_COLLECTIONS.communityBuilds)
    .find(filter)
    .sort({ featuredRank: 1, name: 1 })
    .limit(40)
    .toArray()
  return rows.map((row) => withoutMongoId(row as CommunityBuildRecord & { _id?: unknown }))
}

export async function listCommunityBuildsForStaff(limit = 40): Promise<CommunityBuildRecord[]> {
  await ensureCommunityBuildIndexes()
  const database = await db()
  const rows = await database
    .collection(DESTINY_COLLECTIONS.communityBuilds)
    .find({})
    .sort({ updatedAt: -1 })
    .limit(limit)
    .toArray()
  return rows.map((row) => withoutMongoId(row as CommunityBuildRecord & { _id?: unknown }))
}

export async function viewerFlagsForBuilds(
  buildIds: string[],
  userId: string | undefined
): Promise<{ upvoted: Set<string>; saved: Set<string> }> {
  const upvoted = new Set<string>()
  const saved = new Set<string>()
  if (!userId || !buildIds.length) return { upvoted, saved }
  await ensureCommunityBuildIndexes()
  const database = await db()
  const [voteRows, saveRows] = await Promise.all([
    database
      .collection(DESTINY_COLLECTIONS.communityBuildVotes)
      .find({ userId, buildId: { $in: buildIds } })
      .project({ buildId: 1 })
      .toArray(),
    database
      .collection(DESTINY_COLLECTIONS.communityBuildSaves)
      .find({ userId, buildId: { $in: buildIds } })
      .project({ buildId: 1 })
      .toArray(),
  ])
  for (const row of voteRows) upvoted.add(String(row.buildId))
  for (const row of saveRows) saved.add(String(row.buildId))
  return { upvoted, saved }
}

export async function createCommunityBuild(input: {
  ownerUserId: string
  ownerDisplayName: string
  ownerEmblemUrl?: string
  content: CommunityBuildContent
}): Promise<{ ok: true; build: CommunityBuildRecord } | { ok: false; error: string; status: number }> {
  await ensureCommunityBuildIndexes()
  const database = await db()
  const col = database.collection(DESTINY_COLLECTIONS.communityBuilds)
  const ownerUserId = input.ownerUserId.toLowerCase()
  const existing = await col.countDocuments({ ownerUserId, status: { $ne: 'removed' } })
  if (existing >= MAX_BUILDS_PER_USER) {
    return { ok: false, error: `You can share up to ${MAX_BUILDS_PER_USER} builds. Delete one to post another.`, status: 400 }
  }

  const now = new Date().toISOString()
  const emblemUrl = sanitizeIconUrl(input.ownerEmblemUrl)
  const build: CommunityBuildRecord = {
    ...input.content,
    id: crypto.randomUUID(),
    ownerUserId,
    ownerDisplayName: sanitizePlainText(input.ownerDisplayName).slice(0, 48) || 'Guardian',
    ...(emblemUrl ? { ownerEmblemUrl: emblemUrl } : {}),
    status: 'published',
    upvoteCount: 0,
    saveCount: 0,
    commentCount: 0,
    createdAt: now,
    updatedAt: now,
  }
  await col.insertOne(build)
  return { ok: true, build }
}

export async function updateCommunityBuildContent(
  id: string,
  actorUserId: string,
  content: CommunityBuildContent,
  staff: boolean,
  actor?: { displayName?: string; emblemUrl?: string }
): Promise<{ ok: true; build: CommunityBuildRecord } | { ok: false; error: string; status: number }> {
  await ensureCommunityBuildIndexes()
  const current = await getCommunityBuild(id)
  if (!current) return { ok: false, error: 'Build not found.', status: 404 }
  if (current.listing === 'featured') {
    return { ok: false, error: 'Featured guides are curated. They are not player posts.', status: 403 }
  }
  const owns = current.ownerUserId === actorUserId.toLowerCase()
  if (!owns && !staff) return { ok: false, error: 'You can only edit your own builds.', status: 403 }

  const patch: Partial<CommunityBuildRecord> = {
    ...content,
    updatedAt: new Date().toISOString(),
  }
  if (owns && actor?.displayName) {
    patch.ownerDisplayName = sanitizePlainText(actor.displayName).slice(0, 48) || current.ownerDisplayName
  }
  if (owns) {
    const emblemUrl = sanitizeIconUrl(actor?.emblemUrl)
    if (emblemUrl) patch.ownerEmblemUrl = emblemUrl
  }

  const database = await db()
  await database.collection(DESTINY_COLLECTIONS.communityBuilds).updateOne({ id }, { $set: patch })
  const next = await getCommunityBuild(id)
  if (!next) return { ok: false, error: 'Build not found.', status: 404 }
  return { ok: true, build: next }
}

export async function setCommunityBuildStatus(
  id: string,
  status: CommunityBuildStatus,
  moderationNote: string
): Promise<{ ok: true; build: CommunityBuildRecord } | { ok: false; error: string; status: number }> {
  await ensureCommunityBuildIndexes()
  const current = await getCommunityBuild(id)
  if (!current) return { ok: false, error: 'Build not found.', status: 404 }
  const database = await db()
  const update: { $set: Record<string, unknown>; $unset?: Record<string, ''> } = {
    $set: { status, updatedAt: new Date().toISOString() },
  }
  if (moderationNote) update.$set.moderationNote = moderationNote
  else update.$unset = { moderationNote: '' }
  await database.collection(DESTINY_COLLECTIONS.communityBuilds).updateOne({ id }, update)
  const next = await getCommunityBuild(id)
  if (!next) return { ok: false, error: 'Build not found.', status: 404 }
  return { ok: true, build: next }
}

export async function deleteCommunityBuild(
  id: string,
  actorUserId: string,
  staff: boolean
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  await ensureCommunityBuildIndexes()
  const current = await getCommunityBuild(id)
  if (!current) return { ok: false, error: 'Build not found.', status: 404 }
  if (current.ownerUserId !== actorUserId.toLowerCase() && !staff) {
    return { ok: false, error: 'You can only delete your own builds.', status: 403 }
  }
  const database = await db()
  await database.collection(DESTINY_COLLECTIONS.communityBuilds).deleteOne({ id })
  await database.collection(DESTINY_COLLECTIONS.communityBuildVotes).deleteMany({ buildId: id })
  await database.collection(DESTINY_COLLECTIONS.communityBuildSaves).deleteMany({ buildId: id })
  await database.collection(DESTINY_COLLECTIONS.communityBuildComments).deleteMany({ buildId: id })
  return { ok: true }
}

async function toggleReaction(
  collectionName: string,
  countField: 'upvoteCount' | 'saveCount',
  buildId: string,
  userId: string
): Promise<{ ok: true; active: boolean; count: number } | { ok: false; error: string; status: number }> {
  await ensureCommunityBuildIndexes()
  const build = await getCommunityBuild(buildId)
  if (!build || build.status !== 'published') return { ok: false, error: 'Build not found.', status: 404 }
  if (countField === 'upvoteCount' && build.ownerUserId === userId) {
    return { ok: false, error: 'You cannot upvote your own build.', status: 400 }
  }

  const database = await db()
  const reactions = database.collection(collectionName)
  const builds = database.collection(DESTINY_COLLECTIONS.communityBuilds)
  const existing = await reactions.findOne({ buildId, userId })

  if (existing) {
    await reactions.deleteOne({ buildId, userId })
    await builds.updateOne({ id: buildId }, { $inc: { [countField]: -1 } })
    await builds.updateOne({ id: buildId, [countField]: { $lt: 0 } }, { $set: { [countField]: 0 } })
    const next = await getCommunityBuild(buildId)
    return { ok: true, active: false, count: next?.[countField] ?? 0 }
  }

  try {
    await reactions.insertOne({
      id: crypto.randomUUID(),
      buildId,
      userId,
      createdAt: new Date().toISOString(),
    })
  } catch (error) {
    if (!isDuplicateKey(error)) throw error
    const next = await getCommunityBuild(buildId)
    return { ok: true, active: true, count: next?.[countField] ?? 0 }
  }

  await builds.updateOne({ id: buildId }, { $inc: { [countField]: 1 } })
  const next = await getCommunityBuild(buildId)
  return { ok: true, active: true, count: next?.[countField] ?? 0 }
}

export function toggleCommunityBuildVote(buildId: string, userId: string) {
  return toggleReaction(DESTINY_COLLECTIONS.communityBuildVotes, 'upvoteCount', buildId, userId.toLowerCase())
}

export function toggleCommunityBuildSave(buildId: string, userId: string) {
  return toggleReaction(DESTINY_COLLECTIONS.communityBuildSaves, 'saveCount', buildId, userId.toLowerCase())
}

async function refreshCommentCount(buildId: string): Promise<number> {
  const database = await db()
  const count = await database.collection(DESTINY_COLLECTIONS.communityBuildComments).countDocuments({
    buildId,
    status: 'visible',
  })
  await database
    .collection(DESTINY_COLLECTIONS.communityBuilds)
    .updateOne({ id: buildId }, { $set: { commentCount: count } })
  return count
}

export async function listCommunityBuildComments(
  buildId: string,
  includeHidden: boolean
): Promise<CommunityBuildCommentRecord[]> {
  await ensureCommunityBuildIndexes()
  const database = await db()
  const filter = includeHidden ? { buildId } : { buildId, status: 'visible' }
  const rows = await database
    .collection(DESTINY_COLLECTIONS.communityBuildComments)
    .find(filter)
    .sort({ createdAt: 1 })
    .limit(100)
    .toArray()
  return rows.map((row) => withoutMongoId(row as CommunityBuildCommentRecord & { _id?: unknown }))
}

export async function addCommunityBuildComment(input: {
  buildId: string
  authorUserId: string
  authorDisplayName: string
  body: string
}): Promise<{ ok: true; comment: CommunityBuildCommentRecord } | { ok: false; error: string; status: number }> {
  await ensureCommunityBuildIndexes()
  const build = await getCommunityBuild(input.buildId)
  if (!build || build.status !== 'published') return { ok: false, error: 'Build not found.', status: 404 }

  const comment: CommunityBuildCommentRecord = {
    id: crypto.randomUUID(),
    buildId: input.buildId,
    authorUserId: input.authorUserId.toLowerCase(),
    authorDisplayName: sanitizePlainText(input.authorDisplayName).slice(0, 48) || 'Guardian',
    body: input.body,
    status: 'visible',
    createdAt: new Date().toISOString(),
  }
  const database = await db()
  await database.collection(DESTINY_COLLECTIONS.communityBuildComments).insertOne(comment)
  await refreshCommentCount(input.buildId)
  return { ok: true, comment }
}

export async function deleteCommunityBuildComment(
  buildId: string,
  commentId: string,
  actorUserId: string,
  staff: boolean
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  await ensureCommunityBuildIndexes()
  const database = await db()
  const row = (await database.collection(DESTINY_COLLECTIONS.communityBuildComments).findOne({
    id: commentId,
    buildId,
  })) as CommunityBuildCommentRecord | null
  if (!row) return { ok: false, error: 'Comment not found.', status: 404 }
  if (row.authorUserId !== actorUserId.toLowerCase() && !staff) {
    return { ok: false, error: 'You can only delete your own comments.', status: 403 }
  }
  await database.collection(DESTINY_COLLECTIONS.communityBuildComments).deleteOne({ id: commentId, buildId })
  await refreshCommentCount(buildId)
  return { ok: true }
}
