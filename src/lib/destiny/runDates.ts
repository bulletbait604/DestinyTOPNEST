import { getConfiguredActiveSeason } from '@/lib/destiny/seasonConfig'

/** Pacific calendar date (YYYY-MM-DD) for Destiny-aligned "today". */
export function pacificCalendarDate(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(date)
}

/** True when the run completed on or after today's date in Pacific Time. */
export function isRunOnOrAfterTodayPacific(completedAt: string | Date): boolean {
  const runDay = pacificCalendarDate(new Date(completedAt))
  const today = pacificCalendarDate()
  return runDay >= today
}

/** Active Nest season start as a Pacific calendar day (YYYY-MM-DD). */
export function activeSeasonStartPacific(now = new Date()): string {
  const season = getConfiguredActiveSeason(now)
  return pacificCalendarDate(new Date(season.startDate))
}

/** True when the run falls within the active season window (Pacific calendar days). */
export function isRunInActiveSeasonPacific(completedAt: string | Date, now = new Date()): boolean {
  const runDay = pacificCalendarDate(new Date(completedAt))
  return runDay >= activeSeasonStartPacific(now)
}

export function filterRunsFromTodayPacific<T extends { completedAt: string }>(runs: T[]): T[] {
  return runs.filter((run) => isRunOnOrAfterTodayPacific(run.completedAt))
}

export function sortRunsNewestFirst<T extends { completedAt: string }>(runs: T[]): T[] {
  return [...runs].sort(
    (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
  )
}

/** Most recent runs first — used for profile/overview display (not limited to today). */
export function recentRunsFrom<T extends { completedAt: string }>(runs: T[], limit = 10): T[] {
  return sortRunsNewestFirst(runs).slice(0, limit)
}
