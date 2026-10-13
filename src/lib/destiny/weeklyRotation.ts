/**
 * Destiny 2 weekly reset schedule (Tuesday 10:00 AM Pacific / 17:00 UTC).
 *
 * This schedule is the fallback when Destiny2/Milestones is unavailable.
 * The current week is still replaced by a live Bungie milestone result when
 * one is cached. That cache is keyed by reset date and expires at the next reset.
 *
 * Both rotators are repeating cycles counted from the Monument of Triumph
 * epoch (2026-06-09), matching the blueberries.gg 2026 calendar:
 * https://www.blueberries.gg/leveling/destiny-2-raid-dungeon-rotation/
 *
 * Raids repeat every 8 weeks from that epoch (the whole published raid table).
 * Dungeons are a 9-name ring: week slot i is paired with slot i+4. Slot 0 is
 * the week of 2026-08-04 (week index 8). That ring matches the published
 * dungeon table from 2026-07-07 through 2026-10-27. Oct 13 (week index 18)
 * is Root of Nightmares + Deep Stone Crypt and Spire of the Watcher +
 * Shattered Throne. Rows after 2026-10-27 in that table step off this ring.
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

/**
 * Repeating raid cycle. Index 0 is the week of 2026-06-09.
 * Order matches the blueberries raid table (Raid 1, Raid 2).
 */
const RAID_CYCLE: ActivityPair[] = [
  ['Vow of the Disciple', 'Last Wish'],
  ["King's Fall", 'Garden of Salvation'],
  ['Root of Nightmares', 'Deep Stone Crypt'],
  ["Crota's End", 'Vault of Glass'],
  ['Last Wish', 'Vow of the Disciple'],
  ['Garden of Salvation', "King's Fall"],
  ['Deep Stone Crypt', 'Root of Nightmares'],
  ['Vault of Glass', "Crota's End"],
]

/**
 * Dungeon ring. Featured pair for ring index i is (i, i+4).
 * Ring index 0 is week index 8 (2026-08-04): Duality + Vesper's Host.
 */
const DUNGEON_RING = [
  'Duality',
  'Spire of the Watcher',
  'Ghosts of the Deep',
  "Warlord's Ruin",
  "Vesper's Host",
  'Shattered Throne',
  'Pit of Heresy',
  'Prophecy',
  'Grasp of Avarice',
] as const

/** Week index whose ring slot is 0. 2026-06-09 + 8 weeks = 2026-08-04. */
const DUNGEON_RING_ORIGIN_WEEK = 8
const DUNGEON_RING_PHASE = 4

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

function mod(value: number, length: number): number {
  return ((value % length) + length) % length
}

export function raidPairForWeekIndex(weekIndex: number): ActivityPair {
  return RAID_CYCLE[mod(weekIndex, RAID_CYCLE.length)]!
}

export function dungeonPairForWeekIndex(weekIndex: number): ActivityPair {
  const slot = mod(weekIndex - DUNGEON_RING_ORIGIN_WEEK, DUNGEON_RING.length)
  const partner = mod(slot + DUNGEON_RING_PHASE, DUNGEON_RING.length)
  return [DUNGEON_RING[slot]!, DUNGEON_RING[partner]!]
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
