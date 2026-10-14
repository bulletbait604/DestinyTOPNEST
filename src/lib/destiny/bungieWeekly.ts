/**
 * Load this week's featured raids and dungeons from Destiny2/Milestones.
 * Results are cached until the next Tuesday 17:00 UTC reset and never reused
 * for a later week.
 */

import { ACTIVITY_CATALOG } from '@/lib/destiny/activityCatalog'
import { getDestinyEntityDefinition, getPublicMilestones } from '@/lib/destiny/bungieClient'
import { destinyApiKey } from '@/lib/destiny/env'
import {
  CANONICAL_DUNGEONS,
  CANONICAL_RAIDS,
  DUNGEON_ACTIVITY_MODE,
  RAID_ACTIVITY_MODE,
  selectFeaturedWeeklyActivities,
  type FeaturedSelection,
  type WeeklyMilestoneSnapshot,
} from '@/lib/destiny/weeklyFeaturedSelection'
import { readMongoWeeklyRotation, writeMongoWeeklyRotation, type WeeklyRotationStore } from '@/lib/destiny/weeklyRotationCache'
import { fetchScrapedFeaturedWeek } from '@/lib/destiny/weeklyRotationScrape'
import { getCurrentWeekResetStart, getNextWeeklyReset } from '@/lib/destiny/weeklyRotation'
import {
  clearLiveFeaturedWeek,
  getLiveFeaturedWeek,
  setLiveFeaturedWeek,
  type LiveFeaturedWeek,
  type LiveRotationSource,
} from '@/lib/destiny/weeklyRotationLive'

const DISPLAY_BY_KEY = new Map<string, string>(
  [...CANONICAL_RAIDS, ...CANONICAL_DUNGEONS].map((name) => [name.toLowerCase(), name])
)

const NAME_BY_HASH = new Map<number, string>()
for (const [key, entry] of Object.entries(ACTIVITY_CATALOG)) {
  if (key === 'pantheon') continue
  const display = DISPLAY_BY_KEY.get(key)
  if (display) NAME_BY_HASH.set(entry.hash, display)
}

interface PublicMilestoneActivity {
  activityHash?: number | string
  activityModeType?: number | string
}

interface PublicMilestone {
  milestoneHash?: number | string
  activities?: PublicMilestoneActivity[]
  startDate?: string
  endDate?: string
  order?: number
}

interface DefinitionDisplay {
  displayProperties?: { name?: string; description?: string }
  friendlyName?: string
  directActivityModeType?: number
}

let inflight: Promise<void> | null = null
let inflightWeek: string | null = null
let failure: { weekStart: string; untilMs: number } | null = null

export type WeeklyMilestoneLoader = (now: Date) => Promise<FeaturedSelection | null>

function asNumber(value: number | string | undefined): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return undefined
}

function weekStartFor(now: Date): string {
  return getCurrentWeekResetStart(now).toISOString().slice(0, 10)
}

async function mapPool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length)
  let cursor = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor
      cursor += 1
      results[index] = await fn(items[index]!)
    }
  })
  await Promise.all(workers)
  return results
}

async function readDefinition(entityType: string, hash: number): Promise<DefinitionDisplay | null> {
  try {
    return (await getDestinyEntityDefinition(entityType, hash)) as DefinitionDisplay
  } catch {
    return null
  }
}

function milestoneEntries(response: unknown): Array<[string, PublicMilestone]> {
  if (!response || typeof response !== 'object') return []
  if (Array.isArray(response)) {
    return response.map((entry, index) => {
      const milestone = entry as PublicMilestone
      return [String(milestone.milestoneHash ?? index), milestone]
    })
  }
  return Object.entries(response as Record<string, PublicMilestone>)
}

function activityIsRelevant(activity: PublicMilestoneActivity): boolean {
  const mode = asNumber(activity.activityModeType)
  const hash = asNumber(activity.activityHash)
  return mode === RAID_ACTIVITY_MODE || mode === DUNGEON_ACTIVITY_MODE || (hash != null && NAME_BY_HASH.has(hash))
}

function milestoneText(definition: DefinitionDisplay | null): string {
  return `${definition?.displayProperties?.name ?? ''} ${definition?.friendlyName ?? ''} ${definition?.displayProperties?.description ?? ''}`.toLowerCase()
}

/** Featured, pantheon, nightfall, or anything that ends before the following reset. */
function milestoneLooksWeekly(definition: DefinitionDisplay | null, milestone: PublicMilestone, now: Date): boolean {
  const text = milestoneText(definition)
  if (/feature|rotator|pinnacle|pantheon|nightfall|grandmaster/.test(text)) return true
  if ((milestone.activities ?? []).some(activityIsRelevant)) return true
  if (!milestone.endDate) return false
  const end = Date.parse(milestone.endDate)
  return Number.isFinite(end) && end > now.getTime() && end <= now.getTime() + 8 * 24 * 60 * 60 * 1000
}

/** Fetch milestones and resolve activity names. Null when the API key is missing or the call fails. */
export async function loadBungieFeaturedSelection(now: Date): Promise<FeaturedSelection | null> {
  if (!destinyApiKey()) return null
  const response = await getPublicMilestones()
  const capped = milestoneEntries(response).slice(0, 50)

  const definitions = await mapPool(capped, 6, async ([hash, milestone]) => {
    const numeric = asNumber(milestone.milestoneHash) ?? asNumber(hash)
    const definition = numeric != null ? await readDefinition('DestinyMilestoneDefinition', numeric) : null
    return { hash, milestone, definition }
  })

  const weekly = definitions.filter(({ milestone, definition }) => milestoneLooksWeekly(definition, milestone, now))
  const unknownHashes: number[] = []
  const seenHashes = new Set<number>()
  for (const { milestone } of weekly) {
    for (const activity of milestone.activities ?? []) {
      const hash = asNumber(activity.activityHash)
      if (hash == null || NAME_BY_HASH.has(hash) || seenHashes.has(hash)) continue
      seenHashes.add(hash)
      unknownHashes.push(hash)
    }
  }

  const activityNames = new Map<number, { name?: string; mode?: number }>()
  await mapPool(unknownHashes.slice(0, 40), 6, async (hash) => {
    const definition = await readDefinition('DestinyActivityDefinition', hash)
    activityNames.set(hash, {
      name: definition?.displayProperties?.name,
      mode: definition?.directActivityModeType,
    })
  })

  const snapshots: WeeklyMilestoneSnapshot[] = weekly.map(({ hash, milestone, definition }) => ({
    milestoneHash: hash,
    name: definition?.displayProperties?.name,
    friendlyName: definition?.friendlyName,
    description: definition?.displayProperties?.description,
    order: milestone.order,
    startDate: milestone.startDate,
    endDate: milestone.endDate,
    activities: (milestone.activities ?? []).flatMap((activity) => {
      const activityHash = asNumber(activity.activityHash)
      const known = activityHash != null ? NAME_BY_HASH.get(activityHash) : undefined
      const resolved = activityHash != null ? activityNames.get(activityHash) : undefined
      const name = known ?? resolved?.name
      const mode = asNumber(activity.activityModeType) ?? resolved?.mode
      if (!name && mode !== RAID_ACTIVITY_MODE && mode !== DUNGEON_ACTIVITY_MODE) return []
      return [{ name, activityModeType: mode }]
    }),
  }))

  return selectFeaturedWeeklyActivities(snapshots, now)
}

export interface WeeklyRotationRefreshDeps {
  loadBungie?: WeeklyMilestoneLoader
  loadWeb?: (now: Date) => Promise<FeaturedSelection | null>
  store?: WeeklyRotationStore
}

function pairOf(names: string[] | undefined): string[] | undefined {
  return names && names.length >= 2 ? names.slice(0, 2) : undefined
}

function mergeFeatured(
  bungie: FeaturedSelection | null,
  web: FeaturedSelection | null
): { selection: FeaturedSelection; source: LiveRotationSource } | null {
  const raids = pairOf(bungie?.raids) ?? pairOf(web?.raids) ?? []
  const dungeons = pairOf(bungie?.dungeons) ?? pairOf(web?.dungeons) ?? []
  const pantheon = bungie?.pantheon || web?.pantheon
  const nightfall = bungie?.nightfall || web?.nightfall
  if (raids.length < 2 && dungeons.length < 2 && !pantheon && !nightfall) return null
  const raidsFrom = pairOf(bungie?.raids) ? 'bungie' : pairOf(web?.raids) ? 'web' : null
  const dungeonsFrom = pairOf(bungie?.dungeons) ? 'bungie' : pairOf(web?.dungeons) ? 'web' : null
  let source: LiveRotationSource = bungie ? 'bungie' : 'web'
  if (raidsFrom && dungeonsFrom) source = raidsFrom === dungeonsFrom ? raidsFrom : 'mixed'
  else if (raidsFrom) source = raidsFrom
  else if (dungeonsFrom) source = dungeonsFrom
  const ends = [bungie?.endsAtMs, web?.endsAtMs].filter((value): value is number => value != null && Number.isFinite(value))
  return {
    source,
    selection: {
      raids,
      dungeons,
      pantheon,
      nightfall,
      endsAtMs: ends.length ? Math.min(...ends) : undefined,
    },
  }
}

/** Remember a parsed week until the next reset, and not a moment longer. */
export function applyLiveFeaturedSelection(
  now: Date,
  selection: FeaturedSelection | null,
  source: LiveRotationSource = 'bungie'
): LiveFeaturedWeek | null {
  if (!selection) return null
  const raids = selection.raids.length >= 2 ? selection.raids.slice(0, 2) : undefined
  const dungeons = selection.dungeons.length >= 2 ? selection.dungeons.slice(0, 2) : undefined
  if (!raids && !dungeons && !selection.pantheon && !selection.nightfall) return null

  const nextReset = getNextWeeklyReset(now).getTime()
  let expiresAtMs = nextReset
  if (selection.endsAtMs != null && Number.isFinite(selection.endsAtMs)) {
    expiresAtMs = Math.min(expiresAtMs, selection.endsAtMs)
  }
  if (expiresAtMs <= now.getTime()) return null

  const entry: LiveFeaturedWeek = {
    weekStart: weekStartFor(now),
    expiresAtMs,
    raids,
    dungeons,
    pantheon: selection.pantheon,
    nightfall: selection.nightfall,
    source,
  }
  setLiveFeaturedWeek(entry, now.getTime())
  return entry
}

function noteFailure(weekStart: string, now: Date): void {
  const nextReset = getNextWeeklyReset(now).getTime()
  failure = { weekStart, untilMs: Math.min(now.getTime() + 60_000, nextReset) }
}

export async function refreshLiveWeeklyRotation(
  now = new Date(),
  loadOrDeps: WeeklyMilestoneLoader | WeeklyRotationRefreshDeps = loadBungieFeaturedSelection
): Promise<void> {
  const deps: WeeklyRotationRefreshDeps =
    typeof loadOrDeps === 'function' ? { loadBungie: loadOrDeps } : loadOrDeps
  const defaultPath = loadOrDeps === loadBungieFeaturedSelection
  const loadBungie = deps.loadBungie ?? loadBungieFeaturedSelection
  const loadWeb = deps.loadWeb ?? (defaultPath ? fetchScrapedFeaturedWeek : undefined)
  const store: WeeklyRotationStore | undefined =
    deps.store ?? (defaultPath ? { read: readMongoWeeklyRotation, write: writeMongoWeeklyRotation } : undefined)

  const weekStart = weekStartFor(now)
  if (getLiveFeaturedWeek(weekStart, now.getTime())) return
  if (store) {
    const cached = await store.read(weekStart, now.getTime())
    if (cached && (pairOf(cached.raids) || pairOf(cached.dungeons) || cached.pantheon || cached.nightfall)) {
      setLiveFeaturedWeek(cached, now.getTime())
      return
    }
  }
  if (failure && failure.weekStart === weekStart && now.getTime() < failure.untilMs) return
  if (inflight && inflightWeek === weekStart) {
    await inflight
    return
  }

  inflightWeek = weekStart
  inflight = (async () => {
    let bungie: FeaturedSelection | null = null
    let web: FeaturedSelection | null = null
    try {
      bungie = await loadBungie(now)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error'
      console.warn('[weekly] Bungie milestone refresh failed:', message)
    }
    const bungieComplete = Boolean(pairOf(bungie?.raids) && pairOf(bungie?.dungeons))
    if (!bungieComplete && loadWeb) {
      try {
        web = await loadWeb(now)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'unknown error'
        console.warn('[weekly] reset-post scrape failed:', message)
      }
    }
    const merged = mergeFeatured(bungie, web)
    if (!merged) {
      noteFailure(weekStart, now)
      return
    }
    const stored = applyLiveFeaturedSelection(now, merged.selection, merged.source)
    if (!stored) {
      noteFailure(weekStart, now)
      return
    }
    if (store) await store.write(stored)
  })()

  try {
    await inflight
  } finally {
    if (inflightWeek === weekStart) {
      inflight = null
      inflightWeek = null
    }
  }
}

/** User-facing callers should not wait on a slow Bungie response. */
export async function refreshLiveWeeklyRotationBounded(now = new Date(), timeoutMs = 5000): Promise<void> {
  await Promise.race([
    refreshLiveWeeklyRotation(now),
    new Promise<void>((resolve) => {
      setTimeout(resolve, timeoutMs)
    }),
  ])
}

export function clearBungieWeeklyCacheForTests(): void {
  clearLiveFeaturedWeek()
  failure = null
  inflight = null
  inflightWeek = null
}
