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
import {
  aggregateGuardianLeaderboard,
  aggregateLeaderboard,
  aggregatePantheonSquadLeaderboard,
} from '@/lib/destiny/leaderboards'
import { squadKeyIncludesMember } from '@/lib/destiny/pantheonActivities'
import {
  getResearchedMetaBuilds,
  META_BUILD_RESEARCH_DATE,
  META_RESEARCH_SOURCES,
} from '@/lib/destiny/externalMetaResearch'
import { aggregateBuildIntelligence, verifiedRunIdSet } from '@/lib/destiny/buildIntelligence'
import { rankTopLoadoutsByClass } from '@/lib/destiny/loadoutRankings'
import { ACTIVE_SEASON } from '@/lib/destiny/seasonConfig'
import { getDestinyUserBySiteUserId, type StoredDestinyUser } from '@/lib/destiny/destinyUserStore'
import { computePendingRunActions } from '@/lib/destiny/pendingRunActions'
import { filterRunsFromTodayPacific } from '@/lib/destiny/runDates'
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

export async function ensureDestinyIndexes(): Promise<void> {
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
    .find({})
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
    const individual = [
      ...aggregateLeaderboard(runs, usersById, 'raid', 'season', season),
      ...aggregateLeaderboard(runs, usersById, 'dungeon', 'season', season),
      ...aggregateGuardianLeaderboard(votes, usersById, 'season', season),
    ].filter((entry) => entry.userId === userId)
    const pantheon =
      user?.bungieMembershipId != null
        ? aggregatePantheonSquadLeaderboard(runs, usersById, 'season', season).filter((entry) =>
            squadKeyIncludesMember(entry.userId, user.bungieMembershipId)
          )
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
    return (await database
      .collection(DESTINY_COLLECTIONS.runRecords)
      .find({ ownerUserId: userId })
      .sort({ completedAt: -1 })
      .limit(limit)
      .toArray()) as unknown as RunRecord[]
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
    return (await database
      .collection(DESTINY_COLLECTIONS.runRecords)
      .find({ $or: or })
      .sort({ completedAt: -1 })
      .limit(limit)
      .toArray()) as unknown as RunRecord[]
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
  try {
    await ensureDestinyIndexes()
    const season = await getSeasonData()
    const [runs, usersById, lobbies, buildCards, votes] = await Promise.all([
      loadAllRuns(),
      loadUsersMap(),
      getFireteamLobbies(),
      getBuildIntelligenceCards(),
      loadAllMvpVotes(),
    ])

    const recentRuns = filterRunsFromTodayPacific(runs).slice(0, 10)
    const raidTop10 = await attachReputationScores(
      aggregateLeaderboard(runs, usersById, 'raid', 'season', season)
    )
    const dungeonTop10 = await attachReputationScores(
      aggregateLeaderboard(runs, usersById, 'dungeon', 'season', season)
    )
    const pantheonTop10 = await attachReputationScores(
      aggregatePantheonSquadLeaderboard(runs, usersById, 'season', season)
    )
    const guardiansTop3 = aggregateGuardianLeaderboard(votes, usersById, 'monthly', season, 3)
    const topLoadoutsByClass = rankTopLoadoutsByClass(buildCards, 2)
    const { hallOfFame } = computeSeasonStandings(runs, usersById, season, votes)

    return buildOverviewPayload({
      raidTop10,
      dungeonTop10,
      pantheonTop10,
      guardiansTop3,
      recentRuns,
      lookingForGroup: lobbies,
      trendingBuilds: buildCards.slice(0, 3),
      topLoadoutsByClass,
      hallOfFamePreview: hallOfFame.slice(0, 9),
      season,
    })
  } catch {
    const emptyLoadouts = rankTopLoadoutsByClass([], 2)
    return buildOverviewPayload({
      raidTop10: [],
      dungeonTop10: [],
      pantheonTop10: [],
      guardiansTop3: [],
      recentRuns: [],
      lookingForGroup: [],
      trendingBuilds: [],
      topLoadoutsByClass: emptyLoadouts,
      hallOfFamePreview: [],
    })
  }
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
    const entries =
      category === 'top_guardians'
        ? aggregateGuardianLeaderboard(votes, usersById, period, season)
        : category === 'pantheon'
          ? aggregatePantheonSquadLeaderboard(runs, usersById, period, season)
          : aggregateLeaderboard(runs, usersById, category, period, season)
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
      .find({ status: 'open' })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray()
    return rows as unknown as FireteamLobby[]
  } catch {
    return []
  }
}

export async function getSeasonData(): Promise<Season> {
  try {
    await ensureDestinyIndexes()
    const database = await db()
    const active = await database.collection(DESTINY_COLLECTIONS.seasons).findOne({ status: 'active' })
    if (active) return active as unknown as Season

    const latest = await database
      .collection(DESTINY_COLLECTIONS.seasons)
      .findOne({}, { sort: { endDate: -1 } })
    if (latest) return latest as unknown as Season

    await database.collection(DESTINY_COLLECTIONS.seasons).updateOne(
      { id: ACTIVE_SEASON.id },
      { $set: { ...ACTIVE_SEASON, updatedAt: new Date().toISOString() } },
      { upsert: true }
    )
    return ACTIVE_SEASON
  } catch {
    return ACTIVE_SEASON
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
  const { hallOfFame } = computeSeasonStandings(runs, usersById, season, votes)

  const archived: Season = {
    ...season,
    status: 'archived',
    winners: hallOfFame,
    endDate: new Date().toISOString(),
  }

  await saveSeasonData(archived)
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
    return rows as unknown as AdminReviewRecord[]
  } catch {
    return []
  }
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

export async function getTrustReviewsForUser(userId: string): Promise<TrustReview[]> {
  try {
    const database = await db()
    const rows = await database
      .collection(DESTINY_COLLECTIONS.trustReviews)
      .find({ reviewedUserId: userId })
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
  reviewedUserId: string,
  runId: string
): Promise<TrustReview | null> {
  try {
    const database = await db()
    const row = await database.collection(DESTINY_COLLECTIONS.trustReviews).findOne({
      reviewerId,
      reviewedUserId,
      runId,
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

    return Array.from(byId.values()).sort(
      (a, b) => Date.parse(b.lastChecked) - Date.parse(a.lastChecked)
    )
  } catch {
    return researched
  }
}

export function getMetaResearchMeta() {
  return {
    researchedAt: META_BUILD_RESEARCH_DATE,
    sources: META_RESEARCH_SOURCES,
    windowWeeks: 4,
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

export async function queueAdminReview(record: AdminReviewRecord): Promise<void> {
  const database = await db()
  await database.collection(DESTINY_COLLECTIONS.adminReviews).updateOne(
    { id: record.id },
    { $set: { ...record, updatedAt: new Date().toISOString() } },
    { upsert: true }
  )
}

export async function resolveAdminReview(
  reviewId: string,
  decision: string,
  adminId: string,
  notes?: string
): Promise<boolean> {
  const database = await db()
  const now = new Date().toISOString()
  const review = (await database
    .collection(DESTINY_COLLECTIONS.adminReviews)
    .findOne({ id: reviewId })) as AdminReviewRecord | null

  if (!review) return false

  const status =
    decision === 'approve' ? 'approved' : decision === 'reject' ? 'rejected' : 'approved'

  await database.collection(DESTINY_COLLECTIONS.adminReviews).updateOne(
    { id: reviewId },
    {
      $set: {
        status,
        decision,
        notes,
        adminId,
        reviewedAt: now,
        updatedAt: now,
      },
    }
  )

  if (review.runId) {
    const verificationStatus =
      decision === 'approve'
        ? 'verified'
        : decision === 'reject'
          ? 'rejected'
          : 'verified'

    const pointsUpdate =
      decision === 'approve' && review.run
        ? review.run.pointsAwarded
        : decision === 'checkpoint_non_scoring'
          ? 0
          : undefined

    await database.collection(DESTINY_COLLECTIONS.runRecords).updateOne(
      { id: review.runId },
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
      { runId: review.runId },
      { $set: { verificationStatus, updatedAt: now } }
    )
  }

  return true
}
