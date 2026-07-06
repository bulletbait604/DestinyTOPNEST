/**
 * Weekly meta build sync — runs once per Destiny reset week.
 * Refreshes curated builds, promotes activity picks for featured raids/dungeons,
 * and stores weekly spotlight builds in Mongo.
 */

import clientPromise from '@/lib/mongodb'
import { getMongoDbName } from '@/lib/database'
import { DESTINY_COLLECTIONS } from '@/lib/destiny/collections'
import { META_BUILD_EARLIEST_PUBLISHED } from '@/lib/destiny/destinyBuildKnowledge'
import {
  getResearchedMetaBuilds,
  META_RESEARCH_SOURCES,
} from '@/lib/destiny/externalMetaResearch'
import type { DestinyCharacterClass, ExternalBuildSource } from '@/lib/destiny/types'
import { getWeeklyResetState } from '@/lib/destiny/weeklyRotation'

interface MetaBuildWeeklySyncDoc {
  _id: string
  resetAt: string
  syncedAt: string
  featuredActivities: string[]
  buildsRefreshed: number
  buildsAdded: number
  buildIds: string[]
}

export interface MetaBuildWeeklySyncStatus {
  weekStart: string
  resetAt?: string
  syncedAt?: string
  featuredActivities: string[]
  buildsRefreshed: number
  buildsAdded: number
  buildCount: number
  needsSync: boolean
}

export interface MetaBuildWeeklySyncResult extends MetaBuildWeeklySyncStatus {
  ok: boolean
  skipped?: boolean
  message: string
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function activityMatches(build: ExternalBuildSource, activityName: string): boolean {
  const focus = build.activityFocus?.toLowerCase() ?? ''
  const title = build.title.toLowerCase()
  const activity = activityName.toLowerCase()
  return focus.includes(activity) || activity.includes(focus) || title.includes(activity)
}

function topGeneralByClass(builds: ExternalBuildSource[]): ExternalBuildSource[] {
  const classes: DestinyCharacterClass[] = ['warlock', 'titan', 'hunter']
  return classes
    .map((cls) =>
      builds
        .filter((b) => b.class === cls && b.suggestionScope !== 'activity')
        .sort((a, b) => (a.suggestionRank ?? 99) - (b.suggestionRank ?? 99))[0]
    )
    .filter(Boolean) as ExternalBuildSource[]
}

function pickOnePerClass(builds: ExternalBuildSource[]): ExternalBuildSource[] {
  const classes: DestinyCharacterClass[] = ['warlock', 'titan', 'hunter']
  const picks: ExternalBuildSource[] = []
  for (const cls of classes) {
    const match = builds.find((b) => b.class === cls)
    if (match) picks.push(match)
  }
  return picks.length ? picks : builds.slice(0, 1)
}

function weeklySpotlightBuilds(
  activityName: string,
  resetAt: string,
  weekStart: string,
  curated: ExternalBuildSource[]
): ExternalBuildSource[] {
  const matched = curated.filter((b) => activityMatches(b, activityName))
  const picks = matched.length ? pickOnePerClass(matched) : topGeneralByClass(curated)

  return picks.map((template) => ({
    ...template,
    id: `weekly-${weekStart}-${slugify(activityName)}-${template.class}`,
    title: matched.length
      ? `${template.title} · ${activityName}`
      : `${template.title} (featured week)`,
    activityFocus: activityName,
    publishedAt: resetAt,
    lastChecked: new Date().toISOString(),
    suggestionScope: 'activity' as const,
    approved: true,
    source: `${template.source} · Weekly sync`,
    sourceUrl: template.sourceUrl,
    summary:
      template.summary ??
      `Weekly spotlight for ${activityName} — refreshed ${new Date(resetAt).toLocaleDateString()}.`,
  }))
}

async function readSyncDoc(weekStart: string): Promise<MetaBuildWeeklySyncDoc | null> {
  try {
    const client = await clientPromise
    const doc = await client
      .db(getMongoDbName())
      .collection(DESTINY_COLLECTIONS.metaBuildWeeklySync)
      .findOne({ _id: weekStart })
    return doc as MetaBuildWeeklySyncDoc | null
  } catch {
    return null
  }
}

async function writeSyncDoc(doc: MetaBuildWeeklySyncDoc): Promise<void> {
  const client = await clientPromise
  await client
    .db(getMongoDbName())
    .collection(DESTINY_COLLECTIONS.metaBuildWeeklySync)
    .updateOne({ _id: doc._id }, { $set: doc }, { upsert: true })
}

async function upsertExternalBuild(build: ExternalBuildSource): Promise<void> {
  const client = await clientPromise
  await client.db(getMongoDbName()).collection(DESTINY_COLLECTIONS.externalBuildSources).updateOne(
    { id: build.id },
    { $set: { ...build, updatedAt: new Date().toISOString() } },
    { upsert: true }
  )
}

async function retireOldWeeklyBuilds(beforeWeekStart: string): Promise<number> {
  const client = await clientPromise
  const result = await client
    .db(getMongoDbName())
    .collection(DESTINY_COLLECTIONS.externalBuildSources)
    .updateMany(
      { id: { $regex: /^weekly-/ }, approved: true },
      {
        $set: {
          approved: false,
          updatedAt: new Date().toISOString(),
        },
      }
    )
  void beforeWeekStart
  return result.modifiedCount
}

/**
 * Run the weekly meta build pass for the current reset week.
 * Idempotent unless `force` is true.
 */
export async function runWeeklyMetaBuildSync(options?: {
  force?: boolean
  weekStart?: string
  resetAt?: string
  featuredActivities?: string[]
}): Promise<MetaBuildWeeklySyncResult> {
  const state = getWeeklyResetState()
  const weekStart = options?.weekStart ?? state.weekStart
  const resetAt = options?.resetAt ?? state.resetAt
  const featuredActivities =
    options?.featuredActivities ??
    [...state.featuredRaids.map((r) => r.name), ...state.featuredDungeons.map((d) => d.name)]

  const existing = await readSyncDoc(weekStart)
  if (existing && !options?.force) {
    return {
      ok: true,
      skipped: true,
      weekStart,
      resetAt: existing.resetAt,
      syncedAt: existing.syncedAt,
      featuredActivities: existing.featuredActivities,
      buildsRefreshed: existing.buildsRefreshed,
      buildsAdded: existing.buildsAdded,
      buildCount: existing.buildIds.length,
      needsSync: false,
      message: `Meta builds already synced for week of ${weekStart}.`,
    }
  }

  const now = new Date().toISOString()
  const earliest = Date.parse(META_BUILD_EARLIEST_PUBLISHED)
  const curated = getResearchedMetaBuilds()

  let buildsRefreshed = 0
  const weeklyBuilds: ExternalBuildSource[] = []
  const weeklyIds = new Set<string>()

  for (const build of curated) {
    const published = build.publishedAt ? Date.parse(build.publishedAt) : 0
    if (published < earliest) continue
    const refreshed = { ...build, lastChecked: now }
    await upsertExternalBuild(refreshed)
    buildsRefreshed += 1
  }

  for (const activityName of featuredActivities) {
    for (const spotlight of weeklySpotlightBuilds(activityName, resetAt, weekStart, curated)) {
      if (weeklyIds.has(spotlight.id)) continue
      weeklyIds.add(spotlight.id)
      weeklyBuilds.push(spotlight)
      await upsertExternalBuild(spotlight)
    }
  }

  const retired = await retireOldWeeklyBuilds(weekStart)

  const buildIds = [...curated.map((b) => b.id), ...weeklyBuilds.map((b) => b.id)]
  const doc: MetaBuildWeeklySyncDoc = {
    _id: weekStart,
    resetAt,
    syncedAt: now,
    featuredActivities,
    buildsRefreshed,
    buildsAdded: weeklyBuilds.length,
    buildIds,
  }
  await writeSyncDoc(doc)

  return {
    ok: true,
    weekStart,
    resetAt,
    syncedAt: now,
    featuredActivities,
    buildsRefreshed,
    buildsAdded: weeklyBuilds.length,
    buildCount: buildIds.length,
    needsSync: false,
    message: `Synced ${buildsRefreshed} curated builds and added ${weeklyBuilds.length} weekly spotlight builds (${retired} prior weekly entries retired). Sources: ${META_RESEARCH_SOURCES.map((s) => s.name).join(', ')}.`,
  }
}

/** Lazy weekly sync — called before serving external builds. */
export async function ensureWeeklyMetaBuildSync(
  weekStart: string,
  resetAt: string,
  featuredActivities: string[]
): Promise<void> {
  const existing = await readSyncDoc(weekStart)
  if (existing) return
  await runWeeklyMetaBuildSync({ weekStart, resetAt, featuredActivities })
}

export async function getMetaBuildWeeklySyncStatus(weekStart: string): Promise<MetaBuildWeeklySyncStatus> {
  const doc = await readSyncDoc(weekStart)
  return {
    weekStart,
    resetAt: doc?.resetAt,
    syncedAt: doc?.syncedAt,
    featuredActivities: doc?.featuredActivities ?? [],
    buildsRefreshed: doc?.buildsRefreshed ?? 0,
    buildsAdded: doc?.buildsAdded ?? 0,
    buildCount: doc?.buildIds.length ?? 0,
    needsSync: !doc,
  }
}

export async function rebuildWeeklyMetaBuilds(
  weekStart: string,
  resetAt: string,
  featuredActivities: string[]
): Promise<MetaBuildWeeklySyncResult> {
  return runWeeklyMetaBuildSync({ force: true, weekStart, resetAt, featuredActivities })
}
