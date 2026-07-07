/**
 * Live guardian stats from Bungie activity history + PGCR durations.
 */

import { getActivityHistory, getPlayerProfile, getPostGameCarnageReport } from '@/lib/destiny/bungieClient'
import { parsePgcrDurationSeconds, type PgcrPayload } from '@/lib/destiny/pgcrBuildExtractor'
import {
  durationFromActivityHistory,
  isActivityHistoryCompleted,
  type ActivityHistoryRowLike,
} from '@/lib/destiny/pgcrStats'
import { resolveActivityByHash } from '@/lib/destiny/manifest'
import type { GuardianBungieStats } from '@/lib/destiny/types'

export type { GuardianBungieStats }

const RAID_MODE = 4
const DUNGEON_MODE = 82
const HISTORY_COUNT = 50
const PGCR_SAMPLE = 6

type HistoryActivity = ActivityHistoryRowLike

function isCompleted(row: HistoryActivity): boolean {
  return isActivityHistoryCompleted(row) === true
}

function durationFromRow(row: HistoryActivity): number | undefined {
  const seconds = durationFromActivityHistory(row)
  return seconds > 0 ? seconds : undefined
}

function dedupeActivities(rows: HistoryActivity[]): HistoryActivity[] {
  const seen = new Set<string>()
  const deduped: HistoryActivity[] = []
  for (const row of rows) {
    const instanceId = row.activityDetails?.instanceId
    if (instanceId) {
      if (seen.has(instanceId)) continue
      seen.add(instanceId)
    }
    deduped.push(row)
  }
  return deduped
}

async function fastestFromActivities(
  rows: HistoryActivity[],
  label: string,
  accessToken: string
): Promise<{ seconds: number; name: string } | undefined> {
  const completed = rows.filter(isCompleted)
  let best: { seconds: number; name: string } | undefined

  const withDuration = completed.filter((row) => durationFromRow(row))
  for (const row of withDuration) {
    const seconds = durationFromRow(row)!
    const hash = row.activityDetails?.referenceId
    let name = label
    if (hash) {
      try {
        name = (await resolveActivityByHash(hash)).name
      } catch {
        /* keep label */
      }
    }
    if (!best || seconds < best.seconds) best = { seconds, name }
  }

  let pgcrChecked = 0
  for (const row of completed) {
    if (pgcrChecked >= PGCR_SAMPLE) break
    if (durationFromRow(row)) continue
    const instanceId = row.activityDetails?.instanceId
    if (!instanceId) continue
    pgcrChecked++
    try {
      const pgcr = (await getPostGameCarnageReport(instanceId, accessToken)) as PgcrPayload
      const seconds = parsePgcrDurationSeconds(pgcr, row)
      if (seconds <= 0) continue
      const hash = row.activityDetails?.referenceId
      let name = label
      if (hash) {
        try {
          name = (await resolveActivityByHash(hash)).name
        } catch {
          /* keep label */
        }
      }
      if (!best || seconds < best.seconds) best = { seconds, name }
    } catch {
      /* skip PGCR */
    }
  }

  return best
}

export async function fetchGuardianBungieStats(
  membershipType: number,
  membershipId: string,
  accessToken: string,
  characterId?: string
): Promise<GuardianBungieStats | null> {
  const profile = (await getPlayerProfile(
    membershipType,
    membershipId,
    [100, 200, 102],
    accessToken
  )) as {
    characters?: { data?: Record<string, { minutesPlayedTotal?: number }> }
    characterStats?: {
      data?: Record<
        string,
        { allTime?: Record<string, { value?: number; displayName?: string }> }
      >
    }
  }

  const characterIds = characterId
    ? [characterId]
    : Object.keys(profile.characters?.data ?? {})

  if (!characterIds.length) return null

  let raidRows: HistoryActivity[] = []
  let dungeonRows: HistoryActivity[] = []
  let timePlayedMinutes = 0
  let totalKills = 0
  let totalDeaths = 0

  for (const id of characterIds) {
    const char = profile.characters?.data?.[id]
    timePlayedMinutes += char?.minutesPlayedTotal ?? 0

    const stats = profile.characterStats?.data?.[id]?.allTime ?? {}
    for (const stat of Object.values(stats)) {
      const name = (stat.displayName ?? '').toLowerCase()
      const value = stat.value ?? 0
      if (name.includes('kill')) totalKills += value
      if (name.includes('death')) totalDeaths += value
    }

    try {
      const [raidRes, dungeonRes] = await Promise.all([
        getActivityHistory(membershipType, membershipId, id, RAID_MODE, HISTORY_COUNT, accessToken) as Promise<{
          activities?: HistoryActivity[]
        }>,
        getActivityHistory(membershipType, membershipId, id, DUNGEON_MODE, HISTORY_COUNT, accessToken) as Promise<{
          activities?: HistoryActivity[]
        }>,
      ])
      raidRows = raidRows.concat(raidRes.activities ?? [])
      dungeonRows = dungeonRows.concat(dungeonRes.activities ?? [])
    } catch {
      /* partial stats ok */
    }
  }

  raidRows = dedupeActivities(raidRows)
  dungeonRows = dedupeActivities(dungeonRows)

  const [fastestRaid, fastestDungeon] = await Promise.all([
    fastestFromActivities(raidRows, 'Raid', accessToken),
    fastestFromActivities(dungeonRows, 'Dungeon', accessToken),
  ])

  return {
    fastestRaidSeconds: fastestRaid?.seconds,
    fastestRaidName: fastestRaid?.name,
    fastestDungeonSeconds: fastestDungeon?.seconds,
    fastestDungeonName: fastestDungeon?.name,
    raidClears: raidRows.filter(isCompleted).length,
    dungeonClears: dungeonRows.filter(isCompleted).length,
    totalKills: totalKills > 0 ? totalKills : undefined,
    totalDeaths: totalDeaths > 0 ? totalDeaths : undefined,
    timePlayedMinutes: timePlayedMinutes > 0 ? timePlayedMinutes : undefined,
    updatedAt: new Date().toISOString(),
  }
}
