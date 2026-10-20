/**
 * Idempotent featured-build seed. Runs inside the app (builds list or the
 * owner import action) because this process is the one that can reach Mongo.
 */

import clientPromise from '@/lib/mongodb'
import { getMongoDbName } from '@/lib/database'
import { DESTINY_COLLECTIONS } from '@/lib/destiny/collections'
import {
  FEATURED_BUILD_SEED_VERSION,
  featuredBuildRecords,
} from '@/lib/destiny/featuredBuilds'
import type { CommunityBuildRecord } from '@/lib/destiny/communityBuildModel'
import { ensureCommunityBuildIndexes } from '@/lib/destiny/communityBuildStore'

export interface FeaturedBuildSeedResult {
  ok: boolean
  version: string
  inserted: number
  updated: number
  unchanged: number
  total: number
}

function seedPatch(record: CommunityBuildRecord): Record<string, unknown> {
  const {
    upvoteCount: _upvote,
    saveCount: _save,
    commentCount: _comment,
    createdAt: _created,
    ...content
  } = record
  return content
}

export async function ensureFeaturedBuildsSeed(): Promise<FeaturedBuildSeedResult> {
  await ensureCommunityBuildIndexes()
  const client = await clientPromise
  const col = client.db(getMongoDbName()).collection(DESTINY_COLLECTIONS.communityBuilds)
  const records = featuredBuildRecords(new Date().toISOString())
  const current = await col.countDocuments({
    listing: 'featured',
    seedVersion: FEATURED_BUILD_SEED_VERSION,
  })
  if (current >= records.length) {
    return {
      ok: true,
      version: FEATURED_BUILD_SEED_VERSION,
      inserted: 0,
      updated: 0,
      unchanged: records.length,
      total: records.length,
    }
  }

  let inserted = 0
  let updated = 0
  let unchanged = 0

  for (const record of records) {
    const existing = (await col.findOne({ id: record.id })) as (CommunityBuildRecord & { _id?: unknown }) | null
    if (!existing) {
      try {
        await col.insertOne(record)
        inserted += 1
      } catch (error) {
        const duplicate = typeof error === 'object' && error !== null && 'code' in error && (error as { code?: number }).code === 11000
        if (!duplicate) throw error
        unchanged += 1
      }
      continue
    }
    if (existing.seedVersion === FEATURED_BUILD_SEED_VERSION && existing.listing === 'featured') {
      unchanged += 1
      continue
    }
    await col.updateOne(
      { id: record.id },
      {
        $set: {
          ...seedPatch(record),
          updatedAt: new Date().toISOString(),
        },
      }
    )
    updated += 1
  }

  return {
    ok: true,
    version: FEATURED_BUILD_SEED_VERSION,
    inserted,
    updated,
    unchanged,
    total: records.length,
  }
}
