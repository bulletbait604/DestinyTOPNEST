/** Parse Bungie PGCR / activity-history stat blocks ({ basic: { value } }). */

import type { RunRecord, RunTeamMember } from '@/lib/destiny/types'

export interface BungieStatBlock {
  basic?: { value?: number; displayValue?: string }
}

export type BungieValueMap = Record<string, BungieStatBlock | number | undefined>

/** Coerce a stored stat field to a plain number (handles legacy object shapes). */
export function coerceStatNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (value && typeof value === 'object') {
    const block = value as BungieStatBlock
    if (typeof block.basic?.value === 'number') return block.basic.value
  }
  return 0
}

export function normalizeRunTeamMember(member: RunTeamMember): RunTeamMember {
  return {
    ...member,
    kills: coerceStatNumber(member.kills),
    deaths: coerceStatNumber(member.deaths),
    assists: coerceStatNumber(member.assists),
    score: coerceStatNumber(member.score),
    powerLevel: coerceStatNumber(member.powerLevel),
  }
}

export function normalizeRunRecord(run: RunRecord): RunRecord {
  return {
    ...run,
    durationSeconds: coerceStatNumber(run.durationSeconds),
    pointsAwarded: coerceStatNumber(run.pointsAwarded),
    suspiciousScore: coerceStatNumber(run.suspiciousScore),
    teamMembers: (run.teamMembers ?? []).map(normalizeRunTeamMember),
  }
}

export function pgcrStatValue(
  values: BungieValueMap | undefined,
  key: string
): number {
  if (!values) return 0
  const raw = values[key]
  if (typeof raw === 'number') return raw
  if (raw && typeof raw === 'object' && typeof raw.basic?.value === 'number') {
    return raw.basic.value
  }
  return 0
}

export interface ActivityHistoryRowLike {
  activityDetails?: { completionReason?: number; instanceId?: string; referenceId?: number }
  values?: BungieValueMap
  period?: string
}

/** Activity history rows mark successful clears with completionReason === 0. */
export function isActivityHistoryCompleted(row?: ActivityHistoryRowLike): boolean | undefined {
  if (!row) return undefined
  const reason =
    row.activityDetails?.completionReason ?? pgcrStatValue(row.values, 'completionReason')
  if (reason == null || Number.isNaN(reason)) return undefined
  return reason === 0
}

export function durationFromActivityHistory(row?: ActivityHistoryRowLike): number {
  if (!row?.values) return 0
  const seconds =
    pgcrStatValue(row.values, 'activityDurationSeconds') ||
    pgcrStatValue(row.values, 'timePlayedSeconds')
  return seconds > 0 ? seconds : 0
}

export interface PgcrDetailsLike {
  completionReason?: number
}

export interface PgcrEntryLike {
  values?: BungieValueMap
  extended?: { values?: BungieValueMap }
}

export interface PgcrLike {
  activityDetails?: PgcrDetailsLike
  activityDurationInSeconds?: number
  entries?: PgcrEntryLike[]
}

/** Resolve whether a PGCR represents a completed activity. */
export function resolvePgcrCompleted(
  pgcr: PgcrLike,
  historyRow?: ActivityHistoryRowLike
): boolean {
  const fromHistory = isActivityHistoryCompleted(historyRow)
  if (fromHistory != null) return fromHistory

  if (pgcr.activityDetails?.completionReason != null) {
    return pgcr.activityDetails.completionReason === 0
  }

  for (const entry of pgcr.entries ?? []) {
    if (pgcrStatValue(entry.values, 'completed') === 1) return true
    if (pgcrStatValue(entry.extended?.values, 'completed') === 1) return true
  }

  return false
}

/** Best-effort duration in seconds from history row + PGCR payload. */
export function resolvePgcrDurationSeconds(
  pgcr: PgcrLike,
  historyRow?: ActivityHistoryRowLike
): number {
  const fromHistory = durationFromActivityHistory(historyRow)
  if (fromHistory > 0) return fromHistory

  if (typeof pgcr.activityDurationInSeconds === 'number' && pgcr.activityDurationInSeconds > 0) {
    return pgcr.activityDurationInSeconds
  }

  for (const entry of pgcr.entries ?? []) {
    const fromValues =
      pgcrStatValue(entry.values, 'activityDurationSeconds') ||
      pgcrStatValue(entry.extended?.values, 'activityDurationSeconds')
    if (fromValues > 0) return fromValues
  }

  return 0
}
