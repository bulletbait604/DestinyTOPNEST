/**
 * Destiny 2 weekly reset schedule (Tuesday 10:00 AM Pacific / 17:00 UTC).
 *
 * The schedule below is the fallback when Destiny2/Milestones is unavailable.
 * Raids repeat every 9 weeks from 2026-07-28. Dungeons repeat every 10 weeks
 * from 2026-07-21. An earlier 8-week slice that started 2026-08-04 matched
 * through 2026-09-22, then wrapped a week early (the Jul 28 raid pair and the
 * Jul 21–28 dungeon pairs sit in front of that slice).
 *
 * The current week is replaced by a live Bungie milestone result when one is
 * cached. That cache is keyed by reset date and expires at the next reset.
 */

import type { Difficulty } from '@/lib/destiny/types'
import { getLiveFeaturedWeek } from '@/lib/destiny/weeklyRotationLive'

export const WEEKLY_RESET_HOUR_UTC = 17 // 10:00 AM PDT
export const WEEKLY_RESET_DAY = 2 // Tuesday

/** First Monument of Triumph featured-rotator Tuesday. */
export const ROTATION_EPOCH = '2026-06-09'

export interface RotationWeek {
  /** ISO date (YYYY-MM-DD) of the Tuesday reset that starts this week */
  resetStart: string
  raids: [string, string]
  dungeons: [string, string]
  pantheon?: string
}

type ActivityPair = [string, string]

/** Weeks 0–7 after Monument of Triumph (Dexerto). */
const RAID_WEEKS_0_7: ActivityPair[] = [
  ['Vow of the Disciple', 'Last Wish'],
  ['Garden of Salvation', "King's Fall"],
  ['Root of Nightmares', 'Deep Stone Crypt'],
  ["Crota's End", 'Vault of Glass'],
  ["Salvation's Edge", 'Vow of the Disciple'],
  ["King's Fall", 'Last Wish'],
  ['Garden of Salvation', 'Root of Nightmares'],
  ['Deep Stone Crypt', "Crota's End"],
]

/**
 * Repeating raid cycle. Index 0 = week of 2026-07-28 (Deep Stone Crypt + Crota's End).
 * The old Aug 4 list is index 1 through index 8 of this cycle.
 */
const RAID_CYCLE_FROM_JUL_28: ActivityPair[] = [
  ['Deep Stone Crypt', "Crota's End"],
  ['Vault of Glass', "Salvation's Edge"],
  ['Vow of the Disciple', 'Last Wish'],
  ['Garden of Salvation', "King's Fall"],
  ['Deep Stone Crypt', 'Root of Nightmares'],
  ['Vault of Glass', "Crota's End"],
  ['Vow of the Disciple', "Salvation's Edge"],
  ["King's Fall", 'Last Wish'],
  ['Garden of Salvation', 'Root of Nightmares'],
]

const DUNGEON_WEEKS_0_7: ActivityPair[] = [
  ['Shattered Throne', 'Duality'],
  ['Pit of Heresy', 'Spire of the Watcher'],
  ['Ghosts of the Deep', 'Duality'],
  ["Warlord's Ruin", 'Grasp of Avarice'],
  ["Vesper's Host", 'Duality'],
  ['Spire of the Watcher', 'Sundered Doctrine'],
  ['Ghosts of the Deep', 'Shattered Throne'],
  ["Warlord's Ruin", 'Pit of Heresy'],
]

/**
 * Repeating dungeon cycle. Index 0 = week of 2026-07-21.
 * The old Aug 4 list is index 2 through index 9.
 */
const DUNGEON_CYCLE_FROM_JUL_21: ActivityPair[] = [
  ['Ghosts of the Deep', 'Shattered Throne'],
  ["Warlord's Ruin", 'Pit of Heresy'],
  ['Prophecy', "Vesper's Host"],
  ['Grasp of Avarice', 'Sundered Doctrine'],
  ['Duality', 'Shattered Throne'],
  ['Pit of Heresy', 'Spire of the Watcher'],
  ['Prophecy', 'Ghosts of the Deep'],
  ['Grasp of Avarice', "Warlord's Ruin"],
  ['Duality', "Vesper's Host"],
  ['Spire of the Watcher', 'Sundered Doctrine'],
]

/** Optional Pantheon labels by reset week start (when known). */
const PANTHEON_BY_RESET: Record<string, string> = {
  '2026-06-09': 'Pantheon 2.0 launch',
  '2026-06-16': 'Reprise: Gahlran · Encore: Consecrated Mind',
  '2026-09-08': 'Gahlran · Consecrated Mind',
  '2026-09-15': 'Calus · Morgeth',
  '2026-09-29': 'Gahlran · Warpriest',
  '2026-10-06': 'Calus · Consecrated Mind',
}

function weeksSinceEpoch(resetStart: Date): number {
  const epoch = parseUtcDate(ROTATION_EPOCH)
  const ms = resetStart.getTime() - epoch.getTime()
  return Math.max(0, Math.round(ms / (7 * 24 * 60 * 60 * 1000)))
}

function resetStartIso(weekIndex: number): string {
  const epoch = parseUtcDate(ROTATION_EPOCH)
  const d = new Date(epoch)
  d.setUTCDate(d.getUTCDate() + weekIndex * 7)
  return d.toISOString().slice(0, 10)
}

export function raidPairForWeekIndex(weekIndex: number): ActivityPair {
  if (weekIndex < 7) return RAID_WEEKS_0_7[weekIndex]!
  return RAID_CYCLE_FROM_JUL_28[(weekIndex - 7) % RAID_CYCLE_FROM_JUL_28.length]!
}

export function dungeonPairForWeekIndex(weekIndex: number): ActivityPair {
  if (weekIndex < 6) return DUNGEON_WEEKS_0_7[weekIndex]!
  return DUNGEON_CYCLE_FROM_JUL_21[(weekIndex - 6) % DUNGEON_CYCLE_FROM_JUL_21.length]!
}

export function rotationWeekForIndex(weekIndex: number): RotationWeek {
  const resetStart = resetStartIso(weekIndex)
  return {
    resetStart,
    raids: raidPairForWeekIndex(weekIndex),
    dungeons: dungeonPairForWeekIndex(weekIndex),
    pantheon: PANTHEON_BY_RESET[resetStart],
  }
}

/** Explicit schedule snapshot for tooling / docs (generated from the cycle helpers). */
export const ROTATION_SCHEDULE: RotationWeek[] = Array.from({ length: 40 }, (_, i) =>
  rotationWeekForIndex(i)
)

export interface WeeklyResetState {
  resetAt: string
  nextResetAt: string
  weekStart: string
  weekEnd: string
  weekLabel: string
  resetsInMs: number
  resetsInLabel: string
  featuredRaids: { name: string; difficulty: Difficulty }[]
  featuredDungeons: { name: string; difficulty: Difficulty }[]
  pantheon?: string
  resetTimeLabel: string
  /** `bungie` when both pairs came from Destiny2/Milestones for this reset. */
  rotationSource: 'bungie' | 'mixed' | 'schedule'
}

function parseUtcDate(isoDate: string): Date {
  return new Date(`${isoDate}T${String(WEEKLY_RESET_HOUR_UTC).padStart(2, '0')}:00:00.000Z`)
}

function formatShortDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return 'Reset imminent'
  const totalHours = Math.floor(ms / (1000 * 60 * 60))
  const days = Math.floor(totalHours / 24)
  const hours = totalHours % 24
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

/** Most recent Tuesday 17:00 UTC at or before `now`. */
export function getCurrentWeekResetStart(now = new Date()): Date {
  const d = new Date(now)
  d.setUTCHours(WEEKLY_RESET_HOUR_UTC, 0, 0, 0)
  const day = d.getUTCDay()
  const diff = (day - WEEKLY_RESET_DAY + 7) % 7
  d.setUTCDate(d.getUTCDate() - diff)
  if (d.getTime() > now.getTime()) {
    d.setUTCDate(d.getUTCDate() - 7)
  }
  return d
}

export function getNextWeeklyReset(now = new Date()): Date {
  const start = getCurrentWeekResetStart(now)
  const next = new Date(start)
  next.setUTCDate(next.getUTCDate() + 7)
  return next
}

function weekEntryForDate(resetStart: Date): RotationWeek {
  return rotationWeekForIndex(weeksSinceEpoch(resetStart))
}

export function getWeeklyResetState(now = new Date()): WeeklyResetState {
  const weekStartDate = getCurrentWeekResetStart(now)
  const nextResetDate = getNextWeeklyReset(now)
  const weekEndDate = new Date(nextResetDate)
  weekEndDate.setUTCDate(weekEndDate.getUTCDate() - 1)

  const entry = weekEntryForDate(weekStartDate)
  const resetsInMs = Math.max(0, nextResetDate.getTime() - now.getTime())
  const weekStart = weekStartDate.toISOString().slice(0, 10)
  const live = getLiveFeaturedWeek(weekStart, now.getTime())
  const raids = live?.raids && live.raids.length >= 2 ? live.raids.slice(0, 2) : entry.raids
  const dungeons = live?.dungeons && live.dungeons.length >= 2 ? live.dungeons.slice(0, 2) : entry.dungeons
  const raidsFromBungie = Boolean(live?.raids && live.raids.length >= 2)
  const dungeonsFromBungie = Boolean(live?.dungeons && live.dungeons.length >= 2)
  const rotationSource =
    raidsFromBungie && dungeonsFromBungie ? 'bungie' : raidsFromBungie || dungeonsFromBungie ? 'mixed' : 'schedule'

  return {
    resetAt: weekStartDate.toISOString(),
    nextResetAt: nextResetDate.toISOString(),
    weekStart,
    weekEnd: weekEndDate.toISOString().slice(0, 10),
    weekLabel: `${formatShortDate(weekStartDate)} – ${formatShortDate(weekEndDate)}`,
    resetsInMs,
    resetsInLabel: formatCountdown(resetsInMs),
    featuredRaids: raids.map((name) => ({ name, difficulty: 'normal' as Difficulty })),
    featuredDungeons: dungeons.map((name) => ({ name, difficulty: 'normal' as Difficulty })),
    pantheon: live?.pantheon ?? entry.pantheon,
    resetTimeLabel: 'Every Tuesday · 10:00 AM Pacific (17:00 UTC)',
    rotationSource,
  }
}

/**
 * CDN / browser cache header that cannot outlive the next Tuesday 17:00 UTC reset.
 * `stale-while-revalidate` is clamped so a stale response is not served after reset.
 */
export function cacheControlUntilWeeklyReset(
  now: Date,
  options: { scope: 'public' | 'private'; maxAge: number; staleWhileRevalidate?: number }
): string {
  const secondsUntilReset = Math.max(0, Math.floor((getNextWeeklyReset(now).getTime() - now.getTime()) / 1000))
  const maxAge = Math.min(Math.max(0, options.maxAge), secondsUntilReset)
  const swrBudget = Math.max(0, secondsUntilReset - maxAge)
  const swr = Math.min(Math.max(0, options.staleWhileRevalidate ?? 0), swrBudget)
  const parts = [options.scope, `max-age=${maxAge}`]
  if (options.scope === 'public') parts.push(`s-maxage=${maxAge}`)
  if (swr > 0) parts.push(`stale-while-revalidate=${swr}`)
  return parts.join(', ')
}

export function isFeaturedActivity(name: string, now = new Date()): boolean {
  const state = getWeeklyResetState(now)
  const all = [
    ...state.featuredRaids.map((r) => r.name),
    ...state.featuredDungeons.map((d) => d.name),
  ]
  return all.some((n) => n.toLowerCase() === name.toLowerCase())
}
