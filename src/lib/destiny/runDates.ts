import { getConfiguredActiveSeason } from '@/lib/destiny/seasonConfig'

/** July 6 2026 1:00 AM America/Los_Angeles — Top Nest run window opens (PDT, UTC-7). */
/** Season 1 (quarterly) start — Oct 1 2026, Pacific midnight. Older runs never score. */
export const NEST_LAUNCH_ISO = '2026-10-01T07:00:00.000Z'

export function nestLaunchUtcMs(): number {
  return Date.parse(NEST_LAUNCH_ISO)
}

function pacificCalendarDate(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(date)
}

function activeSeasonStartPacific(now = new Date()): string {
  const season = getConfiguredActiveSeason(now)
  return pacificCalendarDate(new Date(season.startDate))
}

/** True when the run is on or after the Top Nest launch instant (July 6 2026 1am Pacific). */
export function isRunAtOrAfterNestLaunch(completedAt: string | Date): boolean {
  return new Date(completedAt).getTime() >= nestLaunchUtcMs()
}

/**
 * Launch-date fragment. Scoring queries must not use this alone: history pages
 * marked `scoredInActiveSeason` are older than launch and still count.
 * Use `withScoredRuns` for loadAllRuns, player run lists, and standings.
 */
export function nestLaunchMongoFilter(): { completedAt: { $gte: string } } {
  return { completedAt: { $gte: NEST_LAUNCH_ISO } }
}

/**
 * Runs that count for profiles and season boards: launch-window clears, plus
 * older clears a player explicitly added (`scoredInActiveSeason`).
 */
export function scoredRunsMongoFilter(): { $or: Array<Record<string, unknown>> } {
  return {
    $or: [{ completedAt: { $gte: NEST_LAUNCH_ISO } }, { scoredInActiveSeason: true }],
  }
}

/** Combine a query with the scored-run window without dropping an existing `$or`. */
export function withScoredRuns(filter: Record<string, unknown> = {}): Record<string, unknown> {
  const scored = scoredRunsMongoFilter()
  if (filter.$or) {
    const { $or, ...rest } = filter
    const existingAnd = Array.isArray(rest.$and) ? rest.$and : []
    return { ...rest, $and: [...existingAnd, { $or }, scored] }
  }
  if (Array.isArray(filter.$and)) {
    return { ...filter, $and: [...filter.$and, scored] }
  }
  return { ...filter, ...scored }
}

/**
 * True when the run falls within the active season window (Pacific calendar days).
 * A history-page clear (`scoredInActiveSeason`) stays in season standings even when
 * `completedAt` is before launch or `season.startDate`.
 */
export function isRunInActiveSeasonPacific(
  completedAt: string | Date,
  now = new Date(),
  scoredInActiveSeason = false
): boolean {
  if (scoredInActiveSeason) return true
  if (!isRunAtOrAfterNestLaunch(completedAt)) return false
  const runDay = pacificCalendarDate(new Date(completedAt))
  return runDay >= activeSeasonStartPacific(now)
}

function sortRunsNewestFirst<T extends { completedAt: string }>(runs: T[]): T[] {
  return [...runs].sort(
    (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
  )
}

/** Most recent runs first — launch clears, plus older clears added to scoring. */
export function recentRunsFrom<T extends { completedAt: string; scoredInActiveSeason?: boolean }>(
  runs: T[],
  limit = 10
): T[] {
  return sortRunsNewestFirst(runs)
    .filter((run) => Boolean(run.scoredInActiveSeason) || isRunAtOrAfterNestLaunch(run.completedAt))
    .slice(0, limit)
}
