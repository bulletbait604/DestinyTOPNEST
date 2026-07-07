import { getConfiguredActiveSeason } from '@/lib/destiny/seasonConfig'

function pacificCalendarDate(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(date)
}

function activeSeasonStartPacific(now = new Date()): string {
  const season = getConfiguredActiveSeason(now)
  return pacificCalendarDate(new Date(season.startDate))
}

/** True when the run falls within the active season window (Pacific calendar days). */
export function isRunInActiveSeasonPacific(completedAt: string | Date, now = new Date()): boolean {
  const runDay = pacificCalendarDate(new Date(completedAt))
  return runDay >= activeSeasonStartPacific(now)
}

function sortRunsNewestFirst<T extends { completedAt: string }>(runs: T[]): T[] {
  return [...runs].sort(
    (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
  )
}

/** Most recent runs first — used for profile/overview display (not limited to today). */
export function recentRunsFrom<T extends { completedAt: string }>(runs: T[], limit = 10): T[] {
  return sortRunsNewestFirst(runs).slice(0, limit)
}
