import type {
  ActivityType,
  PassportActivityBadge,
  PassportProfile,
  PassportStamp,
  PassportTitle,
  RunRecord,
  RunTeamMember,
} from '@/lib/destiny/types'

/**
 * A first-time teammate is worth a full "new Guardian" stamp.
 * Someone the player has already cleared with still counts, at a lower weight.
 */
export const CLEAR_STAMP_WEIGHT = 1
export const NEW_GUARDIAN_STAMP_WEIGHT = 1
export const REPEAT_TEAMMATE_STAMP_WEIGHT = 0.25

const RECENT_STAMP_LIMIT = 12

export interface FireteamViewer {
  userId?: string
  membershipId: string
  clanId?: string
  displayName?: string
}

interface PassportTitleRule {
  id: string
  title: string
  priority: number
  minClears?: number
  minNewGuardianStamps?: number
  minActivities?: number
  minDistinctTeammates?: number
}

/** Non-monetary titles unlocked by the passport collection. */
export const PASSPORT_TITLE_RULES: PassportTitleRule[] = [
  { id: 'stamped-guardian', title: 'Stamped Guardian', priority: 10, minClears: 1 },
  { id: 'nest-traveler', title: 'Nest Traveler', priority: 20, minClears: 10 },
  { id: 'wide-fireteam', title: 'Fireteam Regular', priority: 25, minDistinctTeammates: 15 },
  { id: 'activity-collector', title: 'Activity Collector', priority: 30, minActivities: 6 },
  { id: 'bridge-builder', title: 'Bridge Builder', priority: 40, minNewGuardianStamps: 25 },
]

export interface WalkedClear {
  run: RunRecord
  newTeammates: RunTeamMember[]
  repeatTeammates: RunTeamMember[]
}

export function staffApprovedFullClearForDecision(
  decision: 'approve' | 'reject' | 'checkpoint_non_scoring'
): boolean {
  return decision === 'approve'
}

/** PGCR completed, and either started from the beginning or staff-approved as a full clear. */
export function isFullClearStampEligible(
  run: Pick<RunRecord, 'completed' | 'verificationStatus' | 'checkpointLikely' | 'staffApprovedFullClear'>
): boolean {
  if (!run.completed) return false
  if (run.verificationStatus !== 'verified') return false
  if (run.staffApprovedFullClear) return true
  return !run.checkpointLikely
}

export function activityKey(run: Pick<RunRecord, 'activityId' | 'activityName'>): string {
  if (run.activityId > 0) return `id:${run.activityId}`
  return `name:${run.activityName.trim().toLowerCase()}`
}

export function compareRuns(a: Pick<RunRecord, 'completedAt' | 'id'>, b: Pick<RunRecord, 'completedAt' | 'id'>): number {
  const time = new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
  if (time !== 0 && Number.isFinite(time)) return time
  return a.id.localeCompare(b.id)
}

export function dedupeRuns(runs: RunRecord[]): RunRecord[] {
  const byPgcr = new Map<string, RunRecord>()
  const sorted = [...runs].sort(compareRuns)
  for (const run of sorted) {
    const key = run.pgcrId || run.id
    const existing = byPgcr.get(key)
    if (!existing || (run.staffApprovedFullClear && !existing.staffApprovedFullClear)) {
      byPgcr.set(key, run)
    }
  }
  return Array.from(byPgcr.values()).sort(compareRuns)
}

export function runIncludesViewer(run: RunRecord, viewer: FireteamViewer): boolean {
  if (viewer.userId && run.ownerUserId === viewer.userId) return true
  if (!viewer.membershipId) return false
  return run.teamMembers.some((member) => member.membershipId === viewer.membershipId)
}

function isViewerMember(member: RunTeamMember, run: RunRecord, viewer: FireteamViewer): boolean {
  if (viewer.membershipId && member.membershipId === viewer.membershipId) return true
  const viewerOnTeam =
    Boolean(viewer.membershipId) &&
    run.teamMembers.some((entry) => entry.membershipId === viewer.membershipId)
  if (
    !viewerOnTeam &&
    viewer.userId &&
    run.ownerUserId === viewer.userId &&
    viewer.displayName &&
    member.displayName === viewer.displayName
  ) {
    return true
  }
  return false
}

export function teammatesOf(run: RunRecord, viewer: FireteamViewer): RunTeamMember[] {
  const seen = new Set<string>()
  const teammates: RunTeamMember[] = []
  for (const member of run.teamMembers) {
    if (!member.membershipId || seen.has(member.membershipId)) continue
    if (isViewerMember(member, run, viewer)) continue
    seen.add(member.membershipId)
    teammates.push(member)
  }
  return teammates
}

/** Chronological stamp-eligible clears for this viewer, with new vs repeat teammates. */
export function walkViewerClears(runs: RunRecord[], viewer: FireteamViewer): WalkedClear[] {
  const prior = new Set<string>()
  const walked: WalkedClear[] = []

  for (const run of dedupeRuns(runs)) {
    if (!runIncludesViewer(run, viewer) || !isFullClearStampEligible(run)) continue
    const newTeammates: RunTeamMember[] = []
    const repeatTeammates: RunTeamMember[] = []
    for (const teammate of teammatesOf(run, viewer)) {
      if (prior.has(teammate.membershipId)) repeatTeammates.push(teammate)
      else newTeammates.push(teammate)
    }
    walked.push({ run, newTeammates, repeatTeammates })
    for (const teammate of [...newTeammates, ...repeatTeammates]) {
      prior.add(teammate.membershipId)
    }
  }

  return walked
}

function badgeLabel(activityName: string, clearCount: number): string {
  if (clearCount >= 10) return `${activityName} — Master stamp`
  if (clearCount >= 5) return `${activityName} — Collector`
  if (clearCount >= 3) return `${activityName} — Regular`
  return `${activityName} — First stamp`
}

function titleEarned(
  rule: PassportTitleRule,
  stats: {
    clearStamps: number
    newGuardianStamps: number
    distinctTeammates: number
    activities: number
  }
): boolean {
  if (rule.minClears != null && stats.clearStamps < rule.minClears) return false
  if (rule.minNewGuardianStamps != null && stats.newGuardianStamps < rule.minNewGuardianStamps) return false
  if (rule.minActivities != null && stats.activities < rule.minActivities) return false
  if (rule.minDistinctTeammates != null && stats.distinctTeammates < rule.minDistinctTeammates) return false
  return true
}

export function formatStampPoints(value: number): string {
  const rounded = Math.round(value * 100) / 100
  if (Number.isInteger(rounded)) return String(rounded)
  return rounded.toFixed(2).replace(/\.?0+$/, '')
}

export function emptyPassportProfile(): PassportProfile {
  return {
    clearStamps: 0,
    newGuardianStamps: 0,
    repeatTeammateCredit: 0,
    totalStamps: 0,
    distinctTeammates: 0,
    displayTitle: 'Unstamped',
    titles: PASSPORT_TITLE_RULES.map((rule) => ({ id: rule.id, title: rule.title, earned: false })),
    activities: [],
    recentStamps: [],
  }
}

/** Build a passport from verified runs. Does not write leaderboard points. */
export function evaluatePassport(runs: RunRecord[], viewer: FireteamViewer): PassportProfile {
  if (!viewer.membershipId && !viewer.userId) return emptyPassportProfile()

  const walked = walkViewerClears(runs, viewer)
  const distinct = new Set<string>()
  const activities = new Map<string, PassportActivityBadge>()
  const stamps: PassportStamp[] = []

  let newGuardianStamps = 0
  let repeatTeammateCredit = 0

  for (const step of walked) {
    const newCount = step.newTeammates.length
    const repeatCredit = step.repeatTeammates.length * REPEAT_TEAMMATE_STAMP_WEIGHT
    newGuardianStamps += newCount
    repeatTeammateCredit += repeatCredit
    for (const teammate of [...step.newTeammates, ...step.repeatTeammates]) {
      distinct.add(teammate.membershipId)
    }

    const key = activityKey(step.run)
    const existing = activities.get(key)
    if (!existing) {
      activities.set(key, {
        activityKey: key,
        activityId: step.run.activityId,
        activityName: step.run.activityName,
        activityType: step.run.type,
        clearCount: 1,
        firstStampedAt: step.run.completedAt,
        latestStampedAt: step.run.completedAt,
        badgeLabel: badgeLabel(step.run.activityName, 1),
      })
    } else {
      existing.clearCount += 1
      existing.latestStampedAt = step.run.completedAt
      existing.badgeLabel = badgeLabel(existing.activityName, existing.clearCount)
    }

    stamps.push({
      runId: step.run.id,
      pgcrId: step.run.pgcrId,
      activityName: step.run.activityName,
      activityType: step.run.type,
      completedAt: step.run.completedAt,
      clearStamp: CLEAR_STAMP_WEIGHT,
      newGuardianStamps: newCount * NEW_GUARDIAN_STAMP_WEIGHT,
      repeatTeammateCredit: repeatCredit,
      stampTotal: CLEAR_STAMP_WEIGHT + newCount * NEW_GUARDIAN_STAMP_WEIGHT + repeatCredit,
      newGuardianNames: step.newTeammates.map((teammate) => teammate.displayName),
    })
  }

  const activityList = Array.from(activities.values()).sort(
    (a, b) => b.clearCount - a.clearCount || a.activityName.localeCompare(b.activityName)
  )
  const stats = {
    clearStamps: walked.length,
    newGuardianStamps,
    distinctTeammates: distinct.size,
    activities: activityList.length,
  }
  const titles: PassportTitle[] = PASSPORT_TITLE_RULES.map((rule) => ({
    id: rule.id,
    title: rule.title,
    earned: titleEarned(rule, stats),
  }))
  const displayTitle =
    [...PASSPORT_TITLE_RULES]
      .filter((rule) => titles.find((title) => title.id === rule.id)?.earned)
      .sort((a, b) => b.priority - a.priority)[0]?.title ?? 'Unstamped'

  const totalStamps = stats.clearStamps * CLEAR_STAMP_WEIGHT + newGuardianStamps + repeatTeammateCredit

  return {
    clearStamps: stats.clearStamps,
    newGuardianStamps,
    repeatTeammateCredit,
    totalStamps,
    distinctTeammates: stats.distinctTeammates,
    displayTitle,
    titles,
    activities: activityList,
    recentStamps: [...stamps].reverse().slice(0, RECENT_STAMP_LIMIT),
  }
}

export function activityTypeLabel(type: ActivityType): string {
  if (type === 'raid') return 'Raid'
  if (type === 'dungeon') return 'Dungeon'
  return 'Pantheon'
}
