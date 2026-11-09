/**
 * This week's featured raids and dungeons, plus whether a Guardian completed
 * them since the Tuesday 17:00 UTC reset.
 *
 * A "clear" is a Bungie activity-history row with completionReason 0 at or
 * after reset. It includes checkpoint finishes. It is not a TopNest score.
 *
 * Sources: Destiny2.GetPublicMilestones for the featured list (already resolved
 * by weeklyRotation) and Destiny2.GetActivityHistory mode 4 (Raid) and 82
 * (Dungeon). See docs/PLAYER_RESEARCH.md.
 */

import { ACTIVITY_CATALOG } from '@/lib/destiny/activityCatalog'
import { normalizeActivityKey } from '@/lib/destiny/activityIconPaths'
import { isActivityHistoryCompleted, type ActivityHistoryRowLike } from '@/lib/destiny/pgcrStats'
import type { WeeklyResetState } from '@/lib/destiny/weeklyRotation'

export type WeekActivityKind = 'raid' | 'dungeon'
export type ClearState = 'cleared' | 'not_cleared' | 'unknown'
export type RotationSource = WeeklyResetState['rotationSource']

export interface WeekChecklistActivity {
  key: string
  name: string
  kind: WeekActivityKind
  iconUrl?: string
}

export interface WeekClear {
  state: ClearState
  completedAt?: string
}

export interface RawHistoryActivity {
  period?: string
  values?: ActivityHistoryRowLike['values']
  activityDetails?: {
    completionReason?: number
    instanceId?: string
    referenceId?: number | string
    directorActivityHash?: number | string
  }
}

export type PersonalWeekStatus =
  | { status: 'signed_out'; message: string }
  | { status: 'needs_link'; message: string }
  | { status: 'unavailable'; message: string }
  | {
      status: 'ready'
      displayName?: string
      message: string
      clears: Record<string, WeekClear>
    }

export interface WeekPayload {
  weekLabel: string
  resetsInLabel: string
  resetAt: string
  nextResetAt: string
  rotationSource: RotationSource
  sourceLabel: string
  activities: WeekChecklistActivity[]
  note: string
  personal: PersonalWeekStatus
}

export const WEEK_CLEAR_NOTE =
  'A clear means Bungie recorded a completion since Tuesday 17:00 UTC. A finish that started at a checkpoint still counts. It is not a TopNest leaderboard score.'

export const SIGNED_OUT_MESSAGE =
  'Sign in with Bungie to see which of these you already cleared this week.'

export const NEEDS_LINK_MESSAGE =
  'Bungie needs to be linked again before your clears can be checked.'

const HASH_TO_KEY = new Map<number, string>()
for (const [key, entry] of Object.entries(ACTIVITY_CATALOG)) {
  if (key === 'pantheon') continue
  if (!HASH_TO_KEY.has(entry.hash)) HASH_TO_KEY.set(entry.hash, key)
}

export function activityIconUrl(name: string): string | undefined {
  const path = ACTIVITY_CATALOG[normalizeActivityKey(name)]?.iconPath
  if (!path) return undefined
  return path.startsWith('http') ? path : `https://www.bungie.net${path}`
}

export function activitiesFromNames(raids: string[], dungeons: string[]): WeekChecklistActivity[] {
  const rows: WeekChecklistActivity[] = []
  for (const name of raids) {
    const key = normalizeActivityKey(name)
    if (!key) continue
    rows.push({ key: `raid:${key}`, name, kind: 'raid', iconUrl: activityIconUrl(name) })
  }
  for (const name of dungeons) {
    const key = normalizeActivityKey(name)
    if (!key) continue
    rows.push({ key: `dungeon:${key}`, name, kind: 'dungeon', iconUrl: activityIconUrl(name) })
  }
  return rows
}

export function rotationSourceLabel(source: RotationSource): string {
  switch (source) {
    case 'bungie':
      return 'From Bungie milestones.'
    case 'web':
      return 'Live milestones were unavailable. This list is from a saved weekly post.'
    case 'mixed':
      return 'Part of this list is from Bungie milestones. The rest is the backup calendar.'
    default:
      return 'Live milestones were unavailable. This list is the backup calendar. Confirm it in the Director before you rely on it.'
  }
}

export function clearStatusLabel(state: ClearState | 'not_checked'): string {
  switch (state) {
    case 'cleared':
      return 'Cleared'
    case 'not_cleared':
      return 'Not yet'
    case 'unknown':
      return 'Could not check'
    default:
      return 'Not checked'
  }
}

function asHash(value: number | string | undefined): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return undefined
}

export function periodMs(value?: string): number | null {
  if (!value) return null
  const ms = Date.parse(value)
  return Number.isFinite(ms) ? ms : null
}

/** Catalog key for a history row, when the hash or resolved name is one we know. */
export function historyActivityKey(row: RawHistoryActivity, resolvedName?: string | null): string | undefined {
  const hashes = [
    asHash(row.activityDetails?.referenceId),
    asHash(row.activityDetails?.directorActivityHash),
  ]
  for (const hash of hashes) {
    if (hash == null) continue
    const key = HASH_TO_KEY.get(hash)
    if (key) return key
  }
  if (!resolvedName) return undefined
  const key = normalizeActivityKey(resolvedName)
  if (key && key !== 'pantheon' && ACTIVITY_CATALOG[key]) return key
  return undefined
}

export interface InterpretedHistoryRow {
  period?: string
  completed: boolean | undefined
  activityKey?: string
  /** True when a completed in-window row could not be named. */
  unresolved: boolean
}

export function interpretHistoryRow(row: RawHistoryActivity, resetAtMs: number, resolvedName?: string | null): InterpretedHistoryRow | null {
  const referenceId = asHash(row.activityDetails?.referenceId)
  const completed = isActivityHistoryCompleted({
    period: row.period,
    values: row.values,
    activityDetails: row.activityDetails
      ? {
          completionReason: row.activityDetails.completionReason,
          instanceId: row.activityDetails.instanceId,
          referenceId,
        }
      : undefined,
  })
  const ms = periodMs(row.period)
  if (ms != null && ms < resetAtMs) return null
  const activityKey = historyActivityKey(row, resolvedName)
  const inWindow = ms == null || ms >= resetAtMs
  const unresolved = Boolean(inWindow && completed === true && !activityKey && !resolvedName)
  if (!inWindow) return null
  return { period: row.period, completed, activityKey, unresolved }
}

export function summarizeWeekClears(input: {
  activities: WeekChecklistActivity[]
  rows: InterpretedHistoryRow[]
  reachedReset: boolean
}): Record<string, WeekClear> {
  const unresolved = input.rows.some((row) => row.unresolved)
  const latest = new Map<string, string | undefined>()
  for (const row of input.rows) {
    if (row.completed !== true || !row.activityKey) continue
    const previous = latest.get(row.activityKey)
    const next = row.period
    if (!previous || (next && next > previous)) latest.set(row.activityKey, next ?? previous)
    else if (!latest.has(row.activityKey)) latest.set(row.activityKey, next)
  }

  const clears: Record<string, WeekClear> = {}
  for (const activity of input.activities) {
    const catalogKey = activity.key.split(':').slice(1).join(':')
    if (latest.has(catalogKey)) {
      const completedAt = latest.get(catalogKey)
      clears[activity.key] = completedAt ? { state: 'cleared', completedAt } : { state: 'cleared' }
      continue
    }
    if (!input.reachedReset || unresolved) {
      clears[activity.key] = { state: 'unknown' }
      continue
    }
    clears[activity.key] = { state: 'not_cleared' }
  }
  return clears
}

export async function readModeHistory(
  fetchPage: (page: number) => Promise<{ activities?: RawHistoryActivity[] }>,
  options: { resetAtMs: number; maxPages?: number; pageSize?: number }
): Promise<{ activities: RawHistoryActivity[]; reachedReset: boolean }> {
  const maxPages = options.maxPages ?? 2
  const pageSize = options.pageSize ?? 25
  const kept: RawHistoryActivity[] = []
  let reachedReset = false

  for (let page = 0; page < maxPages; page += 1) {
    let batch: { activities?: RawHistoryActivity[] }
    try {
      batch = await fetchPage(page)
    } catch {
      return { activities: kept, reachedReset: false }
    }
    const rows = batch.activities ?? []
    if (!rows.length) {
      reachedReset = true
      break
    }
    for (const row of rows) {
      const ms = periodMs(row.period)
      if (ms != null && ms < options.resetAtMs) {
        reachedReset = true
        break
      }
      kept.push(row)
    }
    if (reachedReset || rows.length < pageSize) {
      reachedReset = true
      break
    }
  }

  return { activities: kept, reachedReset }
}

export function readyMessage(clears: Record<string, WeekClear>): string {
  const states = Object.values(clears).map((clear) => clear.state)
  if (states.some((state) => state === 'unknown')) {
    return 'Some activity history did not load. A row marked Could not check might still be a clear.'
  }
  return 'Checked raid and dungeon history since this week’s reset.'
}

export interface WeekAccount {
  bungieMembershipId?: string
  destinyMembershipType?: number
  bungieDisplayName?: string
}

export interface WeekHistoryDeps {
  getCharacterIds: (membershipType: number, membershipId: string, token: string) => Promise<string[]>
  fetchPage: (
    membershipType: number,
    membershipId: string,
    characterId: string,
    mode: number,
    page: number,
    token: string
  ) => Promise<{ activities?: RawHistoryActivity[] }>
  resolveName: (hash: number) => Promise<string | null>
}

const RAID_MODE = 4
const DUNGEON_MODE = 82
const MAX_CHARACTERS = 6

function hashOf(row: RawHistoryActivity): number | undefined {
  return asHash(row.activityDetails?.directorActivityHash) ?? asHash(row.activityDetails?.referenceId)
}

export async function loadPersonalWeek(input: {
  account: WeekAccount | null
  token: string | null
  resetAt: string
  activities: WeekChecklistActivity[]
  deps: WeekHistoryDeps
}): Promise<PersonalWeekStatus> {
  const account = input.account
  const membershipId = account?.bungieMembershipId?.trim()
  const membershipType = account?.destinyMembershipType
  if (!account || !membershipId || membershipType == null || !input.token) {
    return { status: 'needs_link', message: NEEDS_LINK_MESSAGE }
  }

  const resetAtMs = periodMs(input.resetAt)
  if (resetAtMs == null) {
    return { status: 'unavailable', message: 'The weekly reset time was missing, so clears could not be checked.' }
  }

  let characterIds: string[]
  try {
    characterIds = (await input.deps.getCharacterIds(membershipType, membershipId, input.token)).slice(0, MAX_CHARACTERS)
  } catch {
    return {
      status: 'unavailable',
      message: 'Bungie did not return your characters, so clears could not be checked.',
    }
  }
  if (!characterIds.length) {
    return {
      status: 'unavailable',
      message: 'Bungie did not return any characters for this account.',
    }
  }

  const tasks = characterIds.flatMap((characterId) =>
    [RAID_MODE, DUNGEON_MODE].map((mode) => ({ characterId, mode }))
  )

  let reachedReset = true
  const rawRows: RawHistoryActivity[] = []
  const workers = Array.from({ length: Math.min(3, tasks.length) }, async () => {
    while (tasks.length) {
      const task = tasks.shift()
      if (!task) return
      const page = await readModeHistory(
        (pageIndex) =>
          input.deps.fetchPage(
            membershipType,
            membershipId,
            task.characterId,
            task.mode,
            pageIndex,
            input.token as string
          ),
        { resetAtMs }
      )
      if (!page.reachedReset) reachedReset = false
      rawRows.push(...page.activities)
    }
  })
  await Promise.all(workers)

  const interpreted: InterpretedHistoryRow[] = []
  for (const row of rawRows) {
    const hash = hashOf(row)
    let resolvedName: string | null = null
    if (hash != null && !HASH_TO_KEY.has(hash)) {
      try {
        resolvedName = await input.deps.resolveName(hash)
      } catch {
        resolvedName = null
      }
    }
    const next = interpretHistoryRow(row, resetAtMs, resolvedName)
    if (next) interpreted.push(next)
  }

  const clears = summarizeWeekClears({
    activities: input.activities,
    rows: interpreted,
    reachedReset,
  })
  return {
    status: 'ready',
    displayName: account.bungieDisplayName,
    message: readyMessage(clears),
    clears,
  }
}

export function buildWeekPayload(state: WeeklyResetState, personal: PersonalWeekStatus): WeekPayload {
  return {
    weekLabel: state.weekLabel,
    resetsInLabel: state.resetsInLabel,
    resetAt: state.resetAt,
    nextResetAt: state.nextResetAt,
    rotationSource: state.rotationSource,
    sourceLabel: rotationSourceLabel(state.rotationSource),
    activities: activitiesFromNames(
      state.featuredRaids.map((raid) => raid.name),
      state.featuredDungeons.map((dungeon) => dungeon.name)
    ),
    note: WEEK_CLEAR_NOTE,
    personal,
  }
}
