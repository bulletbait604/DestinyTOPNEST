import type { ClanWarStanding, ClanWarsBoard, RunRecord } from '@/lib/destiny/types'
import { activityKey, dedupeRuns, isFullClearStampEligible } from '@/lib/destiny/passport'
import { buildFirstClearIndex } from '@/lib/destiny/weeklyContracts'
import { getWeeklyResetState } from '@/lib/destiny/weeklyRotation'

/** Points for a verified clear with at least two clanmates. */
export const CLAN_CLEAR_POINTS = 2
/** Extra points when one of those clanmates has no earlier full clear of the activity. */
export const CLAN_RECRUIT_BONUS = 2
export const MIN_CLANMATES = 2

export const CLAN_DIVISIONS = [
  { name: 'Ember', minPoints: 0 },
  { name: 'Ash', minPoints: 10 },
  { name: 'Iron', minPoints: 25 },
  { name: 'Steel', minPoints: 50 },
] as const

interface SeasonWindow {
  startDate: string
  endDate: string
}

export interface ClanWarsEvalInput {
  runs: RunRecord[]
  season: SeasonWindow
  now?: Date
  viewerClanId?: string
  historyComplete?: boolean
}

export function clanDivisionForPoints(points: number): string {
  let name: string = CLAN_DIVISIONS[0].name
  for (const division of CLAN_DIVISIONS) {
    if (points >= division.minPoints) name = division.name
  }
  return name
}

function inSeason(completedAt: string, season: SeasonWindow): boolean {
  const time = new Date(completedAt).getTime()
  return time >= new Date(season.startDate).getTime() && time <= new Date(season.endDate).getTime()
}

interface ClanBucket {
  clanId: string
  clanName: string
  weeklyPoints: number
  seasonPoints: number
  verifiedClears: number
  recruitBonuses: number
}

/** Weekly and season clan standings from verified clears that include clanmates. */
export function evaluateClanWars(input: ClanWarsEvalInput): ClanWarsBoard {
  const now = input.now ?? new Date()
  const week = getWeeklyResetState(now)
  const firstClears = buildFirstClearIndex(input.runs)
  const clans = new Map<string, ClanBucket>()

  for (const run of dedupeRuns(input.runs)) {
    if (!isFullClearStampEligible(run)) continue
    if (!inSeason(run.completedAt, input.season)) continue
    const inWeek = getWeeklyResetState(new Date(run.completedAt)).weekStart === week.weekStart
    const key = activityKey(run)
    const byClan = new Map<string, { name: string; ids: string[] }>()
    const seen = new Set<string>()
    for (const member of run.teamMembers) {
      if (!member.membershipId || !member.clanId || seen.has(member.membershipId)) continue
      seen.add(member.membershipId)
      const group = byClan.get(member.clanId) ?? { name: member.clanName || member.clanId, ids: [] }
      group.ids.push(member.membershipId)
      if (member.clanName) group.name = member.clanName
      byClan.set(member.clanId, group)
    }

    for (const [clanId, group] of Array.from(byClan.entries())) {
      if (group.ids.length < MIN_CLANMATES) continue
      const recruit = group.ids.some((membershipId) => firstClears.get(`${membershipId}::${key}`) === run.id)
      const points = CLAN_CLEAR_POINTS + (recruit ? CLAN_RECRUIT_BONUS : 0)
      const bucket = clans.get(clanId) ?? {
        clanId,
        clanName: group.name,
        weeklyPoints: 0,
        seasonPoints: 0,
        verifiedClears: 0,
        recruitBonuses: 0,
      }
      bucket.clanName = group.name || bucket.clanName
      bucket.seasonPoints += points
      bucket.verifiedClears += 1
      if (recruit) bucket.recruitBonuses += 1
      if (inWeek) bucket.weeklyPoints += points
      clans.set(clanId, bucket)
    }
  }

  const standings: ClanWarStanding[] = Array.from(clans.values())
    .sort(
      (a, b) =>
        b.seasonPoints - a.seasonPoints ||
        b.recruitBonuses - a.recruitBonuses ||
        a.clanName.localeCompare(b.clanName)
    )
    .map((row, index) => ({
      ...row,
      division: clanDivisionForPoints(row.seasonPoints),
      rank: index + 1,
    }))

  return {
    weekLabel: week.weekLabel,
    standings,
    viewerClan: input.viewerClanId ? standings.find((row) => row.clanId === input.viewerClanId) ?? null : null,
    historyComplete: input.historyComplete !== false,
  }
}
