import { getConfiguredActiveSeason } from '@/lib/destiny/seasonConfig'

/** July 6 2026 1:00 AM America/Los_Angeles — Top Nest run window opens (PDT, UTC-7). */
export const NEST_LAUNCH_ISO = '2026-07-06T08:00:00.000Z'

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

/** Mongo filter fragment — only runs from launch onward. */
export function nestLaunchMongoFilter(): { completedAt: { $gte: string } } {
  return { completedAt: { $gte: NEST_LAUNCH_ISO } }
}

/** True when the run falls within the active season window (Pacific calendar days). */
export function isRunInActiveSeasonPacific(completedAt: string | Date, now = new Date()): boolean {
  if (!isRunAtOrAfterNestLaunch(completedAt)) return false
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
  return sortRunsNewestFirst(runs)
    .filter((run) => isRunAtOrAfterNestLaunch(run.completedAt))
    .slice(0, limit)
}
