import { getConfiguredActiveSeason } from '@/lib/destiny/seasonConfig'

/** Preseason opens Oct 1 2026, midnight America/Vancouver. Older runs never score on a season board. */
export const NEST_LAUNCH_ISO = '2026-10-01T07:00:00.000Z'

export function nestLaunchUtcMs(): number {
  return Date.parse(NEST_LAUNCH_ISO)
}

/** True when the run is on or after the preseason open (Oct 1 2026, America/Vancouver). */
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
 * True when the clear's timestamp sits inside the active window.
 * Preseason is Oct 1–Dec 31 2026. Season 1 is Jan 1–Mar 31 2027. A flag cannot pull a clear across that line.
 */
export function isRunInActiveSeasonPacific(
  completedAt: string | Date,
  now = new Date(),
  _scoredInActiveSeason = false
): boolean {
  const season = getConfiguredActiveSeason(now)
  const at = new Date(completedAt).getTime()
  return at >= Date.parse(season.startDate) && at <= Date.parse(season.endDate)
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
