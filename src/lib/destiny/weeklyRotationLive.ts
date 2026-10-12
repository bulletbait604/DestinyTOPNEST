/**
 * In-process featured-week cache. Keyed by the Tuesday reset date and
 * discarded at the next reset so a warm instance cannot keep last week's raids.
 */

export interface LiveFeaturedWeek {
  weekStart: string
  expiresAtMs: number
  raids?: string[]
  dungeons?: string[]
  pantheon?: string
}

let live: LiveFeaturedWeek | null = null

export function setLiveFeaturedWeek(entry: LiveFeaturedWeek, now = Date.now()): void {
  if (!entry.weekStart || !(entry.expiresAtMs > now)) {
    return
  }
  live = {
    weekStart: entry.weekStart,
    expiresAtMs: entry.expiresAtMs,
    raids: entry.raids?.filter(Boolean),
    dungeons: entry.dungeons?.filter(Boolean),
    pantheon: entry.pantheon?.trim() || undefined,
  }
}

/** Live pair for this reset week, or null once `now` reaches the next reset. */
export function getLiveFeaturedWeek(weekStart: string, now = Date.now()): LiveFeaturedWeek | null {
  if (!live || live.weekStart !== weekStart || now >= live.expiresAtMs) return null
  return live
}

export function clearLiveFeaturedWeek(): void {
  live = null
}
