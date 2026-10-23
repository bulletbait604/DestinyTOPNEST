import { activityHistoryPath, getActivityHistory } from '@/lib/destiny/bungieClient'
import { splitBungieNameQuery } from '@/lib/destiny/guardianDirectory'
import {
  durationFromActivityHistory,
  isActivityHistoryCompleted,
  pgcrStatValue,
  type ActivityHistoryRowLike,
} from '@/lib/destiny/pgcrStats'
import { isRunInActiveSeasonPacific } from '@/lib/destiny/runDates'
import type { RunRecord } from '@/lib/destiny/types'

export function parseLookupQuery(
  q: string
):
  | { kind: 'name'; displayName: string; code: number }
  | { kind: 'pgcr'; pgcrId: string }
  | { kind: 'empty' }
  | { kind: 'invalid' } {
  const trimmed = q.trim()
  if (!trimmed) return { kind: 'empty' }
  const name = splitBungieNameQuery(trimmed)
  if (name) return { kind: 'name', displayName: name.displayName, code: name.code }
  if (/^\d{5,22}$/.test(trimmed)) return { kind: 'pgcr', pgcrId: trimmed }
  return { kind: 'invalid' }
}

/** Last five Bungie history pages (0–4) at 25 activities each. */
export const RECENT_HISTORY_PAGES = 5
/** Deeper walk when the player asks for previous clears. */
export const PREVIOUS_HISTORY_PAGES = 8
export const HISTORY_PAGE_SIZE = 25

export type SyncDepthOptions = {
  pages?: number
  countPerPage?: number
  includePrevious?: boolean
}

export function syncHistoryDepth(options: SyncDepthOptions = {}): {
  pages: number
  countPerPage: number
  includePrevious: boolean
} {
  const includePrevious = Boolean(options.includePrevious)
  const requestedPages = options.pages ?? (includePrevious ? PREVIOUS_HISTORY_PAGES : RECENT_HISTORY_PAGES)
  const requestedCount = options.countPerPage ?? HISTORY_PAGE_SIZE
  return {
    pages: Math.min(8, Math.max(1, requestedPages)),
    countPerPage: Math.min(250, Math.max(1, requestedCount)),
    includePrevious,
  }
}

/**
 * Raid and dungeon pages are the window: every clear on those pages is imported,
 * including dates before launch or the season start. Pantheon still stays in-season
 * unless the player asked for a previous walk.
 */
export function shouldImportActivity(
  period: string | undefined,
  includePrevious: boolean,
  activity: 'raid' | 'dungeon' | 'pantheon' = 'raid'
): boolean {
  if (activity === 'raid' || activity === 'dungeon') return true
  if (includePrevious) return true
  if (!period) return true
  return isRunInActiveSeasonPacific(period)
}

export type LookupScoreStatus = 'scored' | 'flagged' | 'unscored'

export function classifyStoredRun(
  existing: Pick<RunRecord, 'verificationStatus' | 'pointsAwarded' | 'checkpointLikely'> | null,
  completed: boolean
): LookupScoreStatus {
  if (existing?.verificationStatus === 'flagged' || existing?.checkpointLikely) return 'flagged'
  if (existing && existing.verificationStatus === 'verified' && (existing.pointsAwarded ?? 0) > 0) return 'scored'
  if (!completed) return 'flagged'
  return 'unscored'
}

export function lookupStatusText(status: LookupScoreStatus, points: number): string {
  if (status === 'scored') return `Already Scored (+${points} pts)`
  if (status === 'flagged') return 'Flagged/Checkpoint'
  return 'Not Scored Yet'
}

export type HistoryActivity = {
  instanceId: string
  type: 'raid' | 'dungeon'
  period?: string
  durationSeconds: number
  completed: boolean
  referenceId?: number
  playerCount: number
}

export function activityFromHistoryRow(
  row: ActivityHistoryRowLike & { activityDetails?: { instanceId?: string; referenceId?: number } },
  type: 'raid' | 'dungeon'
): HistoryActivity | null {
  const instanceId = row.activityDetails?.instanceId
  if (!instanceId) return null
  const completedFlag = isActivityHistoryCompleted(row)
  return {
    instanceId: String(instanceId),
    type,
    period: row.period,
    durationSeconds: durationFromActivityHistory(row),
    completed: completedFlag !== false,
    referenceId: row.activityDetails?.referenceId,
    playerCount: pgcrStatValue(row.values, 'playerCount'),
  }
}

export type LookupRunRow = {
  instanceId: string
  activityName: string
  type: 'raid' | 'dungeon'
  completedAt: string
  durationSeconds: number
  completed: boolean
  checkpointLikely: boolean
  teammateCount: number
  status: LookupScoreStatus
  statusLabel: string
  pointsAwarded: number
  bondPoints: number
  membershipId: string
  membershipType: number
  displayName: string
}

export function buildLookupRows(input: {
  activities: HistoryActivity[]
  existing: Array<
    Pick<
      RunRecord,
      'pgcrId' | 'verificationStatus' | 'pointsAwarded' | 'checkpointLikely' | 'activityName' | 'bondPoints'
    >
  >
  names: Record<string, string>
  membershipId: string
  membershipType: number
  displayName: string
}): LookupRunRow[] {
  const byPgcr = new Map(input.existing.map((run) => [run.pgcrId, run]))
  const seen = new Set<string>()
  const rows: LookupRunRow[] = []
  for (const activity of input.activities) {
    if (seen.has(activity.instanceId)) continue
    seen.add(activity.instanceId)
    const existing = byPgcr.get(activity.instanceId) ?? null
    const status = classifyStoredRun(existing, activity.completed)
    const points = existing?.pointsAwarded ?? 0
    rows.push({
      instanceId: activity.instanceId,
      activityName: existing?.activityName || input.names[String(activity.referenceId ?? '')] || (activity.type === 'raid' ? 'Raid' : 'Dungeon'),
      type: activity.type,
      completedAt: activity.period ?? '',
      durationSeconds: activity.durationSeconds,
      completed: activity.completed,
      checkpointLikely: Boolean(existing?.checkpointLikely) || !activity.completed,
      teammateCount: activity.playerCount,
      status,
      statusLabel: lookupStatusText(status, points),
      pointsAwarded: points,
      bondPoints: existing?.bondPoints ?? 0,
      membershipId: input.membershipId,
      membershipType: input.membershipType,
      displayName: input.displayName,
    })
  }
  return rows
}

export function runsToScore(
  rows: LookupRunRow[],
  instanceIds?: string[]
): { instanceId: string; type: 'raid' | 'dungeon' }[] {
  const wanted = instanceIds?.length ? new Set(instanceIds) : null
  return rows
    .filter((row) => row.status !== 'scored')
    .filter((row) => (wanted ? wanted.has(row.instanceId) : true))
    .map((row) => ({ instanceId: row.instanceId, type: row.type }))
}

type HistoryGetter = (
  membershipType: number,
  membershipId: string,
  characterId: string,
  mode: number,
  count: number,
  accessToken?: string,
  page?: number
) => Promise<{ activities?: ActivityHistoryRowLike[] }>

/** Walk raid and dungeon history pages. Stops a mode early when a page is short. */
export async function collectRaidDungeonHistory(
  input: {
    membershipType: number
    membershipId: string
    characterIds: string[]
    pages: number
    countPerPage: number
    accessToken?: string
  },
  getHistory: HistoryGetter = getActivityHistory as HistoryGetter
): Promise<HistoryActivity[]> {
  const modes = [
    [4, 'raid'],
    [82, 'dungeon'],
  ] as const
  const found: HistoryActivity[] = []
  for (const characterId of input.characterIds) {
    for (const [mode, type] of modes) {
      for (let page = 0; page < input.pages; page += 1) {
        const response = await getHistory(
          input.membershipType,
          input.membershipId,
          characterId,
          mode,
          input.countPerPage,
          input.accessToken,
          page
        )
        const batch = response?.activities ?? []
        for (const row of batch) {
          const activity = activityFromHistoryRow(row, type)
          if (activity) found.push(activity)
        }
        if (batch.length < input.countPerPage) break
      }
    }
  }
  return found
}

export { activityHistoryPath }
