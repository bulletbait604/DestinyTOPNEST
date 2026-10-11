import type { RunRecord, WeeklyContractDefinition, WeeklyContractProgress, WeeklyContractsSnapshot } from '@/lib/destiny/types'
import {
  activityKey,
  dedupeRuns,
  isFullClearStampEligible,
  runIncludesViewer,
  teammatesOf,
  walkViewerClears,
  type FireteamViewer,
} from '@/lib/destiny/passport'
import { resolveSeasonTier, resolveWeeklyContractCatalog } from '@/lib/destiny/weeklyContractCatalog'
import { getWeeklyResetState } from '@/lib/destiny/weeklyRotation'

export interface SeasonWindow {
  startDate: string
  endDate: string
}

export interface WeeklyContractEvalInput {
  runs: RunRecord[]
  viewer: FireteamViewer
  now?: Date
  season?: SeasonWindow
  contracts?: WeeklyContractDefinition[]
  /** Featured dungeon names for the week that contains `at`. Defaults to the live rotator. */
  featuredDungeonsAt?: (at: Date) => string[]
  /**
   * False when the viewer's own clear history was truncated.
   * New-Guardian contracts stay incomplete so a missing teammate is not treated as new.
   */
  viewerHistoryComplete?: boolean
  /**
   * False when global clear history was truncated.
   * The first-timer contract stays incomplete so a missing prior clear is not treated as a first.
   */
  clearHistoryComplete?: boolean
}

interface WeekBucket {
  weekStart: string
  runs: RunRecord[]
}

function namesMatch(left: string, right: string): boolean {
  return left.trim().toLowerCase() === right.trim().toLowerCase()
}

function defaultFeaturedDungeons(at: Date): string[] {
  return getWeeklyResetState(at).featuredDungeons.map((dungeon) => dungeon.name)
}

function inSeason(completedAt: string, season: SeasonWindow): boolean {
  const time = new Date(completedAt).getTime()
  return time >= new Date(season.startDate).getTime() && time <= new Date(season.endDate).getTime()
}

function raidHasClanmateAndOutsider(run: RunRecord, viewer: FireteamViewer): boolean {
  if (run.type !== 'raid' || !viewer.clanId) return false
  const others = teammatesOf(run, viewer)
  const tagsPresent = others.some((member) => Boolean(member.clanId))
  if (tagsPresent) {
    const clanmate = others.some((member) => member.clanId === viewer.clanId)
    const outsider = others.some((member) => member.clanId !== viewer.clanId)
    return clanmate && outsider
  }
  if (viewer.userId && run.ownerUserId === viewer.userId) {
    return run.clanMemberCount >= 2 && run.randoCount >= 1
  }
  return false
}

/** membershipId::activityKey → run id of that guardian's first stamp-eligible clear. */
export function buildFirstClearIndex(runs: RunRecord[]): Map<string, string> {
  const index = new Map<string, string>()
  for (const run of dedupeRuns(runs)) {
    if (!isFullClearStampEligible(run)) continue
    const key = activityKey(run)
    const seen = new Set<string>()
    for (const member of run.teamMembers) {
      if (!member.membershipId || seen.has(member.membershipId)) continue
      seen.add(member.membershipId)
      const mapKey = `${member.membershipId}::${key}`
      if (!index.has(mapKey)) index.set(mapKey, run.id)
    }
  }
  return index
}

function firstTimerOnRun(
  run: RunRecord,
  viewer: FireteamViewer,
  firstClears: Map<string, string>
): { membershipId: string; displayName: string } | null {
  const key = activityKey(run)
  for (const teammate of teammatesOf(run, viewer)) {
    const firstRunId = firstClears.get(`${teammate.membershipId}::${key}`)
    if (firstRunId === run.id) return teammate
  }
  return null
}

interface WeekEval {
  contracts: WeeklyContractProgress[]
  weekTierPoints: number
}

function evaluateWeek(
  weekRuns: RunRecord[],
  allViewerRuns: RunRecord[],
  viewer: FireteamViewer,
  contracts: WeeklyContractDefinition[],
  featuredDungeonsAt: (at: Date) => string[],
  firstClears: Map<string, string>,
  viewerHistoryComplete: boolean,
  clearHistoryComplete: boolean
): WeekEval {
  const walked = walkViewerClears(allViewerRuns, viewer)
  const weekIds = new Set(weekRuns.map((run) => run.id))

  const progress: WeeklyContractProgress[] = contracts.map((contract) => ({
    id: contract.id,
    title: contract.title,
    description: contract.description,
    tierPoints: contract.tierPoints,
    completed: false,
    progressLabel: incompleteLabel(contract, viewerHistoryComplete, clearHistoryComplete),
  }))

  let bestNewGuardians = 0
  let bestNewActivity = ''

  for (const step of walked) {
    if (!weekIds.has(step.run.id)) continue
    const run = step.run
    const newCount = step.newTeammates.length

    for (const contract of contracts) {
      const slot = progress.find((entry) => entry.id === contract.id)
      if (!slot || slot.completed) continue

      if (contract.rule.kind === 'featured_dungeon_new_guardians') {
        if (!viewerHistoryComplete) continue
        if (run.type !== 'dungeon') continue
        const featured = featuredDungeonsAt(new Date(run.completedAt))
        if (!featured.some((name) => namesMatch(name, run.activityName))) continue
        if (newCount > bestNewGuardians) {
          bestNewGuardians = newCount
          bestNewActivity = run.activityName
        }
        const need = contract.rule.minNewGuardians
        if (newCount >= need) {
          slot.completed = true
          slot.evidenceRunId = run.id
          slot.evidenceActivityName = run.activityName
          slot.progressLabel = `Cleared ${run.activityName} with ${newCount} new Guardians`
        } else {
          slot.progressLabel = `${bestNewGuardians}/${need} new Guardians${bestNewActivity ? ` — ${bestNewActivity}` : ''}`
        }
        continue
      }

      if (contract.rule.kind === 'raid_mixed_clan') {
        if (!raidHasClanmateAndOutsider(run, viewer)) continue
        slot.completed = true
        slot.evidenceRunId = run.id
        slot.evidenceActivityName = run.activityName
        slot.progressLabel = `Cleared ${run.activityName} with a clanmate and a Guardian from outside your clan`
        continue
      }

      if (contract.rule.kind === 'help_first_timer') {
        if (!clearHistoryComplete) continue
        const learner = firstTimerOnRun(run, viewer, firstClears)
        if (!learner) continue
        slot.completed = true
        slot.evidenceRunId = run.id
        slot.evidenceActivityName = run.activityName
        slot.progressLabel = `Helped ${learner.displayName} with their first ${run.activityName} clear`
      }
    }
  }

  for (const contract of contracts) {
    if (contract.rule.kind !== 'featured_dungeon_new_guardians') continue
    const slot = progress.find((entry) => entry.id === contract.id)
    if (!slot || slot.completed || !viewerHistoryComplete) continue
    if (bestNewGuardians > 0) {
      slot.progressLabel = `${bestNewGuardians}/${contract.rule.minNewGuardians} new Guardians${bestNewActivity ? ` — ${bestNewActivity}` : ''}`
    }
  }

  const weekTierPoints = progress.reduce((sum, contract) => sum + (contract.completed ? contract.tierPoints : 0), 0)
  return { contracts: progress, weekTierPoints }
}

function incompleteLabel(
  contract: WeeklyContractDefinition,
  viewerHistoryComplete: boolean,
  clearHistoryComplete: boolean
): string {
  if (contract.rule.kind === 'featured_dungeon_new_guardians' && !viewerHistoryComplete) {
    return 'Clear history is incomplete, so new Guardians cannot be verified yet'
  }
  if (contract.rule.kind === 'help_first_timer' && !clearHistoryComplete) {
    return 'Clear history is incomplete, so first-timers cannot be verified yet'
  }
  if (contract.rule.kind === 'featured_dungeon_new_guardians') {
    return `0/${contract.rule.minNewGuardians} new Guardians on a featured dungeon`
  }
  if (contract.rule.kind === 'raid_mixed_clan') {
    return 'Need a raid clear with a clanmate and a Guardian from outside your clan'
  }
  return 'Clear any activity with a Guardian who has no earlier full clear of it'
}

function weekBuckets(runs: RunRecord[], viewer: FireteamViewer): WeekBucket[] {
  const buckets = new Map<string, RunRecord[]>()
  for (const run of dedupeRuns(runs)) {
    if (!runIncludesViewer(run, viewer) || !isFullClearStampEligible(run)) continue
    const weekStart = getWeeklyResetState(new Date(run.completedAt)).weekStart
    const list = buckets.get(weekStart) ?? []
    list.push(run)
    buckets.set(weekStart, list)
  }
  return Array.from(buckets.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([weekStart, weekRuns]) => ({ weekStart, runs: weekRuns }))
}

export function emptyWeeklyContracts(now = new Date(), contracts?: WeeklyContractDefinition[]): WeeklyContractsSnapshot {
  const week = getWeeklyResetState(now)
  const catalog = resolveWeeklyContractCatalog(contracts)
  return {
    weekStart: week.weekStart,
    weekEnd: week.weekEnd,
    weekLabel: week.weekLabel,
    resetsInLabel: week.resetsInLabel,
    contracts: catalog.map((contract) => ({
      id: contract.id,
      title: contract.title,
      description: contract.description,
      tierPoints: contract.tierPoints,
      completed: false,
      progressLabel: incompleteLabel(contract, true, true),
    })),
    weekTierPoints: 0,
    seasonTierPoints: 0,
    seasonTier: resolveSeasonTier(0),
    historyComplete: true,
  }
}

/**
 * Verify the configured weekly contracts from PGCR-backed run records.
 * Each contract can complete once per Destiny Tuesday reset and adds season tier points.
 * Leaderboard `pointsAwarded` is not modified.
 */
export function evaluateWeeklyContracts(input: WeeklyContractEvalInput): WeeklyContractsSnapshot {
  const now = input.now ?? new Date()
  const contracts = resolveWeeklyContractCatalog(input.contracts)
  const featuredDungeonsAt = input.featuredDungeonsAt ?? defaultFeaturedDungeons
  const viewerHistoryComplete = input.viewerHistoryComplete !== false
  const clearHistoryComplete = input.clearHistoryComplete !== false
  const currentWeek = getWeeklyResetState(now)
  const firstClears = buildFirstClearIndex(input.runs)
  const viewerRuns = dedupeRuns(input.runs).filter(
    (run) => runIncludesViewer(run, input.viewer) && isFullClearStampEligible(run)
  )

  const buckets = weekBuckets(input.runs, input.viewer)
  if (!buckets.some((bucket) => bucket.weekStart === currentWeek.weekStart)) {
    buckets.push({ weekStart: currentWeek.weekStart, runs: [] })
  }

  let seasonTierPoints = 0
  let current: WeekEval | null = null

  for (const bucket of buckets) {
    const evaluated = evaluateWeek(
      bucket.runs,
      viewerRuns,
      input.viewer,
      contracts,
      featuredDungeonsAt,
      firstClears,
      viewerHistoryComplete,
      clearHistoryComplete
    )
    if (bucket.weekStart === currentWeek.weekStart) current = evaluated

    for (const contract of evaluated.contracts) {
      if (!contract.completed || !contract.evidenceRunId) continue
      const evidence = bucket.runs.find((run) => run.id === contract.evidenceRunId)
      if (!evidence) continue
      if (input.season && !inSeason(evidence.completedAt, input.season)) continue
      seasonTierPoints += contract.tierPoints
    }
  }

  const weekEval = current ?? {
    contracts: emptyWeeklyContracts(now, contracts).contracts,
    weekTierPoints: 0,
  }

  return {
    weekStart: currentWeek.weekStart,
    weekEnd: currentWeek.weekEnd,
    weekLabel: currentWeek.weekLabel,
    resetsInLabel: currentWeek.resetsInLabel,
    contracts: weekEval.contracts,
    weekTierPoints: weekEval.weekTierPoints,
    seasonTierPoints,
    seasonTier: resolveSeasonTier(seasonTierPoints),
    historyComplete: viewerHistoryComplete && clearHistoryComplete,
  }
}
