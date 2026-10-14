/**
 * Destiny 2 weekly reset schedule (Tuesday 10:00 AM Pacific / 17:00 UTC).
 *
 * What the site shows, in order:
 * 1. This week's Destiny2/Milestones result (memory or Mongo, filled by the weekly cron).
 * 2. A scraped weekly reset post cached the same way.
 * 3. This static calendar, only when both live sources miss.
 *
 * The calendar repeats the rotator published after Monument of Triumph.
 * Raids are a 9-week cycle whose first row is 2026-07-28.
 * Dungeons are a 10-week cycle whose first row is 2026-07-21.
 * The week of 2026-10-13 is Vow of the Disciple + Last Wish and
 * Prophecy + Vesper's Host.
 */

import type { Difficulty } from '@/lib/destiny/types'
import { getLiveFeaturedWeek } from '@/lib/destiny/weeklyRotationLive'

export const WEEKLY_RESET_HOUR_UTC = 17 // 10:00 AM PDT
export const WEEKLY_RESET_DAY = 2 // Tuesday

/** First row of the 9-week raid cycle (Deep Stone Crypt + Crota's End). */
export const RAID_ROTATION_EPOCH = '2026-07-28'
/** First row of the 10-week dungeon cycle (Ghosts of the Deep + Shattered Throne). */
export const DUNGEON_ROTATION_EPOCH = '2026-07-21'

export interface RotationWeek {
  /** ISO date (YYYY-MM-DD) of the Tuesday reset that starts this week */
  resetStart: string
  raids: [string, string]
  dungeons: [string, string]
  pantheon?: string
}

type ActivityPair = [string, string]

/**
 * Repeating raid cycle. Index 0 is the week of 2026-07-28.
 * Pairs are not a fixed ring: the partner changes across the 9 weeks.
 */
const RAID_CYCLE: ActivityPair[] = [
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

/**
 * Repeating dungeon cycle. Index 0 is the week of 2026-07-21.
 * Index 2 (and the week of 2026-10-13) is Prophecy + Vesper's Host.
 */
const DUNGEON_CYCLE: ActivityPair[] = [
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

function weeksSince(epochIso: string, resetStart: Date): number {
  const epoch = parseUtcDate(epochIso)
  const ms = resetStart.getTime() - epoch.getTime()
  return Math.round(ms / (7 * 24 * 60 * 60 * 1000))
}

function mod(value: number, length: number): number {
  return ((value % length) + length) % length
}

export function raidPairForWeekIndex(weekIndex: number): ActivityPair {
  return RAID_CYCLE[mod(weekIndex, RAID_CYCLE.length)]!
}

export function dungeonPairForWeekIndex(weekIndex: number): ActivityPair {
  return DUNGEON_CYCLE[mod(weekIndex, DUNGEON_CYCLE.length)]!
}

export function rotationWeekForDate(resetStart: Date): RotationWeek {
  const iso = resetStart.toISOString().slice(0, 10)
  return {
    resetStart: iso,
    raids: raidPairForWeekIndex(weeksSince(RAID_ROTATION_EPOCH, resetStart)),
    dungeons: dungeonPairForWeekIndex(weeksSince(DUNGEON_ROTATION_EPOCH, resetStart)),
  }
}

/** Explicit schedule snapshot for tooling / docs (generated from the cycle helpers). */
export const ROTATION_SCHEDULE: RotationWeek[] = Array.from({ length: 40 }, (_, i) => {
  const start = parseUtcDate(DUNGEON_ROTATION_EPOCH)
  start.setUTCDate(start.getUTCDate() + i * 7)
  return rotationWeekForDate(start)
})

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
  /** Where the featured pairs came from. `schedule` is the last-resort calendar. */
  rotationSource: 'bungie' | 'web' | 'mixed' | 'schedule'
  /** Grandmaster nightfall when a live source named one. */
  nightfall?: string
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
  return rotationWeekForDate(resetStart)
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
  const raidsFromLive = Boolean(live?.raids && live.raids.length >= 2)
  const dungeonsFromLive = Boolean(live?.dungeons && live.dungeons.length >= 2)
  const rotationSource =
    raidsFromLive && dungeonsFromLive
      ? live?.source ?? 'bungie'
      : raidsFromLive || dungeonsFromLive
        ? 'mixed'
        : 'schedule'

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
    nightfall: live?.nightfall,
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
