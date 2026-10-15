import clientPromise from '@/lib/mongodb'
import { getMongoDbName } from '@/lib/database'
import { DESTINY_COLLECTIONS } from '@/lib/destiny/collections'
import { getDestinyUserByBungieMembershipId } from '@/lib/destiny/destinyUserStore'
import { isPendingAccount } from '@/lib/destiny/playerIdentity'
import { normalizeMembershipId, unclaimedVoteAttachmentQuery } from '@/lib/destiny/mvpVoting'
import type { DestinyCharacterClass, DestinyPlatform } from '@/lib/destiny/types'

/**
 * Lightweight record for a carnage-report guardian who has not signed into Top Nest.
 * Kept out of destiny_users so Bungie login and leaderboards only see claimed accounts.
 */
export interface PendingPlayer {
  bungieMembershipId: string
  bungieDisplayName: string
  platform?: DestinyPlatform
  characterClass?: DestinyCharacterClass
  source: 'pgcr'
  createdAt: string
  updatedAt: string
  claimedUserId?: string
  claimedAt?: string
}

export function buildPendingPlayer(
  member: {
    membershipId: string
    displayName?: string
    platform?: DestinyPlatform
    characterClass?: DestinyCharacterClass
  },
  nowIso: string
): PendingPlayer {
  const bungieMembershipId = normalizeMembershipId(member.membershipId)
  if (!bungieMembershipId) {
    throw new Error('Pending player requires a Bungie membership id')
  }
  return {
    bungieMembershipId,
    bungieDisplayName: member.displayName?.trim() || bungieMembershipId,
    platform: member.platform,
    characterClass: member.characterClass,
    source: 'pgcr',
    createdAt: nowIso,
    updatedAt: nowIso,
  }
}

async function db() {
  const client = await clientPromise
  return client.db(getMongoDbName())
}

let indexPromise: Promise<void> | null = null

async function ensurePendingPlayerIndex(): Promise<void> {
  if (!indexPromise) {
    indexPromise = db()
      .then((database) =>
        database.collection(DESTINY_COLLECTIONS.pendingPlayers).createIndex(
          { bungieMembershipId: 1 },
          { unique: true }
        )
      )
      .then(() => undefined)
      .catch((error) => {
        indexPromise = null
        throw error
      })
  }
  await indexPromise
}

/** Create or refresh a placeholder when the target has never claimed Top Nest. */
export async function ensurePendingPlayerForUnlinkedMember(member: {
  membershipId: string
  displayName?: string
  platform?: DestinyPlatform
  characterClass?: DestinyCharacterClass
}): Promise<PendingPlayer | null> {
  const membershipId = normalizeMembershipId(member.membershipId)
  if (!membershipId) return null

  const linked = await getDestinyUserByBungieMembershipId(membershipId)
  if (linked?.userId && linked.bungieMembershipId && !isPendingAccount(linked)) {
    return null
  }

  const now = new Date().toISOString()
  const draft = buildPendingPlayer({ ...member, membershipId }, now)
  await ensurePendingPlayerIndex()
  const database = await db()
  await database.collection(DESTINY_COLLECTIONS.pendingPlayers).updateOne(
    { bungieMembershipId: membershipId },
    {
      $setOnInsert: {
        bungieMembershipId: membershipId,
        source: 'pgcr' as const,
        createdAt: now,
      },
      $set: {
        bungieDisplayName: draft.bungieDisplayName,
        platform: draft.platform,
        characterClass: draft.characterClass,
        updatedAt: now,
      },
    },
    { upsert: true }
  )

  const row = await database.collection(DESTINY_COLLECTIONS.pendingPlayers).findOne({
    bungieMembershipId: membershipId,
  })
  return row as PendingPlayer | null
}

/**
 * When a guardian links Bungie, mark the placeholder claimed and copy their
 * membership id onto any MVP or kudos rows that were stored before sign-in.
 */
export async function claimPendingPlayer(membershipId: string, userId: string): Promise<void> {
  const normalizedMembershipId = normalizeMembershipId(membershipId)
  const normalizedUserId = userId.trim().toLowerCase()
  if (!normalizedMembershipId || !normalizedUserId) return

  const now = new Date().toISOString()
  const database = await db()
  await database.collection(DESTINY_COLLECTIONS.pendingPlayers).updateOne(
    { bungieMembershipId: normalizedMembershipId },
    {
      $set: {
        claimedUserId: normalizedUserId,
        claimedAt: now,
        updatedAt: now,
      },
    }
  )

  await database.collection(DESTINY_COLLECTIONS.mvpVotes).updateMany(unclaimedVoteAttachmentQuery(normalizedMembershipId), {
    $set: { selectedUserId: normalizedUserId, updatedAt: now },
  })
}
