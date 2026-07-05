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

export function filterRunsFromTodayPacific<T extends { completedAt: string }>(runs: T[]): T[] {
  return runs.filter((run) => isRunOnOrAfterTodayPacific(run.completedAt))
}
