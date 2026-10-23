import clientPromise from '@/lib/mongodb'
import { getMongoDbName } from '@/lib/database'
import { DESTINY_COLLECTIONS } from '@/lib/destiny/collections'
import { isBungieMembershipId, type GuardianQuickRating } from '@/lib/destiny/quickRate'

async function ratings() {
  const client = await clientPromise
  return client.db(getMongoDbName()).collection(DESTINY_COLLECTIONS.guardianRatings)
}

export async function listQuickRatings(membershipId: string): Promise<GuardianQuickRating[]> {
  if (!process.env.MONGODB_URI?.trim() || !isBungieMembershipId(membershipId)) return []
  try {
    const rows = await (await ratings())
      .find({ targetMembershipId: membershipId.trim() })
      .sort({ updatedAt: -1 })
      .limit(500)
      .toArray()
    return rows as unknown as GuardianQuickRating[]
  } catch {
    return []
  }
}

export async function saveQuickRating(rating: GuardianQuickRating): Promise<void> {
  await (await ratings()).updateOne({ id: rating.id }, { $set: rating }, { upsert: true })
}
