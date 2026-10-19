import clientPromise from '@/lib/mongodb'
import { getMongoDbName } from '@/lib/database'
import { getAccountHistoricalStats, getPlayerProfile, getRaidDungeonModeStats, searchPlayer } from '@/lib/destiny/bungieClient'
import { DESTINY_COLLECTIONS } from '@/lib/destiny/collections'
import { escapeRegExp } from '@/lib/destiny/communityBuildModel'
import { getDestinyUserByBungieMembershipId } from '@/lib/destiny/destinyUserStore'
import {
  guardianBadges,
  isMembershipId,
  sortGuardianCards,
  splitBungieNameQuery,
  type GuardianDirectoryCard,
  type GuardianGearHighlight,
  type GuardianListingStatus,
  type GuardianPublicProfile,
  type GuardianRecentActivity,
} from '@/lib/destiny/guardianDirectory'
import { resolveInventoryItem } from '@/lib/destiny/manifest'
import { countReceivedVotes, getReputationReviewsForUser, listVerifiedFullClears } from '@/lib/destiny/store'
import { computeReputationScore } from '@/lib/destiny/reputation'
import { evaluateSherpaRanks } from '@/lib/destiny/sherpaRanks'
import { dossierFromSnapshots } from '@/lib/destiny/characterSnapshot'
import { loadSnapshotDocs } from '@/lib/destiny/characterSnapshotStore'
import { parsePublicPresentation } from '@/lib/destiny/publicProfileParse'
import { parseLifetimeStats } from '@/lib/destiny/fullProfileParse'
import { computeTrustRank } from '@/lib/destiny/trustRank'
import type { PendingPlayer } from '@/lib/destiny/pendingPlayers'
import type { DestinyPlatform, ReputationReview, RunRecord, TrustReview } from '@/lib/destiny/types'
import type { StoredDestinyUser } from '@/lib/destiny/destinyUserStore'

async function db() {
  const client = await clientPromise
  return client.db(getMongoDbName())
}

function membershipTypeFromPlatform(platform?: string): number | undefined {
  if (platform === 'xbox') return 1
  if (platform === 'playstation') return 2
  if (platform === 'steam') return 3
  if (platform === 'epic') return 6
  return undefined
}

function cardFromUser(user: StoredDestinyUser, votes: { mvp: number; kudos: number }): GuardianDirectoryCard | null {
  if (!isMembershipId(user.bungieMembershipId)) return null
  return {
    membershipId: user.bungieMembershipId,
    membershipType: user.destinyMembershipType,
    displayName: user.bungieDisplayName || 'Guardian',
    status: 'member',
    platform: user.platform,
    characterClass: user.characterClass,
    emblemUrl: user.emblemUrl,
    clanTag: user.clanTag,
    mvpCount: votes.mvp,
    kudosCount: votes.kudos,
    badges: guardianBadges({
      status: 'member',
      verifiedClears: 0,
      mvpCount: votes.mvp,
      kudosCount: votes.kudos,
    }),
  }
}

function cardFromPending(row: PendingPlayer, votes: { mvp: number; kudos: number }): GuardianDirectoryCard | null {
  if (!isMembershipId(row.bungieMembershipId) || row.claimedUserId) return null
  return {
    membershipId: row.bungieMembershipId,
    displayName: row.bungieDisplayName || 'Guardian',
    status: 'pending',
    platform: row.platform,
    characterClass: row.characterClass,
    mvpCount: votes.mvp,
    kudosCount: votes.kudos,
    badges: guardianBadges({
      status: 'pending',
      verifiedClears: 0,
      mvpCount: votes.mvp,
      kudosCount: votes.kudos,
    }),
  }
}

async function voteCounts(ids: string[]): Promise<Map<string, { mvp: number; kudos: number }>> {
  const map = new Map<string, { mvp: number; kudos: number }>()
  if (!ids.length) return map
  try {
    const rows = await (await db())
      .collection(DESTINY_COLLECTIONS.mvpVotes)
      .aggregate([
        { $match: { selectedMembershipId: { $in: ids } } },
        {
          $group: {
            _id: { id: '$selectedMembershipId', category: { $ifNull: ['$category', 'mvp'] } },
            n: { $sum: 1 },
          },
        },
      ])
      .toArray()
    for (const row of rows) {
      const grouped = row._id as { id?: string; category?: string }
      const id = String(grouped?.id ?? '')
      if (!id) continue
      const current = map.get(id) ?? { mvp: 0, kudos: 0 }
      if (grouped.category === 'kudos') current.kudos += Number(row.n ?? 0)
      else current.mvp += Number(row.n ?? 0)
      map.set(id, current)
    }
  } catch (error) {
    console.warn('[guardians] vote counts unavailable', error)
  }
  return map
}

async function searchLocal(query: string): Promise<GuardianDirectoryCard[]> {
  const pattern = escapeRegExp(query.trim())
  if (pattern.length < 2) return []
  const nameFilter = { $regex: pattern, $options: 'i' }
  const database = await db()
  const [users, pending] = await Promise.all([
    database
      .collection(DESTINY_COLLECTIONS.users)
      .find({
        bungieDisplayName: nameFilter,
        accountStatus: { $ne: 'pending' },
      })
      .project({ oauth: 0 })
      .limit(16)
      .toArray(),
    database
      .collection(DESTINY_COLLECTIONS.pendingPlayers)
      .find({ bungieDisplayName: nameFilter, claimedUserId: { $exists: false } })
      .limit(16)
      .toArray(),
  ])

  const memberIds = users
    .map((row) => String((row as { bungieMembershipId?: string }).bungieMembershipId ?? ''))
    .filter(isMembershipId)
  const pendingIds = (pending as unknown as PendingPlayer[])
    .map((row) => row.bungieMembershipId)
    .filter((id) => isMembershipId(id) && !memberIds.includes(id))
  const votes = await voteCounts([...memberIds, ...pendingIds])

  const cards: GuardianDirectoryCard[] = []
  for (const row of users) {
    const card = cardFromUser(row as unknown as StoredDestinyUser, votes.get(String((row as { bungieMembershipId?: string }).bungieMembershipId)) ?? { mvp: 0, kudos: 0 })
    if (card) cards.push(card)
  }
  for (const row of pending as unknown as PendingPlayer[]) {
    if (memberIds.includes(row.bungieMembershipId)) continue
    const card = cardFromPending(row, votes.get(row.bungieMembershipId) ?? { mvp: 0, kudos: 0 })
    if (card) cards.push(card)
  }
  return cards
}

async function searchBungie(query: string, existing: Set<string>): Promise<GuardianDirectoryCard[]> {
  const parsed = splitBungieNameQuery(query)
  if (!parsed) return []
  try {
    const hits = await searchPlayer(parsed.displayName, parsed.code)
    return (hits ?? [])
      .filter((hit) => isMembershipId(String(hit.membershipId)) && !existing.has(String(hit.membershipId)))
      .map((hit) => {
        const code = String(parsed.code).padStart(4, '0')
        const displayName = hit.displayName?.includes('#') ? hit.displayName : `${parsed.displayName}#${code}`
        const status: GuardianListingStatus = 'bungie'
        return {
          membershipId: String(hit.membershipId),
          membershipType: hit.membershipType,
          displayName,
          status,
          platform: platformLabel(hit.membershipType),
          mvpCount: 0,
          kudosCount: 0,
          badges: guardianBadges({ status, verifiedClears: 0, mvpCount: 0, kudosCount: 0 }),
        }
      })
  } catch (error) {
    console.warn('[guardians] Bungie name search unavailable', error)
    return []
  }
}

function platformLabel(membershipType?: number): DestinyPlatform | undefined {
  if (membershipType === 1) return 'xbox'
  if (membershipType === 2) return 'playstation'
  if (membershipType === 3) return 'steam'
  if (membershipType === 6) return 'epic'
  return undefined
}

/** Search claimed accounts, pending players, and an exact Bungie name#code. */
export async function searchGuardians(query: string): Promise<GuardianDirectoryCard[]> {
  const trimmed = query.trim()
  if (trimmed.length < 2 || trimmed.length > 40) return []
  try {
    const local = await searchLocal(trimmed)
    const remote = await searchBungie(trimmed, new Set(local.map((card) => card.membershipId)))
    return sortGuardianCards([...local, ...remote], trimmed)
  } catch (error) {
    console.warn('[guardians] search failed', error)
    return []
  }
}

async function recentActivities(membershipId: string): Promise<GuardianRecentActivity[]> {
  try {
    const rows = (await (await db())
      .collection(DESTINY_COLLECTIONS.runRecords)
      .find({
        verificationStatus: 'verified',
        'teamMembers.membershipId': membershipId,
      })
      .project({ id: 1, activityName: 1, type: 1, completedAt: 1, difficulty: 1 })
      .sort({ completedAt: -1 })
      .limit(8)
      .toArray()) as unknown as Pick<RunRecord, 'id' | 'activityName' | 'type' | 'completedAt' | 'difficulty'>[]
    return rows.map((row) => ({
      id: row.id,
      activityName: row.activityName,
      type: row.type,
      completedAt: row.completedAt,
      difficulty: row.difficulty,
    }))
  } catch {
    return []
  }
}

async function trustForMembership(membershipId: string, userId?: string): Promise<TrustReview[]> {
  try {
    const filter = userId
      ? { $or: [{ reviewedUserId: userId }, { reviewedMembershipId: membershipId }] }
      : { reviewedMembershipId: membershipId }
    const rows = await (await db())
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

async function resolveGear(hashes: number[], source: 'equipped' | 'vault'): Promise<GuardianGearHighlight[]> {
  const unique = Array.from(new Set(hashes)).slice(0, source === 'vault' ? 6 : 9)
  const highlights: GuardianGearHighlight[] = []
  for (const hash of unique) {
    try {
      const item = await resolveInventoryItem(hash)
      highlights.push({
        name: item.name || `Item ${hash}`,
        iconUrl: item.iconUrl,
        source,
      })
    } catch {
      highlights.push({ name: `Item ${hash}`, source })
    }
  }
  return highlights
}

async function bungiePublicSlice(membershipType: number | undefined, membershipId: string) {
  if (!membershipType) return null
  try {
    let profile: unknown
    try {
      profile = await getPlayerProfile(membershipType, membershipId, [100, 200, 205, 102])
    } catch {
      profile = await getPlayerProfile(membershipType, membershipId, [100, 200, 205])
    }
    const parsed = parsePublicPresentation(profile)
    const [equippedHighlights, vaultHighlights, accountStats, modeStats] = await Promise.all([
      resolveGear(parsed.equippedHashes.map((slot) => slot.itemHash), 'equipped'),
      resolveGear(parsed.vaultHashes, 'vault'),
      getAccountHistoricalStats(membershipType, membershipId).catch(() => null),
      getRaidDungeonModeStats(membershipType, membershipId).catch(() => null),
    ])
    const lifetime = parseLifetimeStats(accountStats, modeStats)
    return { parsed, equippedHighlights, vaultHighlights, lifetime }
  } catch (error) {
    console.warn('[guardians] public Bungie profile unavailable', error)
    return null
  }
}

/** Public profile for a membership id. Omits OAuth tokens and private review text. */
export async function loadGuardianProfile(
  membershipId: string,
  membershipTypeHint?: number
): Promise<GuardianPublicProfile | null> {
  if (!isMembershipId(membershipId)) return null

  const user = await getDestinyUserByBungieMembershipId(membershipId).catch(() => null)
  const claimed = Boolean(user?.userId && user.accountStatus !== 'pending' && user.bungieMembershipId)
  let pending: PendingPlayer | null = null
  if (!claimed) {
    try {
      pending = (await (await db())
        .collection(DESTINY_COLLECTIONS.pendingPlayers)
        .findOne({ bungieMembershipId: membershipId })) as PendingPlayer | null
    } catch {
      pending = null
    }
  }

  const membershipType =
    user?.destinyMembershipType ||
    membershipTypeHint ||
    membershipTypeFromPlatform(user?.platform || pending?.platform)

  if (!claimed && !pending && !membershipType) return null

  const status: GuardianListingStatus = claimed ? 'member' : pending ? 'pending' : 'bungie'
  const [mvpCount, kudosCount, reviews, trust, activities, clears, live, snapshotDocs] = await Promise.all([
    countReceivedVotes(claimed ? user!.userId : '__none__', membershipId, 'mvp'),
    countReceivedVotes(claimed ? user!.userId : '__none__', membershipId, 'kudos'),
    claimed ? getReputationReviewsForUser(user!.userId) : Promise.resolve([] as ReputationReview[]),
    trustForMembership(membershipId, claimed ? user!.userId : undefined),
    recentActivities(membershipId),
    listVerifiedFullClears(400),
    bungiePublicSlice(membershipType, membershipId),
    loadSnapshotDocs(membershipId),
  ])

  const sherpa = evaluateSherpaRanks({
    runs: clears.runs,
    viewerMembershipId: membershipId,
    historyComplete: clears.complete,
  })
  const trustRank = computeTrustRank(trust)
  const sherpaMarks = trust.filter((review) => review.vibes === 'sherpa').length
  const reputationScore = computeReputationScore(reviews)
  const displayName =
    user?.bungieDisplayName ||
    pending?.bungieDisplayName ||
    live?.parsed.displayName ||
    'Guardian'
  const characters = live?.parsed.characters ?? []
  const dossier = dossierFromSnapshots(snapshotDocs, sherpa.points) ?? undefined
  const powerLevel = user?.powerLevel ?? characters[0]?.power ?? dossier?.characters[0]?.light
  const guardianRank = user?.guardianRank ?? dossier?.guardianRank
  const verifiedClears = activities.length

  const stats = [
    { label: 'Power', value: powerLevel ? String(powerLevel) : '—' },
    { label: 'Guardian rank', value: guardianRank ? String(guardianRank) : '—' },
    { label: 'Raid clears', value: String(live?.lifetime.raidClears ?? 0) },
    { label: 'Dungeon clears', value: String(live?.lifetime.dungeonClears ?? 0) },
    { label: 'Nest activities', value: String(verifiedClears) },
    { label: 'MVP votes', value: String(mvpCount) },
    { label: 'Kudos', value: String(kudosCount) },
  ]
  if (dossier?.triumphScore != null) stats.push({ label: 'Triumph score', value: dossier.triumphScore.toLocaleString('en-US') })
  if (dossier?.collectionsOwned != null) stats.push({ label: 'Collections', value: dossier.collectionsOwned.toLocaleString('en-US') })

  const card: GuardianDirectoryCard = {
    membershipId,
    membershipType,
    displayName,
    status,
    platform: user?.platform || pending?.platform || platformLabel(membershipType),
    characterClass: user?.characterClass || pending?.characterClass || characters[0]?.className,
    emblemUrl: user?.emblemUrl || characters[0]?.emblemUrl,
    clanTag: user?.clanTag,
    mvpCount,
    kudosCount,
    badges: guardianBadges({
      status,
      verifiedClears,
      mvpCount,
      kudosCount,
      reviews,
      sherpaPoints: sherpa.points,
    }),
  }

  return {
    card,
    guardianRank,
    powerLevel,
    reputationScore,
    reviewCount: reviews.length,
    teammateTitle: trustRank.topNestTitle,
    teammateScore: trustRank.compositeAvg,
    teammateReviews: trustRank.reviewCount,
    sherpaTitle: sherpa.title,
    sherpaPoints: sherpa.points,
    sherpaGuided: sherpa.guidedClears,
    sherpaMarks,
    recentActivities: activities,
    characters,
    vaultHighlights: live?.vaultHighlights ?? [],
    equippedHighlights: live?.equippedHighlights ?? [],
    stats,
    dossier,
  }
}
