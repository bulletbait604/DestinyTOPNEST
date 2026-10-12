import type { MvpVote, RunRecord, SherpaBoard, SherpaCredit, SherpaStanding } from '@/lib/destiny/types'
import {
  activityKey,
  dedupeRuns,
  isFullClearStampEligible,
} from '@/lib/destiny/passport'
import { buildFirstClearIndex } from '@/lib/destiny/weeklyContracts'

export const SHERPA_CLEAR_POINTS = 1
export const SHERPA_LEARNER_MVP_POINTS = 1

const HALL_LIMIT = 10
const RECENT_LIMIT = 8

interface SeasonWindow {
  startDate: string
  endDate: string
}

export interface SherpaEvalInput {
  runs: RunRecord[]
  votes?: MvpVote[]
  /** Destiny membership id → site user id, so a learner's MVP vote can be matched. */
  membershipToUserId?: Map<string, string>
  season?: SeasonWindow
  viewerMembershipId?: string
  historyComplete?: boolean
}

interface TitleRule {
  title: string
  minPoints: number
}

const SHERPA_TITLES: TitleRule[] = [
  { title: 'Trail Guide', minPoints: 1 },
  { title: 'Sherpa', minPoints: 5 },
  { title: 'Pathfinder', minPoints: 15 },
  { title: 'Oath Sherpa', minPoints: 30 },
]

export function sherpaTitleForPoints(points: number): string {
  let title = 'Unranked'
  for (const rule of SHERPA_TITLES) {
    if (points >= rule.minPoints) title = rule.title
  }
  return title
}

function inSeason(completedAt: string, season: SeasonWindow): boolean {
  const time = new Date(completedAt).getTime()
  return time >= new Date(season.startDate).getTime() && time <= new Date(season.endDate).getTime()
}

function uniqueMembers(run: RunRecord): { membershipId: string; displayName: string }[] {
  const seen = new Set<string>()
  const members: { membershipId: string; displayName: string }[] = []
  for (const member of run.teamMembers) {
    if (!member.membershipId || seen.has(member.membershipId)) continue
    seen.add(member.membershipId)
    members.push({ membershipId: member.membershipId, displayName: member.displayName || member.membershipId })
  }
  return members
}

function learnerVotedForSherpa(
  votes: MvpVote[],
  runId: string,
  learnerMembershipId: string,
  sherpaMembershipId: string,
  membershipToUserId: Map<string, string>
): boolean {
  const learnerUserId = membershipToUserId.get(learnerMembershipId)
  const sherpaUserId = membershipToUserId.get(sherpaMembershipId)
  if (!learnerUserId) return false
  return votes.some(
    (vote) =>
      vote.runId === runId &&
      vote.voterId === learnerUserId &&
      (vote.selectedMembershipId === sherpaMembershipId ||
        (sherpaUserId != null && vote.selectedUserId === sherpaUserId))
  )
}

/** Guided first clears plus a bonus when the learner's MVP vote names the sherpa. */
export function evaluateSherpaRanks(input: SherpaEvalInput): SherpaBoard {
  const votes = input.votes ?? []
  const membershipToUserId = input.membershipToUserId ?? new Map<string, string>()
  const firstClears = buildFirstClearIndex(input.runs)
  const credits: SherpaCredit[] = []

  for (const run of dedupeRuns(input.runs)) {
    if (!isFullClearStampEligible(run)) continue
    if (input.season && !inSeason(run.completedAt, input.season)) continue
    const key = activityKey(run)
    const members = uniqueMembers(run)
    const learners = members.filter((member) => firstClears.get(`${member.membershipId}::${key}`) === run.id)
    const sherpas = members.filter((member) => {
      const firstRunId = firstClears.get(`${member.membershipId}::${key}`)
      return Boolean(firstRunId) && firstRunId !== run.id
    })
    if (!learners.length || !sherpas.length) continue

    for (const sherpa of sherpas) {
      for (const learner of learners) {
        const learnerMvp = learnerVotedForSherpa(
          votes,
          run.id,
          learner.membershipId,
          sherpa.membershipId,
          membershipToUserId
        )
        credits.push({
          runId: run.id,
          activityName: run.activityName,
          completedAt: run.completedAt,
          sherpaMembershipId: sherpa.membershipId,
          sherpaDisplayName: sherpa.displayName,
          learnerMembershipId: learner.membershipId,
          learnerDisplayName: learner.displayName,
          learnerMvp,
          points: SHERPA_CLEAR_POINTS + (learnerMvp ? SHERPA_LEARNER_MVP_POINTS : 0),
        })
      }
    }
  }

  const totals = new Map<string, SherpaStanding>()
  for (const credit of credits) {
    const row = totals.get(credit.sherpaMembershipId) ?? {
      membershipId: credit.sherpaMembershipId,
      displayName: credit.sherpaDisplayName,
      guidedClears: 0,
      learnerMvps: 0,
      points: 0,
      rank: 0,
      title: 'Unranked',
    }
    row.displayName = credit.sherpaDisplayName || row.displayName
    row.guidedClears += 1
    if (credit.learnerMvp) row.learnerMvps += 1
    row.points += credit.points
    totals.set(credit.sherpaMembershipId, row)
  }

  const hall = Array.from(totals.values()).sort(
    (a, b) => b.points - a.points || b.learnerMvps - a.learnerMvps || a.displayName.localeCompare(b.displayName)
  )
  hall.forEach((row, index) => {
    row.rank = index + 1
    row.title = sherpaTitleForPoints(row.points)
  })

  const viewer = input.viewerMembershipId ? hall.find((row) => row.membershipId === input.viewerMembershipId) : undefined
  const viewerCredits = input.viewerMembershipId
    ? credits.filter((credit) => credit.sherpaMembershipId === input.viewerMembershipId)
    : []

  return {
    guidedClears: viewer?.guidedClears ?? viewerCredits.length,
    learnerMvps: viewer?.learnerMvps ?? viewerCredits.filter((credit) => credit.learnerMvp).length,
    points: viewer?.points ?? viewerCredits.reduce((sum, credit) => sum + credit.points, 0),
    rank: viewer?.rank ?? null,
    title: sherpaTitleForPoints(viewer?.points ?? viewerCredits.reduce((sum, credit) => sum + credit.points, 0)),
    recentCredits: viewerCredits
      .slice()
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
      .slice(0, RECENT_LIMIT),
    hallOfFame: hall.slice(0, HALL_LIMIT),
    historyComplete: input.historyComplete !== false,
  }
}
