import clientPromise from '@/lib/mongodb'
import { getMongoDbName } from '@/lib/database'
import { DESTINY_COLLECTIONS } from '@/lib/destiny/collections'

/** Core collections that must survive redeploys — stored in MongoDB Atlas, not on the app server. */
const PERSISTENCE_COLLECTIONS = [
  DESTINY_COLLECTIONS.users,
  DESTINY_COLLECTIONS.runRecords,
  DESTINY_COLLECTIONS.buildSnapshots,
  DESTINY_COLLECTIONS.leaderboardEntries,
  DESTINY_COLLECTIONS.reputationReviews,
  DESTINY_COLLECTIONS.trustReviews,
  DESTINY_COLLECTIONS.mvpVotes,
  DESTINY_COLLECTIONS.externalBuildSources,
  DESTINY_COLLECTIONS.seasons,
  DESTINY_COLLECTIONS.prizeClaims,
  DESTINY_COLLECTIONS.adminReviews,
] as const

export interface PersistenceHealth {
  ok: boolean
  database: string
  collections: Record<string, number>
  error?: string
}

/** Read-only counts for staff diagnostics — confirms Atlas is reachable after deploy. */
export async function getPersistenceHealth(): Promise<PersistenceHealth> {
  const database = getMongoDbName()
  try {
    const client = await clientPromise
    const db = client.db(database)
    const collections: Record<string, number> = {}

    await Promise.all(
      PERSISTENCE_COLLECTIONS.map(async (name) => {
        collections[name] = await db.collection(name).countDocuments()
      })
    )

    return { ok: true, database, collections }
  } catch (error) {
    return {
      ok: false,
      database,
      collections: {},
      error: error instanceof Error ? error.message : 'Database unavailable',
    }
  }
}
