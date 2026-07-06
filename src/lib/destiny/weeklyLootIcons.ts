/**
 * Weekly loot icon snapshots — resolve drop icons once per reset and store in Mongo
 * so the home page never re-resolves ambiguous item names at render time.
 */

import clientPromise from '@/lib/mongodb'
import { getMongoDbName } from '@/lib/database'
import {
  activityLootIntel,
  lootArmorSetIconRef,
  lootDropIconRef,
  lootDropLookupName,
  type ActivityLootDrop,
} from '@/lib/destiny/activityLoot'
import { DESTINY_COLLECTIONS } from '@/lib/destiny/collections'
import { resolveByName, resolveManifestHash } from '@/lib/destiny/manifest'
import { lootIconHashOverride } from '@/lib/destiny/lootIconHashOverrides'
import type { DestinyIconRef, WeeklyActivityLootSnapshot } from '@/lib/destiny/types'

interface WeeklyLootIconsDoc {
  _id: string
  resetAt: string
  lootByActivity: Record<string, WeeklyActivityLootSnapshot>
  builtAt: string
}

const GENERIC_ICON_MARKERS = [
  'bd7a1fc995f87be96698263bc16698e7',
  '8b1bfd1c1ce1cab51d23c78235a6e067',
  'missing_icon',
  'placeholder.jpg',
]

function isUsableIconUrl(url?: string | null): boolean {
  if (!url) return false
  return !GENERIC_ICON_MARKERS.some((marker) => url.includes(marker))
}

function mergeIconRef(displayName: string, staticRef: DestinyIconRef, resolved: DestinyIconRef): DestinyIconRef {
  const iconUrl = isUsableIconUrl(resolved.iconUrl)
    ? resolved.iconUrl
    : isUsableIconUrl(staticRef.iconUrl)
      ? staticRef.iconUrl
      : resolved.iconUrl ?? staticRef.iconUrl

  return {
    name: displayName,
    hash: resolved.hash ?? staticRef.hash,
    iconUrl,
    tierLabel: staticRef.tierLabel ?? resolved.tierLabel,
    entityType: resolved.entityType ?? staticRef.entityType,
  }
}

async function resolveLootDropIconRef(drop: ActivityLootDrop): Promise<DestinyIconRef> {
  const staticRef = lootDropIconRef(drop)
  const catalogKey = lootDropLookupName(drop)
  const hashOverride = lootIconHashOverride(catalogKey) ?? lootIconHashOverride(drop.name)

  if (hashOverride) {
    const resolved = await resolveManifestHash(
      'DestinyInventoryItemDefinition',
      hashOverride,
      drop.name
    )
    return mergeIconRef(drop.name, staticRef, { ...resolved, name: drop.name })
  }

  if (staticRef.hash && isUsableIconUrl(staticRef.iconUrl)) {
    return { ...staticRef, name: drop.name }
  }

  const lookupName = catalogKey
  const resolved = await resolveByName(lookupName, 'DestinyInventoryItemDefinition')
  return mergeIconRef(drop.name, staticRef, resolved)
}

async function resolveArmorSetIconRef(
  activityName: string,
  intel: NonNullable<ReturnType<typeof activityLootIntel>>
): Promise<DestinyIconRef | undefined> {
  const staticRef = lootArmorSetIconRef(intel, activityName)
  if (!staticRef) return undefined
  if (staticRef.hash && isUsableIconUrl(staticRef.iconUrl)) {
    return staticRef
  }

  const resolved = await resolveByName(staticRef.name, 'DestinyInventoryItemDefinition')
  return mergeIconRef(staticRef.name, staticRef, resolved)
}

async function buildActivityLootSnapshot(activityName: string): Promise<WeeklyActivityLootSnapshot | null> {
  const intel = activityLootIntel(activityName)
  if (!intel) return null

  const [drops, armorSetIconRef] = await Promise.all([
    Promise.all(
      intel.drops.map(async (drop) => ({
        ...drop,
        iconRef: await resolveLootDropIconRef(drop),
      }))
    ),
    resolveArmorSetIconRef(activityName, intel),
  ])

  return {
    tagline: intel.tagline,
    armorSet: intel.armorSet,
    armorSetIconRef,
    drops,
  }
}

async function readWeeklyLootIconsDoc(weekStart: string): Promise<WeeklyLootIconsDoc | null> {
  const client = await clientPromise
  const doc = await client
    .db(getMongoDbName())
    .collection<WeeklyLootIconsDoc>(DESTINY_COLLECTIONS.weeklyLootIcons)
    .findOne({ _id: weekStart })
  return doc
}

async function writeWeeklyLootIconsDoc(doc: WeeklyLootIconsDoc): Promise<void> {
  const client = await clientPromise
  await client
    .db(getMongoDbName())
    .collection<WeeklyLootIconsDoc>(DESTINY_COLLECTIONS.weeklyLootIcons)
    .replaceOne({ _id: doc._id }, doc, { upsert: true })
}

function activityNamesNeedingSnapshot(
  activityNames: string[],
  existing?: Record<string, WeeklyActivityLootSnapshot>
): string[] {
  return activityNames.filter((name) => {
    const snapshot = existing?.[name]
    if (!snapshot?.drops.length) return true
    return snapshot.drops.some((drop) => !isUsableIconUrl(drop.iconRef.iconUrl))
  })
}

/**
 * Load cached loot icons for the current reset week, building and persisting any missing entries.
 */
export async function getOrBuildWeeklyLootIcons(
  weekStart: string,
  resetAt: string,
  activityNames: string[]
): Promise<Record<string, WeeklyActivityLootSnapshot>> {
  const uniqueNames = Array.from(new Set(activityNames.filter(Boolean)))
  if (uniqueNames.length === 0) return {}

  const existingDoc = await readWeeklyLootIconsDoc(weekStart)
  const lootByActivity = { ...(existingDoc?.lootByActivity ?? {}) }
  const missing = activityNamesNeedingSnapshot(uniqueNames, lootByActivity)

  if (missing.length === 0) {
    return lootByActivity
  }

  await Promise.all(
    missing.map(async (activityName) => {
      const snapshot = await buildActivityLootSnapshot(activityName)
      if (snapshot) lootByActivity[activityName] = snapshot
    })
  )

  await writeWeeklyLootIconsDoc({
    _id: weekStart,
    resetAt,
    lootByActivity,
    builtAt: new Date().toISOString(),
  })

  return lootByActivity
}

export interface WeeklyLootIconsStatus {
  weekStart: string
  resetAt?: string
  builtAt?: string
  activityCount: number
  dropCount: number
  missingIconCount: number
  activities: string[]
}

export async function getWeeklyLootIconsStatus(weekStart: string): Promise<WeeklyLootIconsStatus> {
  const doc = await readWeeklyLootIconsDoc(weekStart)
  const lootByActivity = doc?.lootByActivity ?? {}
  const activities = Object.keys(lootByActivity)
  let dropCount = 0
  let missingIconCount = 0

  for (const snapshot of Object.values(lootByActivity)) {
    dropCount += snapshot.drops.length
    missingIconCount += snapshot.drops.filter((drop) => !isUsableIconUrl(drop.iconRef.iconUrl)).length
  }

  return {
    weekStart,
    resetAt: doc?.resetAt,
    builtAt: doc?.builtAt,
    activityCount: activities.length,
    dropCount,
    missingIconCount,
    activities,
  }
}

/** Force a full rebuild of loot icon snapshots for the given reset week. */
export async function rebuildWeeklyLootIcons(
  weekStart: string,
  resetAt: string,
  activityNames: string[]
): Promise<{ lootByActivity: Record<string, WeeklyActivityLootSnapshot>; builtAt: string }> {
  const uniqueNames = Array.from(new Set(activityNames.filter(Boolean)))
  const lootByActivity: Record<string, WeeklyActivityLootSnapshot> = {}

  await Promise.all(
    uniqueNames.map(async (activityName) => {
      const snapshot = await buildActivityLootSnapshot(activityName)
      if (snapshot) lootByActivity[activityName] = snapshot
    })
  )

  const builtAt = new Date().toISOString()
  await writeWeeklyLootIconsDoc({
    _id: weekStart,
    resetAt,
    lootByActivity,
    builtAt,
  })

  return { lootByActivity, builtAt }
}
