/**
 * Pure activity-history rules: classify Bungie modes, page through GetActivityHistory,
 * and roll stats up. Network and Mongo live elsewhere so this stays testable.
 */

import { pgcrStatValue, type BungieValueMap } from '@/lib/destiny/pgcrStats'

export const ACTIVITY_HISTORY_PAGE_SIZE = 250

export const DELETED_CHARACTER_HISTORY_REASON =
  'Bungie does not return individual activities for this deleted character.'

export const ACTIVITY_HISTORY_LIMITATIONS = [
  'History is paged newest-first, 250 runs at a time, for characters that still exist.',
  'Deleted characters can still have account totals in historical stats. Their individual runs are not available from GetActivityHistory.',
  'A clear is a run Bungie marked complete. Very short times can be checkpoints or partial encounters.',
  'Private runs are included for the signed-in Guardian. Some early or classified reports are missing on Bungie’s side.',
  'This is a personal, fan-made, non-commercial view. Top Nest is not affiliated with Bungie.',
] as const

export type ActivityHistoryKind =
  | 'raid'
  | 'dungeon'
  | 'nightfall'
  | 'strike'
  | 'crucible'
  | 'gambit'
  | 'dares'
  | 'lostSector'
  | 'story'
  | 'patrol'
  | 'social'
  | 'other'

const NIGHTFALL_MODES = new Set([16, 17, 46, 47])
const STRIKE_MODES = new Set([3, 18])
const GAMBIT_MODES = new Set([63, 75])
const PVP_MODES = new Set([
  5, 10, 12, 15, 19, 25, 31, 32, 37, 38, 39, 41, 42, 43, 44, 45, 48, 49, 50, 51, 52, 53, 54, 55, 56,
  57, 59, 60, 61, 62, 65, 69, 70, 71, 72, 73, 74, 80, 81, 84, 88, 89, 90, 91,
])

const KIND_LABELS: Record<ActivityHistoryKind, string> = {
  raid: 'Raids',
  dungeon: 'Dungeons',
  nightfall: 'Nightfalls',
  strike: 'Strikes',
  crucible: 'Crucible',
  gambit: 'Gambit',
  dares: 'Dares of Eternity',
  lostSector: 'Lost sectors',
  story: 'Story',
  patrol: 'Patrol',
  social: 'Social',
  other: 'Other',
}

export function activityKindLabel(kind: ActivityHistoryKind): string {
  return KIND_LABELS[kind] ?? 'Other'
}

export function classifyActivityModes(
  mode: number | undefined,
  modes: number[] | undefined
): ActivityHistoryKind {
  const all = new Set<number>()
  if (typeof mode === 'number' && Number.isFinite(mode)) all.add(mode)
  for (const value of modes ?? []) {
    if (typeof value === 'number' && Number.isFinite(value)) all.add(value)
  }
  const has = (id: number) => all.has(id)
  const hasAny = (ids: Set<number>) => {
    for (const id of Array.from(ids)) {
      if (all.has(id)) return true
    }
    return false
  }
  if (has(4)) return 'raid'
  if (has(82)) return 'dungeon'
  if (hasAny(NIGHTFALL_MODES)) return 'nightfall'
  if (has(85)) return 'dares'
  if (has(87)) return 'lostSector'
  if (hasAny(GAMBIT_MODES)) return 'gambit'
  if (hasAny(STRIKE_MODES)) return 'strike'
  for (const id of Array.from(all)) {
    if (PVP_MODES.has(id)) return 'crucible'
  }
  if (has(2)) return 'story'
  if (has(6)) return 'patrol'
  if (has(40)) return 'social'
  return 'other'
}

export interface RawHistoryActivity {
  period?: string
  activityDetails?: {
    referenceId?: number | string
    directorActivityHash?: number | string
    instanceId?: string | number
    mode?: number
    modes?: number[]
    isPrivate?: boolean
    completionReason?: number
  }
  values?: BungieValueMap
}

export interface ParsedHistoryActivity {
  instanceId: string
  period: string
  referenceId: number
  directorActivityHash: number
  mode: number
  modes: number[]
  activityType: ActivityHistoryKind
  kills: number
  deaths: number
  assists: number
  score: number
  completed: boolean
  completionReason: number
  timePlayedSeconds: number
  durationSeconds: number
  isPrivate: boolean
}

function finiteNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return 0
}

export function fallbackActivityName(referenceId: number): string {
  return referenceId > 0 ? `Activity ${referenceId}` : 'Unknown activity'
}

export function parseHistoryActivity(row: RawHistoryActivity): ParsedHistoryActivity | null {
  const instanceId = row.activityDetails?.instanceId
  if (instanceId == null || String(instanceId).trim() === '') return null

  const referenceId = finiteNumber(row.activityDetails?.referenceId)
  const directorActivityHash = finiteNumber(row.activityDetails?.directorActivityHash)
  const mode = finiteNumber(row.activityDetails?.mode)
  const modes = (row.activityDetails?.modes ?? []).map((value) => finiteNumber(value))
  const completionReason = finiteNumber(
    row.activityDetails?.completionReason ?? pgcrStatValue(row.values, 'completionReason')
  )
  const timePlayedSeconds = pgcrStatValue(row.values, 'timePlayedSeconds')
  const durationSeconds =
    pgcrStatValue(row.values, 'activityDurationSeconds') || timePlayedSeconds
  const period = row.period && !Number.isNaN(Date.parse(row.period)) ? row.period : ''

  return {
    instanceId: String(instanceId),
    period,
    referenceId,
    directorActivityHash,
    mode,
    modes,
    activityType: classifyActivityModes(mode, modes),
    kills: pgcrStatValue(row.values, 'kills'),
    deaths: pgcrStatValue(row.values, 'deaths'),
    assists: pgcrStatValue(row.values, 'assists'),
    score: pgcrStatValue(row.values, 'score'),
    completed: completionReason === 0,
    completionReason,
    timePlayedSeconds,
    durationSeconds,
    isPrivate: row.activityDetails?.isPrivate === true,
  }
}

export interface ActivityStatBucket {
  runs: number
  clears: number
  kills: number
  deaths: number
  kd: number
  timePlayedSeconds: number
  fastestClearSeconds: number | null
}

export function emptyStatBucket(): ActivityStatBucket {
  return {
    runs: 0,
    clears: 0,
    kills: 0,
    deaths: 0,
    kd: 0,
    timePlayedSeconds: 0,
    fastestClearSeconds: null,
  }
}

/** Kills per death. With no deaths, the ratio is the kill count (Bungie’s own fallback). */
export function kdRatio(kills: number, deaths: number): number {
  if (!Number.isFinite(kills) || kills < 0) return 0
  if (!Number.isFinite(deaths) || deaths <= 0) return kills
  return kills / deaths
}

export function formatKd(kills: number, deaths: number): string {
  return kdRatio(kills, deaths).toFixed(2)
}

export function formatPlayedTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0m'
  const total = Math.floor(seconds)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

export function formatClearTime(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return '—'
  const total = Math.floor(seconds)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secs = total % 60
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }
  return `${minutes}:${String(secs).padStart(2, '0')}`
}

export function addRunToBucket(
  bucket: ActivityStatBucket,
  run: Pick<ParsedHistoryActivity, 'completed' | 'kills' | 'deaths' | 'timePlayedSeconds' | 'durationSeconds'>
): void {
  bucket.runs += 1
  if (run.completed) bucket.clears += 1
  bucket.kills += run.kills
  bucket.deaths += run.deaths
  bucket.timePlayedSeconds += run.timePlayedSeconds > 0 ? run.timePlayedSeconds : run.durationSeconds
  if (run.completed && run.durationSeconds > 0) {
    if (bucket.fastestClearSeconds == null || run.durationSeconds < bucket.fastestClearSeconds) {
      bucket.fastestClearSeconds = run.durationSeconds
    }
  }
  bucket.kd = kdRatio(bucket.kills, bucket.deaths)
}

export interface HistoryCharacterCursor {
  key: string
  membershipType: number
  membershipId: string
  characterId: string
  classLabel: string
  platformLabel: string
  light?: number
  deleted: boolean
  backfillComplete: boolean
  resumePage: number
  anchorInstanceId?: string
  newestInstanceId?: string
  pendingNewestInstanceId?: string
  incrementalDone: boolean
  incrementalPage: number
  pagesFetched: number
  activitiesSeen: number
  unavailableReason?: string
  historical?: {
    activitiesEntered: number
    kills: number
    deaths: number
    secondsPlayed: number
  }
}

export function newCharacterCursor(input: {
  membershipType: number
  membershipId: string
  characterId: string
  classLabel: string
  platformLabel: string
  light?: number
  deleted: boolean
  historical?: HistoryCharacterCursor['historical']
}): HistoryCharacterCursor {
  return {
    key: `${input.membershipType}:${input.membershipId}:${input.characterId}`,
    membershipType: input.membershipType,
    membershipId: input.membershipId,
    characterId: input.characterId,
    classLabel: input.classLabel,
    platformLabel: input.platformLabel,
    light: input.light,
    deleted: input.deleted,
    backfillComplete: false,
    resumePage: 0,
    incrementalDone: false,
    incrementalPage: 0,
    pagesFetched: 0,
    activitiesSeen: 0,
    historical: input.historical,
  }
}

export function resolveResumePage(input: {
  resumePage: number
  anchorInstanceId?: string
  headInstanceId?: string
}): number {
  if (input.resumePage <= 0) return 0
  if (!input.anchorInstanceId || !input.headInstanceId) return 0
  if (input.headInstanceId !== input.anchorInstanceId) return 0
  return input.resumePage
}

export function takeNewActivities<T extends { instanceId: string }>(
  rows: T[],
  newestInstanceId?: string
): { fresh: T[]; reachedKnown: boolean } {
  if (!newestInstanceId) return { fresh: rows, reachedKnown: false }
  const index = rows.findIndex((row) => row.instanceId === newestInstanceId)
  if (index === -1) return { fresh: rows, reachedKnown: false }
  return { fresh: rows.slice(0, index), reachedKnown: true }
}

export function pageExhausted(rowCount: number, pageSize = ACTIVITY_HISTORY_PAGE_SIZE): boolean {
  return rowCount < pageSize
}

export function consumeHistoryPage(
  cursor: HistoryCharacterCursor,
  page: number,
  rows: ParsedHistoryActivity[],
  mode: 'backfill' | 'incremental'
): { cursor: HistoryCharacterCursor; upserts: ParsedHistoryActivity[]; done: boolean } {
  const next: HistoryCharacterCursor = {
    ...cursor,
    pagesFetched: cursor.pagesFetched + 1,
  }

  if (mode === 'backfill') {
    if (page === 0 && rows[0]) {
      next.anchorInstanceId = rows[0].instanceId
      next.newestInstanceId = rows[0].instanceId
    }
    next.activitiesSeen += rows.length
    next.resumePage = page + 1
    if (pageExhausted(rows.length)) {
      next.backfillComplete = true
      next.incrementalDone = true
      next.incrementalPage = 0
      return { cursor: next, upserts: rows, done: true }
    }
    return { cursor: next, upserts: rows, done: false }
  }

  const { fresh, reachedKnown } = takeNewActivities(rows, cursor.newestInstanceId)
  if (page === 0 && rows[0]) next.pendingNewestInstanceId = rows[0].instanceId
  next.incrementalPage = page + 1

  const finish = (): { cursor: HistoryCharacterCursor; upserts: ParsedHistoryActivity[]; done: boolean } => {
    const newest = next.pendingNewestInstanceId || (page === 0 ? rows[0]?.instanceId : undefined)
    if (newest) {
      next.newestInstanceId = newest
      next.anchorInstanceId = newest
    }
    next.pendingNewestInstanceId = undefined
    next.incrementalDone = true
    next.incrementalPage = 0
    next.backfillComplete = true
    return { cursor: next, upserts: fresh, done: true }
  }

  if (reachedKnown || pageExhausted(rows.length)) return finish()
  return { cursor: next, upserts: fresh, done: false }
}

export async function advanceCharacterSync(
  cursor: HistoryCharacterCursor,
  fetchPage: (page: number) => Promise<ParsedHistoryActivity[]>,
  pageBudget: number
): Promise<{ cursor: HistoryCharacterCursor; upserts: ParsedHistoryActivity[]; pagesUsed: number }> {
  if (cursor.unavailableReason || pageBudget <= 0) {
    return { cursor, upserts: [], pagesUsed: 0 }
  }

  const mode: 'backfill' | 'incremental' = cursor.backfillComplete ? 'incremental' : 'backfill'
  if (mode === 'incremental' && cursor.incrementalDone) {
    return { cursor, upserts: [], pagesUsed: 0 }
  }

  let pagesUsed = 0
  const upserts: ParsedHistoryActivity[] = []
  let current = cursor
  let page = mode === 'incremental' ? current.incrementalPage : current.resumePage

  if (page > 0) {
    const anchor = mode === 'incremental' ? current.pendingNewestInstanceId : current.anchorInstanceId
    const head = await fetchPage(0)
    pagesUsed += 1
    const headId = head[0]?.instanceId
    const resume = resolveResumePage({
      resumePage: page,
      anchorInstanceId: anchor,
      headInstanceId: headId,
    })
    if (resume !== page) {
      if (mode === 'incremental') {
        current = { ...current, incrementalPage: 0, pendingNewestInstanceId: undefined }
      } else {
        current = { ...current, resumePage: 0 }
      }
      const consumed = consumeHistoryPage(current, 0, head, mode)
      current = consumed.cursor
      upserts.push(...consumed.upserts)
      if (consumed.done || pagesUsed >= pageBudget) {
        return { cursor: current, upserts, pagesUsed }
      }
      page = mode === 'incremental' ? current.incrementalPage : current.resumePage
    }
  }

  while (pagesUsed < pageBudget) {
    const rows = await fetchPage(page)
    pagesUsed += 1
    const consumed = consumeHistoryPage(current, page, rows, mode)
    current = consumed.cursor
    upserts.push(...consumed.upserts)
    if (consumed.done) break
    page = mode === 'incremental' ? current.incrementalPage : current.resumePage
  }

  return { cursor: current, upserts, pagesUsed }
}

export function nextSyncCharacter(
  characters: HistoryCharacterCursor[]
): { cursor: HistoryCharacterCursor; index: number } | null {
  const backfill = characters.findIndex((cursor) => !cursor.unavailableReason && !cursor.backfillComplete)
  if (backfill >= 0) return { cursor: characters[backfill], index: backfill }
  const incremental = characters.findIndex(
    (cursor) => !cursor.unavailableReason && cursor.backfillComplete && !cursor.incrementalDone
  )
  if (incremental >= 0) return { cursor: characters[incremental], index: incremental }
  return null
}

export function isSyncComplete(characters: HistoryCharacterCursor[]): boolean {
  if (!characters.length) return false
  return characters.every(
    (cursor) => cursor.unavailableReason || (cursor.backfillComplete && cursor.incrementalDone)
  )
}

export function prepareSyncPass(characters: HistoryCharacterCursor[]): HistoryCharacterCursor[] {
  return characters.map((cursor) =>
    cursor.backfillComplete
      ? {
          ...cursor,
          incrementalDone: false,
          incrementalPage: 0,
          pendingNewestInstanceId: undefined,
        }
      : cursor
  )
}

export function mergeCharacterCursors(
  previous: HistoryCharacterCursor[],
  discovered: HistoryCharacterCursor[]
): HistoryCharacterCursor[] {
  const prevByKey = new Map(previous.map((cursor) => [cursor.key, cursor]))
  const discoveredKeys = new Set(discovered.map((cursor) => cursor.key))
  const merged = discovered.map((cursor) => {
    const old = prevByKey.get(cursor.key)
    if (!old) return cursor
    return {
      ...cursor,
      backfillComplete: old.backfillComplete,
      resumePage: old.resumePage,
      anchorInstanceId: old.anchorInstanceId,
      newestInstanceId: old.newestInstanceId,
      pendingNewestInstanceId: old.pendingNewestInstanceId,
      incrementalDone: old.incrementalDone,
      incrementalPage: old.incrementalPage,
      pagesFetched: old.pagesFetched,
      activitiesSeen: old.activitiesSeen,
      unavailableReason: old.unavailableReason,
      historical: cursor.historical ?? old.historical,
      classLabel: cursor.classLabel || old.classLabel,
      light: cursor.light ?? old.light,
      deleted: cursor.deleted,
      platformLabel: cursor.platformLabel || old.platformLabel,
    }
  })
  const kept = previous.filter(
    (cursor) =>
      !discoveredKeys.has(cursor.key) &&
      (cursor.backfillComplete || cursor.activitiesSeen > 0 || Boolean(cursor.unavailableReason))
  )
  return [...merged, ...kept]
}

export function syncProgressPercent(
  characters: HistoryCharacterCursor[],
  activitiesStored: number
): number {
  if (!characters.length) return 0
  if (isSyncComplete(characters)) return 100

  const living = characters.filter((cursor) => !cursor.unavailableReason)
  const estimate = living.reduce((sum, cursor) => sum + (cursor.historical?.activitiesEntered ?? 0), 0)
  if (estimate > 0) {
    const ratio = activitiesStored / estimate
    return Math.max(1, Math.min(99, Math.round(ratio * 100)))
  }

  const done = characters.filter((cursor) => cursor.unavailableReason || cursor.backfillComplete).length
  const partial = living.some((cursor) => !cursor.backfillComplete && cursor.pagesFetched > 0) ? 0.2 : 0
  return Math.max(1, Math.min(99, Math.round(((done + partial) / characters.length) * 100)))
}

export function classLabelFromType(classType: number | undefined, deleted: boolean): string {
  if (deleted) return 'Deleted character'
  if (classType === 0) return 'Titan'
  if (classType === 1) return 'Hunter'
  if (classType === 2) return 'Warlock'
  return 'Guardian'
}

export function platformDisplay(label: string): string {
  switch (label) {
    case 'battle.net':
      return 'Battle.net'
    case 'stadia':
      return 'Stadia'
    case 'epic':
      return 'Epic'
    case 'playstation':
      return 'PlayStation'
    case 'xbox':
      return 'Xbox'
    case 'steam':
      return 'Steam'
    default:
      return 'Destiny'
  }
}

export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export interface HistoricalCharacterSummary {
  characterId: string
  deleted: boolean
  activitiesEntered: number
  kills: number
  deaths: number
  secondsPlayed: number
}

function readBasic(node: unknown, key: string): number {
  if (!node || typeof node !== 'object') return 0
  const block = (node as Record<string, unknown>)[key]
  if (!block || typeof block !== 'object') return 0
  const basic = (block as { basic?: { value?: unknown } }).basic
  return finiteNumber(basic?.value)
}

function summarizeResults(results: unknown): Omit<HistoricalCharacterSummary, 'characterId' | 'deleted'> {
  const totals = { activitiesEntered: 0, kills: 0, deaths: 0, secondsPlayed: 0 }
  if (!results || typeof results !== 'object') return totals
  for (const group of ['allPvE', 'allPvP'] as const) {
    const allTime = (results as Record<string, { allTime?: unknown } | undefined>)[group]?.allTime
    totals.activitiesEntered += readBasic(allTime, 'activitiesEntered')
    totals.kills += readBasic(allTime, 'kills')
    totals.deaths += readBasic(allTime, 'deaths')
    totals.secondsPlayed += readBasic(allTime, 'secondsPlayed')
  }
  return totals
}

/** Pull per-character historical totals, including characters flagged deleted. */
export function parseHistoricalCharacters(payload: unknown): HistoricalCharacterSummary[] {
  if (!payload || typeof payload !== 'object') return []
  const characters = (payload as { characters?: unknown }).characters
  if (!Array.isArray(characters)) return []
  const parsed: HistoricalCharacterSummary[] = []
  for (const row of characters) {
    if (!row || typeof row !== 'object') continue
    const characterId = (row as { characterId?: unknown }).characterId
    if (characterId == null || String(characterId).trim() === '') continue
    const results = (row as { results?: unknown }).results
    parsed.push({
      characterId: String(characterId),
      deleted: (row as { deleted?: unknown }).deleted === true,
      ...summarizeResults(results),
    })
  }
  return parsed
}

export interface ProfileCharacterSummary {
  characterId: string
  classType?: number
  light?: number
}

export function parseProfileCharacters(payload: unknown): ProfileCharacterSummary[] {
  if (!payload || typeof payload !== 'object') return []
  const data = (payload as { characters?: { data?: Record<string, unknown> } }).characters?.data
  if (!data || typeof data !== 'object') return []
  return Object.entries(data).map(([characterId, value]) => {
    const row = value && typeof value === 'object' ? (value as { classType?: unknown; light?: unknown }) : {}
    const classType = finiteNumber(row.classType)
    const light = finiteNumber(row.light)
    return {
      characterId,
      classType: row.classType == null ? undefined : classType,
      light: row.light == null ? undefined : light,
    }
  })
}
