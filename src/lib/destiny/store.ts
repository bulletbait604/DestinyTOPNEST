/**
 * MongoDB persistence helpers for DestinyTopNest.
 * All user-facing data comes from Mongo + Bungie API — no mock fallbacks.
 */

import clientPromise from '@/lib/mongodb'
import { getMongoDbName } from '@/lib/database'
import { DESTINY_COLLECTIONS } from '@/lib/destiny/collections'
import { buildOverviewPayload } from '@/lib/destiny/overviewBuilder'
import { computeSeasonStandings } from '@/lib/destiny/seasonPrizes'
import { computeReputationScore } from '@/lib/destiny/reputation'
import { buildLeaderboardWithAdjustments } from '@/lib/destiny/leaderboardAdjustments'
import { squadKeyIncludesMember } from '@/lib/destiny/pantheonActivities'
import {
  getResearchedMetaBuilds,
  META_BUILD_RESEARCH_DATE,
  META_RESEARCH_SOURCES,
} from '@/lib/destiny/externalMetaResearch'
import { ensureWeeklyMetaBuildSync, getMetaBuildWeeklySyncStatus } from '@/lib/destiny/metaBuildWeeklySync'
import { isValidMetaBuild } from '@/lib/destiny/metaBuildClassRules'
import { getWeeklyResetState } from '@/lib/destiny/weeklyRotation'
import { aggregateBuildIntelligence, verifiedRunIdSet } from '@/lib/destiny/buildIntelligence'
import { calculateRunPoints } from '@/lib/destiny/scoring'
import { normalizeRunRecord } from '@/lib/destiny/pgcrStats'
import { rankTopMetaLoadoutsByClass, rankTrendingMetaBuilds, sortExternalBuildsByConsensus } from '@/lib/destiny/metaBuildConsensus'
import { rankTopLoadoutsByClass } from '@/lib/destiny/loadoutRankings'
import { getConfiguredActiveSeason } from '@/lib/destiny/seasonConfig'
import {
  getNextSeasonDefinition,
  getSeasonDefinitionById,
  mergeSeasonWithDefinition,
  seasonDefinitionToSeason,
} from '@/lib/destiny/seasonCatalog'
import { getDestinyUserBySiteUserId, type StoredDestinyUser } from '@/lib/destiny/destinyUserStore'
import { computePendingRunActions } from '@/lib/destiny/pendingRunActions'
import { recentRunsFrom, nestLaunchMongoFilter } from '@/lib/destiny/runDates'
import type { AdminReviewDecision } from '@/lib/destiny/adminReviewDecisions'
import { logAdminActivity } from '@/lib/destiny/adminActivityLog'
import type {
  AdminReviewRecord,
  BuildIntelligenceCard,
  BuildSnapshot,
  ExternalBuildSource,
  FireteamLobby,
  LeaderboardEntry,
  MvpVote,
  OverviewPayload,
  PendingRunActions,
  PrizeClaim,
  ReputationReview,
  RunRecord,
  Season,
  TrustReview,
} from '@/lib/destiny/types'

async function db() {
  const client = await clientPromise
  return client.db(getMongoDbName())
}

let indexesPromise: Promise<void> | null = null

export async function ensureDestinyIndexes(): Promise<void> {
  if (!indexesPromise) {
    indexesPromise = ensureDestinyIndexesOnce().catch((error) => {
      indexesPromise = null
      throw error
    })
  }
  return indexesPromise
}

async function ensureDestinyIndexesOnce(): Promise<void> {
  const database = await db()
  await database.collection(DESTINY_COLLECTIONS.runRecords).createIndex({ pgcrId: 1 }, { unique: true })
  await database.collection(DESTINY_COLLECTIONS.runRecords).createIndex({ verificationStatus: 1, completedAt: -1 })
  await database.collection(DESTINY_COLLECTIONS.runRecords).createIndex({ ownerUserId: 1, completedAt: -1 })
  await database.collection(DESTINY_COLLECTIONS.runRecords).createIndex({ 'teamMembers.membershipId': 1, completedAt: -1 })
  await database.collection(DESTINY_COLLECTIONS.leaderboardEntries).createIndex({ category: 1, seasonId: 1, period: 1, rank: 1 })
  await database.collection(DESTINY_COLLECTIONS.fireteamLobbies).createIndex({ status: 1, createdAt: -1 })
  await database.collection(DESTINY_COLLECTIONS.buildSnapshots).createIndex({ runId: 1, userId: 1 }, { unique: true })
  await database.collection(DESTINY_COLLECTIONS.reputationReviews).createIndex({ reviewedUserId: 1, createdAt: -1 })
  await database.collection(DESTINY_COLLECTIONS.reputationReviews).createIndex({ reviewerId: 1, runId: 1 })
  await database.collection(DESTINY_COLLECTIONS.users).createIndex({ bungieMembershipId: 1 }, { unique: true, sparse: true })
  await database.collection(DESTINY_COLLECTIONS.seasons).createIndex({ status: 1 })
  await database.collection(DESTINY_COLLECTIONS.prizeClaims).createIndex({ userId: 1, seasonId: 1 })
  await database.collection(DESTINY_COLLECTIONS.prizeClaims).createIndex({ status: 1, createdAt: -1 })
  await database.collection(DESTINY_COLLECTIONS.trustReviews).createIndex({ reviewedUserId: 1, createdAt: -1 })
  await database.collection(DESTINY_COLLECTIONS.trustReviews).createIndex({ reviewerId: 1, runId: 1 })
  await database.collection(DESTINY_COLLECTIONS.mvpVotes).createIndex({ runId: 1, voterId: 1 }, { unique: true })
  await database.collection(DESTINY_COLLECTIONS.mvpVotes).createIndex({ selectedUserId: 1, createdAt: -1 })
  await database.collection(DESTINY_COLLECTIONS.mvpVotes).createIndex({ voterId: 1, createdAt: -1 })
  await database.collection(DESTINY_COLLECTIONS.mvpVotes).createIndex({ createdAt: -1 })
  await database.collection(DESTINY_COLLECTIONS.adminActivity).createIndex({ createdAt: -1 })
  await database.collection(DESTINY_COLLECTIONS.adminActivity).createIndex({ kind: 1, createdAt: -1 })
  await database.collection(DESTINY_COLLECTIONS.adminActivity).createIndex({ targetUserId: 1, createdAt: -1 })
  await database
    .collection(DESTINY_COLLECTIONS.leaderboardAdjustments)
    .createIndex({ category: 1, period: 1, seasonId: 1, entryKey: 1 }, { unique: true })
  await database.collection(DESTINY_COLLECTIONS.weeklyLootIcons).createIndex({ builtAt: -1 })
}

export async function loadAllMvpVotes(): Promise<MvpVote[]> {
  const database = await db()
  return (await database
    .collection(DESTINY_COLLECTIONS.mvpVotes)
    .find({})
    .sort({ createdAt: -1 })
    .limit(2000)
    .toArray()) as unknown as MvpVote[]
}

async function loadAllRuns(): Promise<RunRecord[]> {
  const database = await db()
  return (await database
    .collection(DESTINY_COLLECTIONS.runRecords)
    .find(nestLaunchMongoFilter())
    .sort({ completedAt: -1 })
    .limit(500)
    .toArray()) as unknown as RunRecord[]
}

export async function loadUsersMap(): Promise<Map<string, StoredDestinyUser>> {
  const database = await db()
  const rows = (await database.collection(DESTINY_COLLECTIONS.users).find({}).toArray()) as unknown as StoredDestinyUser[]
  return new Map(rows.map((u) => [u.userId, u]))
}

export async function getSeasonStandingsInput(): Promise<{
  runs: RunRecord[]
  usersById: Map<string, StoredDestinyUser>
  votes: MvpVote[]
}> {
  await ensureDestinyIndexes()
  const [runs, usersById, votes] = await Promise.all([loadAllRuns(), loadUsersMap(), loadAllMvpVotes()])
  return { runs, usersById, votes }
}

export async function getSeasonStandingForUser(userId: string): Promise<LeaderboardEntry[]> {
  try {
    const season = await getSeasonData()
    const [runs, usersById, votes] = await Promise.all([loadAllRuns(), loadUsersMap(), loadAllMvpVotes()])
    const user = usersById.get(userId)
    const individual = (
      await Promise.all([
        buildLeaderboardWithAdjustments('raid', 'season', season, runs, usersById, votes),
        buildLeaderboardWithAdjustments('dungeon', 'season', season, runs, usersById, votes),
        buildLeaderboardWithAdjustments('top_guardians', 'season', season, runs, usersById, votes),
      ])
    )
      .flat()
      .filter((entry) => entry.userId === userId)

    const pantheon =
      user?.bungieMembershipId != null
        ? (
            await buildLeaderboardWithAdjustments('pantheon', 'season', season, runs, usersById, votes)
          ).filter((entry) => squadKeyIncludesMember(entry.userId, user.bungieMembershipId))
        : []
    return [...individual, ...pantheon]
  } catch {
    return []
  }
}

export async function getRunsForUser(userId: string, limit = 25): Promise<RunRecord[]> {
  try {
    await ensureDestinyIndexes()
    const database = await db()
    const rows = (await database
      .collection(DESTINY_COLLECTIONS.runRecords)
      .find({ ownerUserId: userId, ...nestLaunchMongoFilter() })
      .sort({ completedAt: -1 })
      .limit(limit)
      .toArray()) as unknown as RunRecord[]
    return rows.map(normalizeRunRecord)
  } catch {
    return []
  }
}

export async function getRunsForParticipant(
  userId: string,
  membershipId: string | undefined,
  limit = 25
): Promise<RunRecord[]> {
  try {
    await ensureDestinyIndexes()
    const database = await db()
    const or: Record<string, unknown>[] = [{ ownerUserId: userId }]
    if (membershipId) {
      or.push({ 'teamMembers.membershipId': membershipId })
    }
    const rows = (await database
      .collection(DESTINY_COLLECTIONS.runRecords)
      .find({ $or: or, ...nestLaunchMongoFilter() })
      .sort({ completedAt: -1 })
      .limit(limit)
      .toArray()) as unknown as RunRecord[]
    return rows.map(normalizeRunRecord)
  } catch {
    return getRunsForUser(userId, limit)
  }
}

async function attachReputationScores(entries: LeaderboardEntry[]): Promise<LeaderboardEntry[]> {
  return Promise.all(
    entries.map(async (entry) => {
      const reviews = await getReputationReviewsForUser(entry.userId)
      const score = computeReputationScore(reviews)
      return {
        ...entry,
        reputationScore: score > 0 ? score : undefined,
        reputationReviewCount: reviews.length || undefined,
      }
    })
  )
}

export async function getOverviewData(): Promise<OverviewPayload> {
  await ensureDestinyIndexes()
  const season = await getSeasonData()
  const [runs, usersById, lobbies, externalBuilds, votes, verifiedBuilds] = await Promise.all([
    loadAllRuns(),
    loadUsersMap(),
    getFireteamLobbies(),
    getExternalBuildSources(),
    loadAllMvpVotes(),
    getBuildIntelligenceCards(),
  ])

  const recentRuns = recentRunsFrom(runs, 10)
  const raidTop10 = await attachReputationScores(
    await buildLeaderboardWithAdjustments('raid', 'season', season, runs, usersById, votes)
  )
  const dungeonTop10 = await attachReputationScores(
    await buildLeaderboardWithAdjustments('dungeon', 'season', season, runs, usersById, votes)
  )
  const pantheonTop10 = await attachReputationScores(
    await buildLeaderboardWithAdjustments('pantheon', 'season', season, runs, usersById, votes)
  )
  const guardiansTop3 = (
    await buildLeaderboardWithAdjustments('top_guardians', 'monthly', season, runs, usersById, votes)
  ).slice(0, 3)
  const topLoadoutsByClass = rankTopMetaLoadoutsByClass(externalBuilds, 2)
  const topVerifiedLoadoutsByClass = rankTopLoadoutsByClass(verifiedBuilds, 2)
  const { hallOfFame } = await computeSeasonStandings(runs, usersById, season, votes)

  return buildOverviewPayload({
    raidTop10,
    dungeonTop10,
    pantheonTop10,
    guardiansTop3,
    recentRuns,
    lookingForGroup: lobbies,
    trendingBuilds: rankTrendingMetaBuilds(externalBuilds, 3),
    topLoadoutsByClass,
    topVerifiedLoadoutsByClass,
    hallOfFamePreview: hallOfFame.slice(0, 9),
    season,
  })
}

export async function getPendingRunActionsForUser(userId: string): Promise<PendingRunActions | null> {
  try {
    await ensureDestinyIndexes()
    const stored = await getDestinyUserBySiteUserId(userId)
    if (!stored?.bungieMembershipId) return null

    const [runs, usersById, mvpVotes, trustReviews] = await Promise.all([
      getRunsForParticipant(userId, stored.bungieMembershipId, 50),
      loadUsersMap(),
      getMvpVotesByReviewer(userId),
      getTrustReviewsByReviewer(userId),
    ])

    return computePendingRunActions(
      userId,
      stored.bungieMembershipId,
      runs,
      Array.from(usersById.values()),
      mvpVotes,
      trustReviews
    )
  } catch {
    return null
  }
}

export async function getLeaderboardEntries(
  category: LeaderboardEntry['category'],
  period: LeaderboardEntry['period']
): Promise<LeaderboardEntry[]> {
  try {
    await ensureDestinyIndexes()
    const season = await getSeasonData()
    const [runs, usersById, votes] = await Promise.all([loadAllRuns(), loadUsersMap(), loadAllMvpVotes()])
    const entries = await buildLeaderboardWithAdjustments(category, period, season, runs, usersById, votes)
    return attachReputationScores(entries)
  } catch {
    return []
  }
}

export async function getFireteamLobbies(): Promise<FireteamLobby[]> {
  try {
    const database = await db()
    const rows = await database
      .collection(DESTINY_COLLECTIONS.fireteamLobbies)
      .find({ status: { $in: ['open', 'full'] } })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray()
    return rows as unknown as FireteamLobby[]
  } catch {
    return []
  }
}

export async function getSeasonData(): Promise<Season> {
  const configured = getConfiguredActiveSeason()
  try {
    await ensureDestinyIndexes()
    const database = await db()
    const def = getSeasonDefinitionById(configured.id)
    const dbConfigured = await database
      .collection(DESTINY_COLLECTIONS.seasons)
      .findOne({ id: configured.id })
    const dbActive = await database.collection(DESTINY_COLLECTIONS.seasons).findOne({ status: 'active' })

    if (dbConfigured?.status === 'archived') {
      return def
        ? mergeSeasonWithDefinition(dbConfigured as unknown as Season, def)
        : (dbConfigured as unknown as Season)
    }

    if (configured.status === 'active') {
      if (dbActive && dbActive.id !== configured.id) {
        await database.collection(DESTINY_COLLECTIONS.seasons).updateOne(
          { id: dbActive.id },
          { $set: { status: 'archived', updatedAt: new Date().toISOString() } }
        )
      }
      const merged = dbConfigured && def
        ? mergeSeasonWithDefinition(dbConfigured as unknown as Season, def)
        : configured
      const active: Season = { ...merged, status: 'active' }
      await database.collection(DESTINY_COLLECTIONS.seasons).updateOne(
        { id: active.id },
        { $set: { ...active, updatedAt: new Date().toISOString() } },
        { upsert: true }
      )
      return active
    }

    const resolved = dbConfigured && def
      ? mergeSeasonWithDefinition(
          { ...configured, ...(dbConfigured as unknown as Season) },
          def
        )
      : configured

    await database.collection(DESTINY_COLLECTIONS.seasons).updateOne(
      { id: resolved.id },
      { $set: { ...resolved, updatedAt: new Date().toISOString() } },
      { upsert: true }
    )
    return resolved
  } catch {
    return configured
  }
}

export async function saveSeasonData(season: Season): Promise<void> {
  const database = await db()
  await database.collection(DESTINY_COLLECTIONS.seasons).updateOne(
    { id: season.id },
    { $set: { ...season, updatedAt: new Date().toISOString() } },
    { upsert: true }
  )
}

export async function finalizeActiveSeason(): Promise<Season> {
  const season = await getSeasonData()
  const { runs, usersById, votes } = await getSeasonStandingsInput()
  const { hallOfFame } = await computeSeasonStandings(runs, usersById, season, votes)

  const archived: Season = {
    ...season,
    status: 'archived',
    winners: hallOfFame,
    endDate: new Date().toISOString(),
  }

  await saveSeasonData(archived)

  const nextDef = getNextSeasonDefinition(season.id)
  if (nextDef) {
    const next = seasonDefinitionToSeason(nextDef, 'active')
    await saveSeasonData(next)
    return next
  }

  return archived
}

export async function getPrizeClaimsForUser(userId: string, seasonId: string): Promise<PrizeClaim[]> {
  try {
    const database = await db()
    const rows = await database
      .collection(DESTINY_COLLECTIONS.prizeClaims)
      .find({ userId, seasonId })
      .sort({ createdAt: -1 })
      .toArray()
    return rows as unknown as PrizeClaim[]
  } catch {
    return []
  }
}

export async function getPendingPrizeClaims(): Promise<PrizeClaim[]> {
  try {
    const database = await db()
    const rows = await database
      .collection(DESTINY_COLLECTIONS.prizeClaims)
      .find({ status: 'pending' })
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray()
    return rows as unknown as PrizeClaim[]
  } catch {
    return []
  }
}

export async function savePrizeClaim(claim: PrizeClaim): Promise<void> {
  const database = await db()
  await database.collection(DESTINY_COLLECTIONS.prizeClaims).updateOne(
    { id: claim.id },
    { $set: { ...claim, updatedAt: new Date().toISOString() } },
    { upsert: true }
  )
}

export async function updatePrizeClaimStatus(
  claimId: string,
  status: PrizeClaim['status'],
  adminNotes?: string
): Promise<boolean> {
  const database = await db()
  const result = await database.collection(DESTINY_COLLECTIONS.prizeClaims).updateOne(
    { id: claimId },
    { $set: { status, adminNotes, updatedAt: new Date().toISOString() } }
  )
  return result.matchedCount > 0
}

export async function getAdminReviewQueue(): Promise<AdminReviewRecord[]> {
  try {
    const database = await db()
    const rows = await database
      .collection(DESTINY_COLLECTIONS.adminReviews)
      .find({ status: 'pending' })
      .sort({ suspiciousScore: -1 })
      .limit(50)
      .toArray()
    return rows.map((row) => {
      const review = row as unknown as AdminReviewRecord
      return review.run ? { ...review, run: normalizeRunRecord(review.run) } : review
    })
  } catch {
    return []
  }
}

export interface AdminRunsListQuery {
  status?: RunRecord['verificationStatus'] | 'all'
  activityType?: RunRecord['type'] | 'all'
  q?: string
  limit?: number
  offset?: number
}

export async function getAdminRunsList(query: AdminRunsListQuery = {}): Promise<{
  runs: RunRecord[]
  total: number
}> {
  try {
    await ensureDestinyIndexes()
    const database = await db()
    const limit = Math.min(Math.max(query.limit ?? 40, 1), 100)
    const offset = Math.max(query.offset ?? 0, 0)
    const filter: Record<string, unknown> = { ...nestLaunchMongoFilter() }

    if (query.status && query.status !== 'all') {
      filter.verificationStatus = query.status
    }
    if (query.activityType && query.activityType !== 'all') {
      filter.type = query.activityType
    }
    if (query.q?.trim()) {
      const regex = new RegExp(query.q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      filter.$or = [
        { activityName: regex },
        { ownerDisplayName: regex },
        { ownerUserId: regex },
        { pgcrId: regex },
        { 'teamMembers.displayName': regex },
      ]
    }

    const collection = database.collection(DESTINY_COLLECTIONS.runRecords)
    const [runs, total] = await Promise.all([
      collection.find(filter).sort({ completedAt: -1 }).skip(offset).limit(limit).toArray(),
      collection.countDocuments(filter),
    ])

    return { runs: (runs as unknown as RunRecord[]).map(normalizeRunRecord), total }
  } catch {
    return { runs: [], total: 0 }
  }
}

async function applyAdminRunDecision(
  run: RunRecord,
  decision: AdminReviewDecision,
  adminId: string,
  notes: string | undefined,
  reviewId: string,
  suspiciousScore: number
): Promise<void> {
  const database = await db()
  const now = new Date().toISOString()

  const reviewStatus =
    decision === 'reject'
      ? 'rejected'
      : decision === 'approve' || decision === 'checkpoint_non_scoring'
        ? 'approved'
        : 'rejected'

  await database.collection(DESTINY_COLLECTIONS.adminReviews).updateOne(
    { id: reviewId },
    {
      $set: {
        id: reviewId,
        runId: run.id,
        suspiciousScore,
        aiSummary: run.aiReview?.summary ?? 'Manual staff review',
        status: reviewStatus,
        decision,
        notes,
        adminId,
        reviewedAt: now,
        run,
        updatedAt: now,
      },
    },
    { upsert: true }
  )

  const verificationStatus =
    decision === 'reject'
      ? 'rejected'
      : decision === 'approve' || decision === 'checkpoint_non_scoring'
        ? 'verified'
        : 'rejected'

  let pointsUpdate: number | undefined
  if (decision === 'checkpoint_non_scoring') {
    pointsUpdate = 0
  } else if (decision === 'approve') {
    pointsUpdate = calculateRunPoints({
      activityType: run.type,
      clanMemberCount: run.clanMemberCount,
      randoCount: run.randoCount,
      isFullClanTeam: run.isFullClanTeam,
      completed: run.completed,
      checkpointLikely: false,
      verificationStatus: 'verified',
      suspiciousScore: 0,
    }).points
  }

  await database.collection(DESTINY_COLLECTIONS.runRecords).updateOne(
    { id: run.id },
    {
      $set: {
        verificationStatus,
        ...(pointsUpdate !== undefined ? { pointsAwarded: pointsUpdate } : {}),
        adminNotes: notes,
        updatedAt: now,
      },
    }
  )

  await database.collection(DESTINY_COLLECTIONS.buildSnapshots).updateMany(
    { runId: run.id },
    { $set: { verificationStatus, updatedAt: now } }
  )

  await logAdminActivity({
    kind: 'run_review',
    actorId: adminId,
    targetUserId: run.ownerUserId,
    targetLabel: run.ownerDisplayName,
    summary: `Run ${decision.replace(/_/g, ' ')} — ${run.activityName ?? run.id}`,
    detail: notes,
    metadata: {
      decision,
      reviewId,
      suspiciousScore,
    },
  })
}

export async function resolveRunAdminDecision(
  runId: string,
  decision: AdminReviewDecision,
  adminId: string,
  notes?: string
): Promise<boolean> {
  const run = await getRunRecordById(runId)
  if (!run) return false

  await applyAdminRunDecision(
    run,
    decision,
    adminId,
    notes,
    `review-${runId}`,
    run.suspiciousScore ?? 0
  )
  return true
}

export async function getBuildIntelligenceCards(): Promise<BuildIntelligenceCard[]> {
  try {
    await ensureDestinyIndexes()
    const database = await db()
    const [rows, runs] = await Promise.all([
      database
        .collection(DESTINY_COLLECTIONS.buildSnapshots)
        .find({})
        .sort({ completedAt: -1 })
        .limit(500)
        .toArray(),
      loadAllRuns(),
    ])
    const snapshots = rows as unknown as BuildSnapshot[]
    return aggregateBuildIntelligence(snapshots, verifiedRunIdSet(runs))
  } catch {
    return []
  }
}

export async function saveBuildSnapshot(snapshot: BuildSnapshot): Promise<void> {
  const database = await db()
  await database.collection(DESTINY_COLLECTIONS.buildSnapshots).updateOne(
    { runId: snapshot.runId, userId: snapshot.userId },
    { $set: { ...snapshot, updatedAt: new Date().toISOString() } },
    { upsert: true }
  )
}

export async function getReputationReviewsForUser(userId: string): Promise<ReputationReview[]> {
  try {
    const database = await db()
    const rows = await database
      .collection(DESTINY_COLLECTIONS.reputationReviews)
      .find({ reviewedUserId: userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray()
    return rows as unknown as ReputationReview[]
  } catch {
    return []
  }
}

export async function getReputationReviewsByReviewer(reviewerId: string): Promise<ReputationReview[]> {
  try {
    const database = await db()
    const rows = await database
      .collection(DESTINY_COLLECTIONS.reputationReviews)
      .find({ reviewerId })
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray()
    return rows as unknown as ReputationReview[]
  } catch {
    return []
  }
}

export async function findReputationReview(
  reviewerId: string,
  reviewedUserId: string,
  runId?: string
): Promise<ReputationReview | null> {
  try {
    const database = await db()
    const query: Record<string, string> = { reviewerId, reviewedUserId }
    if (runId) query.runId = runId
    const row = await database.collection(DESTINY_COLLECTIONS.reputationReviews).findOne(query)
    return row as ReputationReview | null
  } catch {
    return null
  }
}

export async function saveReputationReview(review: ReputationReview): Promise<void> {
  const database = await db()
  await database.collection(DESTINY_COLLECTIONS.reputationReviews).updateOne(
    { id: review.id },
    { $set: { ...review, updatedAt: new Date().toISOString() } },
    { upsert: true }
  )
}

export async function getTrustReviewsForUser(
  userId: string,
  membershipId?: string
): Promise<TrustReview[]> {
  try {
    const database = await db()
    const filter = membershipId
      ? { $or: [{ reviewedUserId: userId }, { reviewedMembershipId: membershipId }] }
      : { reviewedUserId: userId }
    const rows = await database
      .collection(DESTINY_COLLECTIONS.trustReviews)
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray()
    return rows as unknown as TrustReview[]
  } catch {
    return []
  }
}

export async function getTrustReviewsByReviewer(reviewerId: string): Promise<TrustReview[]> {
  try {
    const database = await db()
    const rows = await database
      .collection(DESTINY_COLLECTIONS.trustReviews)
      .find({ reviewerId })
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray()
    return rows as unknown as TrustReview[]
  } catch {
    return []
  }
}

export async function findTrustReview(
  reviewerId: string,
  runId: string,
  reviewedMembershipId: string
): Promise<TrustReview | null> {
  try {
    const database = await db()
    const row = await database.collection(DESTINY_COLLECTIONS.trustReviews).findOne({
      reviewerId,
      runId,
      reviewedMembershipId,
    })
    return row as TrustReview | null
  } catch {
    return null
  }
}

export async function saveTrustReview(review: TrustReview): Promise<void> {
  const database = await db()
  await database.collection(DESTINY_COLLECTIONS.trustReviews).updateOne(
    { id: review.id },
    { $set: review },
    { upsert: true }
  )
}

export async function getMvpVotesByReviewer(reviewerId: string): Promise<MvpVote[]> {
  try {
    const database = await db()
    const rows = await database
      .collection(DESTINY_COLLECTIONS.mvpVotes)
      .find({ voterId: reviewerId })
      .sort({ createdAt: -1 })
      .limit(200)
      .toArray()
    return rows as unknown as MvpVote[]
  } catch {
    return []
  }
}

export async function findMvpVote(reviewerId: string, runId: string): Promise<MvpVote | null> {
  try {
    const database = await db()
    const row = await database.collection(DESTINY_COLLECTIONS.mvpVotes).findOne({ voterId: reviewerId, runId })
    return row as MvpVote | null
  } catch {
    return null
  }
}

export async function saveMvpVote(vote: MvpVote): Promise<void> {
  const database = await db()
  await database.collection(DESTINY_COLLECTIONS.mvpVotes).updateOne(
    { id: vote.id },
    { $set: vote },
    { upsert: true }
  )
}

export async function getExternalBuildSources(): Promise<ExternalBuildSource[]> {
  const state = getWeeklyResetState()
  const featuredActivities = [
    ...state.featuredRaids.map((r) => r.name),
    ...state.featuredDungeons.map((d) => d.name),
  ]

  try {
    await ensureWeeklyMetaBuildSync(state.weekStart, state.resetAt, featuredActivities)
  } catch (error) {
    console.warn('[metaBuildWeeklySync] ensure failed:', error)
  }

  const researched = getResearchedMetaBuilds()
  try {
    await ensureDestinyIndexes()
    const database = await db()

    for (const build of researched) {
      await database.collection(DESTINY_COLLECTIONS.externalBuildSources).updateOne(
        { id: build.id },
        { $set: { ...build, updatedAt: new Date().toISOString() } },
        { upsert: true }
      )
    }

    const rows = await database
      .collection(DESTINY_COLLECTIONS.externalBuildSources)
      .find({ approved: true })
      .sort({ lastChecked: -1 })
      .limit(40)
      .toArray()

    const byId = new Map<string, ExternalBuildSource>()
    for (const build of researched) byId.set(build.id, build)
    for (const row of rows as unknown as ExternalBuildSource[]) {
      if (!byId.has(row.id)) byId.set(row.id, row)
    }

    return sortExternalBuildsByConsensus(
      Array.from(byId.values()).filter((build) => isValidMetaBuild(build) || build.id.startsWith('weekly-'))
    )
  } catch {
    return sortExternalBuildsByConsensus(researched.filter(isValidMetaBuild))
  }
}

export async function getMetaResearchMeta() {
  const state = getWeeklyResetState()
  const weeklySync = await getMetaBuildWeeklySyncStatus(state.weekStart)
  return {
    researchedAt: META_BUILD_RESEARCH_DATE,
    sources: META_RESEARCH_SOURCES,
    windowWeeks: 4,
    weeklySync,
    weekLabel: state.weekLabel,
  }
}

export async function saveRunRecord(record: RunRecord): Promise<void> {
  const database = await db()
  await database.collection(DESTINY_COLLECTIONS.runRecords).updateOne(
    { id: record.id },
    { $set: { ...record, updatedAt: new Date().toISOString() } },
    { upsert: true }
  )
}

export async function getRunRecordById(id: string): Promise<RunRecord | null> {
  try {
    const database = await db()
    const doc = await database.collection(DESTINY_COLLECTIONS.runRecords).findOne({ id })
    return doc ? (doc as unknown as RunRecord) : null
  } catch {
    return null
  }
}

export async function getAdminReviewByRunId(runId: string): Promise<AdminReviewRecord | null> {
  try {
    const database = await db()
    const doc = await database
      .collection(DESTINY_COLLECTIONS.adminReviews)
      .findOne({ runId })
    return doc ? (doc as unknown as AdminReviewRecord) : null
  } catch {
    return null
  }
}

export async function runRecordExists(id: string): Promise<boolean> {
  try {
    const database = await db()
    const doc = await database
      .collection(DESTINY_COLLECTIONS.runRecords)
      .findOne({ id }, { projection: { _id: 1 } })
    return doc != null
  } catch {
    return false
  }
}

export async function queueAdminReview(record: AdminReviewRecord): Promise<void> {
  const database = await db()
  const existing = (await database
    .collection(DESTINY_COLLECTIONS.adminReviews)
    .findOne({ id: record.id })) as AdminReviewRecord | null

  const terminalReview =
    existing?.status === 'approved' || existing?.status === 'rejected'

  const payload: AdminReviewRecord = terminalReview
    ? {
        ...record,
        status: existing!.status,
        decision: existing!.decision,
        notes: existing!.notes,
        adminId: existing!.adminId,
        reviewedAt: existing!.reviewedAt,
      }
    : record

  await database.collection(DESTINY_COLLECTIONS.adminReviews).updateOne(
    { id: record.id },
    { $set: { ...payload, updatedAt: new Date().toISOString() } },
    { upsert: true }
  )

  if (record.status === 'pending' && existing?.status !== 'pending' && !terminalReview) {
    await logAdminActivity({
      kind: 'run_flagged',
      actorId: 'system',
      targetUserId: record.run?.ownerUserId,
      targetLabel: record.run?.ownerDisplayName,
      summary: `Run flagged — ${record.run?.activityName ?? record.runId}`,
      detail: record.aiSummary,
      metadata: {
        suspiciousScore: record.suspiciousScore,
        runId: record.runId,
      },
    })
  }
}

export async function resolveAdminReview(
  reviewId: string,
  decision: AdminReviewDecision,
  adminId: string,
  notes?: string
): Promise<boolean> {
  const database = await db()
  const review = (await database
    .collection(DESTINY_COLLECTIONS.adminReviews)
    .findOne({ id: reviewId })) as AdminReviewRecord | null

  if (!review?.runId) return false

  const run = review.run ?? (await getRunRecordById(review.runId))
  if (!run) return false

  await applyAdminRunDecision(
    run,
    decision,
    adminId,
    notes,
    reviewId,
    review.suspiciousScore ?? run.suspiciousScore ?? 0
  )
  return true
}
