import clientPromise from '@/lib/mongodb'
import { getMongoDbName } from '@/lib/database'
import { isUserBanned, listBannedUsers, normalizeBanUsername } from '@/lib/bannedUsers'
import { DESTINY_COLLECTIONS } from '@/lib/destiny/collections'
import { getAdminNotesForUser } from '@/lib/destiny/adminActivityLog'
import type { StoredDestinyUser } from '@/lib/destiny/destinyUserStore'
import {
  getReputationReviewsForUser,
  getRunsForUser,
  getTrustReviewsForUser,
} from '@/lib/destiny/store'
import type { AdminUserDetail, AdminUserSummary } from '@/lib/destiny/types'

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

async function db() {
  const client = await clientPromise
  return client.db(getMongoDbName())
}

async function siteRoleForUser(userId: string): Promise<string | undefined> {
  const row = await (await db()).collection('users').findOne({ username: userId.toLowerCase() })
  return typeof row?.role === 'string' ? row.role : undefined
}

async function runCountsForUser(userId: string): Promise<{ verified: number; flagged: number }> {
  const database = await db()
  const [verified, flagged] = await Promise.all([
    database.collection(DESTINY_COLLECTIONS.runRecords).countDocuments({
      ownerUserId: userId,
      verificationStatus: 'verified',
    }),
    database.collection(DESTINY_COLLECTIONS.runRecords).countDocuments({
      ownerUserId: userId,
      verificationStatus: 'flagged',
    }),
  ])
  return { verified, flagged }
}

async function mvpVotesReceivedCount(userId: string): Promise<number> {
  return (await db()).collection(DESTINY_COLLECTIONS.mvpVotes).countDocuments({
    selectedUserId: userId,
  })
}

function toSummary(
  user: StoredDestinyUser,
  extras: { isBanned: boolean; siteRole?: string; verifiedRunCount: number; flaggedRunCount: number }
): AdminUserSummary {
  return {
    userId: user.userId,
    bungieDisplayName: user.bungieDisplayName,
    platform: user.platform,
    clanTag: user.clanTag,
    connectedAt: user.connectedAt,
    isBanned: extras.isBanned,
    siteRole: extras.siteRole,
    verifiedRunCount: extras.verifiedRunCount,
    flaggedRunCount: extras.flaggedRunCount,
  }
}

export async function searchAdminUsers(query: string, limit = 20): Promise<AdminUserSummary[]> {
  const trimmed = query.trim()
  if (!trimmed) return listRecentAdminUsers(limit)

  const database = await db()
  const pattern = escapeRegex(trimmed)
  const rows = (await database
    .collection(DESTINY_COLLECTIONS.users)
    .find({
      $or: [
        { userId: { $regex: pattern, $options: 'i' } },
        { bungieDisplayName: { $regex: pattern, $options: 'i' } },
        { bungieMembershipId: { $regex: pattern, $options: 'i' } },
      ],
    })
    .sort({ connectedAt: -1 })
    .limit(limit)
    .toArray()) as unknown as StoredDestinyUser[]

  return Promise.all(
    rows.map(async (user) => {
      const [isBanned, siteRole, counts] = await Promise.all([
        isUserBanned(user.userId),
        siteRoleForUser(user.userId),
        runCountsForUser(user.userId),
      ])
      return toSummary(user, {
        isBanned,
        siteRole,
        verifiedRunCount: counts.verified,
        flaggedRunCount: counts.flagged,
      })
    })
  )
}

export async function listRecentAdminUsers(limit = 20): Promise<AdminUserSummary[]> {
  const database = await db()
  const rows = (await database
    .collection(DESTINY_COLLECTIONS.users)
    .find({})
    .sort({ connectedAt: -1 })
    .limit(limit)
    .toArray()) as unknown as StoredDestinyUser[]

  return Promise.all(
    rows.map(async (user) => {
      const [isBanned, siteRole, counts] = await Promise.all([
        isUserBanned(user.userId),
        siteRoleForUser(user.userId),
        runCountsForUser(user.userId),
      ])
      return toSummary(user, {
        isBanned,
        siteRole,
        verifiedRunCount: counts.verified,
        flaggedRunCount: counts.flagged,
      })
    })
  )
}

export async function getAdminUserDetail(userId: string): Promise<AdminUserDetail | null> {
  const normalized = normalizeBanUsername(userId)
  const database = await db()
  const user = (await database
    .collection(DESTINY_COLLECTIONS.users)
    .findOne({ userId: normalized })) as StoredDestinyUser | null

  if (!user) return null

  const [isBanned, siteRole, counts, recentRuns, reputationReviews, trustReviews, mvpVotesReceived, adminNotes] =
    await Promise.all([
      isUserBanned(normalized),
      siteRoleForUser(normalized),
      runCountsForUser(normalized),
      getRunsForUser(normalized, 15),
      getReputationReviewsForUser(normalized),
      getTrustReviewsForUser(normalized),
      mvpVotesReceivedCount(normalized),
      getAdminNotesForUser(normalized),
    ])

  return {
    ...toSummary(user, {
      isBanned,
      siteRole,
      verifiedRunCount: counts.verified,
      flaggedRunCount: counts.flagged,
    }),
    bungieMembershipId: user.bungieMembershipId,
    emblemUrl: user.emblemUrl,
    powerLevel: user.powerLevel,
    recentRuns,
    reputationReviews: reputationReviews.slice(0, 10),
    trustReviews: trustReviews.slice(0, 10),
    mvpVotesReceived,
    adminNotes,
  }
}

export { listBannedUsers }
