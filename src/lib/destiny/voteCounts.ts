import clientPromise from '@/lib/mongodb'
import { getMongoDbName } from '@/lib/database'
import { DESTINY_COLLECTIONS } from '@/lib/destiny/collections'
import { emptyVoteCounts, tallyVoteCounts, type VoteCountBucket } from '@/lib/destiny/mvpVoting'
import type { MvpVote } from '@/lib/destiny/types'

async function db() {
  const client = await clientPromise
  return client.db(getMongoDbName())
}

/** MVP, New Light, and Useless totals keyed by Bungie membership id. */
export async function getVoteCountsMap(membershipIds?: string[]): Promise<Map<string, VoteCountBucket>> {
  const ids = (membershipIds ?? []).map((id) => id.trim()).filter(Boolean)
  try {
    const database = await db()
    const filter = ids.length ? { selectedMembershipId: { $in: ids } } : {}
    const rows = await database
      .collection(DESTINY_COLLECTIONS.mvpVotes)
      .find(filter)
      .project({ selectedMembershipId: 1, voteType: 1, category: 1 })
      .limit(20000)
      .toArray()
    return tallyVoteCounts(rows as Array<{ selectedMembershipId?: string; voteType?: string; category?: string }>)
  } catch {
    return new Map()
  }
}

export async function voteCountsForMembership(membershipId: string): Promise<VoteCountBucket> {
  const counts = await getVoteCountsMap([membershipId])
  return counts.get(membershipId.trim()) ?? emptyVoteCounts()
}

export async function findGuardianVote(
  voterId: string,
  membershipId: string,
  voteType: 'new_light' | 'useless'
): Promise<MvpVote | null> {
  try {
    const database = await db()
    const row = await database.collection(DESTINY_COLLECTIONS.mvpVotes).findOne({
      voterId: voterId.trim().toLowerCase(),
      selectedMembershipId: membershipId.trim(),
      voteType,
    })
    return row as MvpVote | null
  } catch {
    return null
  }
}
