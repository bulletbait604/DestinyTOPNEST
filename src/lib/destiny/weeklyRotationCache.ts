/**
 * Mongo cache for the featured week. The Tuesday cron writes it; request
 * handlers read it so a cold instance does not wait on Bungie.
 */

import clientPromise from '@/lib/mongodb'
import { getMongoDbName } from '@/lib/database'
import { DESTINY_COLLECTIONS } from '@/lib/destiny/collections'
import type { LiveFeaturedWeek, LiveRotationSource } from '@/lib/destiny/weeklyRotationLive'

export interface WeeklyRotationStore {
  read(weekStart: string, nowMs: number): Promise<LiveFeaturedWeek | null>
  write(entry: LiveFeaturedWeek): Promise<void>
}

function asSource(value: unknown): LiveRotationSource {
  return value === 'web' || value === 'mixed' ? value : 'bungie'
}

function asNames(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined
  const names = value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
  return names.length ? names : undefined
}

export async function readMongoWeeklyRotation(weekStart: string, nowMs: number): Promise<LiveFeaturedWeek | null> {
  if (!process.env.MONGODB_URI?.trim()) return null
  try {
    const client = await clientPromise
    const doc = await client
      .db(getMongoDbName())
      .collection(DESTINY_COLLECTIONS.weeklyRotation)
      .findOne({ _id: weekStart })
    if (!doc) return null
    const expiresAtMs = doc.expiresAt instanceof Date ? doc.expiresAt.getTime() : Date.parse(String(doc.expiresAt ?? ''))
    if (!Number.isFinite(expiresAtMs) || expiresAtMs <= nowMs) return null
    return {
      weekStart,
      expiresAtMs,
      raids: asNames(doc.raids),
      dungeons: asNames(doc.dungeons),
      pantheon: typeof doc.pantheon === 'string' ? doc.pantheon : undefined,
      nightfall: typeof doc.nightfall === 'string' ? doc.nightfall : undefined,
      source: asSource(doc.source),
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error'
    console.warn('[weekly] mongo cache read failed:', message)
    return null
  }
}

export async function writeMongoWeeklyRotation(entry: LiveFeaturedWeek): Promise<void> {
  if (!process.env.MONGODB_URI?.trim()) return
  try {
    const client = await clientPromise
    await client
      .db(getMongoDbName())
      .collection(DESTINY_COLLECTIONS.weeklyRotation)
      .updateOne(
        { _id: entry.weekStart },
        {
          $set: {
            weekStart: entry.weekStart,
            expiresAt: new Date(entry.expiresAtMs),
            raids: entry.raids ?? [],
            dungeons: entry.dungeons ?? [],
            pantheon: entry.pantheon ?? null,
            nightfall: entry.nightfall ?? null,
            source: entry.source ?? 'bungie',
            fetchedAt: new Date(),
          },
        },
        { upsert: true }
      )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error'
    console.warn('[weekly] mongo cache write failed:', message)
  }
}
