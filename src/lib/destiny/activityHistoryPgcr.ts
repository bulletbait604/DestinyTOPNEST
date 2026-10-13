import { pgcrStatValue, type BungieValueMap } from '@/lib/destiny/pgcrStats'

export interface PgcrPlayerRow {
  membershipId: string
  displayName: string
  characterClass: string
  light: number
  kills: number
  deaths: number
  assists: number
  score: number
  completed: boolean
}

export interface CachedPgcr {
  instanceId: string
  userId: string
  activityName?: string
  period?: string
  completed?: boolean
  durationSeconds?: number
  startingPhaseIndex?: number
  startedFromBeginning?: boolean
  entries: PgcrPlayerRow[]
  fetchedAt: string
}

interface PgcrEntry {
  player?: {
    destinyUserInfo?: {
      membershipId?: number | string
      displayName?: string
    }
    characterClass?: string
    lightLevel?: number
  }
  values?: BungieValueMap
  extended?: { values?: BungieValueMap }
}

export interface RawPgcr {
  period?: string
  activityDurationInSeconds?: number
  startingPhaseIndex?: number
  activityWasStartedFromBeginning?: boolean
  activityDetails?: { referenceId?: number | string }
  entries?: PgcrEntry[]
}

export function trimPgcr(instanceId: string, userId: string, pgcr: RawPgcr, activityName?: string): CachedPgcr {
  const entries = (pgcr.entries ?? []).map((entry) => {
    const stats = entry.values ?? entry.extended?.values
    const membershipId = entry.player?.destinyUserInfo?.membershipId
    return {
      membershipId: membershipId == null ? '' : String(membershipId),
      displayName: entry.player?.destinyUserInfo?.displayName || 'Guardian',
      characterClass: entry.player?.characterClass || 'Guardian',
      light: entry.player?.lightLevel ?? pgcrStatValue(stats, 'characterLevel'),
      kills: pgcrStatValue(stats, 'kills'),
      deaths: pgcrStatValue(stats, 'deaths'),
      assists: pgcrStatValue(stats, 'assists'),
      score: pgcrStatValue(stats, 'score'),
      completed: pgcrStatValue(stats, 'completed') === 1,
    }
  })

  return {
    instanceId,
    userId,
    activityName,
    period: pgcr.period,
    durationSeconds:
      typeof pgcr.activityDurationInSeconds === 'number' ? pgcr.activityDurationInSeconds : undefined,
    startingPhaseIndex: pgcr.startingPhaseIndex,
    startedFromBeginning: pgcr.activityWasStartedFromBeginning,
    entries,
    fetchedAt: new Date().toISOString(),
  }
}
