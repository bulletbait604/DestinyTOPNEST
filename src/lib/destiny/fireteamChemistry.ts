import type { ChemistryBoard, ChemistrySquad, RunRecord, TeammateSuggestion } from '@/lib/destiny/types'
import {
  isFullClearStampEligible,
  runIncludesViewer,
  teammatesOf,
  type FireteamViewer,
} from '@/lib/destiny/passport'
import { squadKeyFromMembers } from '@/lib/destiny/pantheonActivities'

const MIN_SQUAD_RUNS = 2
const SQUAD_LIMIT = 5
const SUGGESTION_LIMIT = 5

interface PairStats {
  membershipId: string
  displayName: string
  runsTogether: number
  clearsTogether: number
  clearSeconds: number[]
}

interface SquadStats {
  squadKey: string
  memberNames: string[]
  runsTogether: number
  clears: number
  clearSeconds: number[]
}

function average(values: number[]): number | null {
  if (!values.length) return null
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
}

function fastest(values: number[]): number | null {
  if (!values.length) return null
  return values.reduce((best, value) => (value < best ? value : best), values[0]!)
}

function clearRate(clears: number, runs: number): number {
  if (runs <= 0) return 0
  return Math.round((clears / runs) * 1000) / 1000
}

/**
 * Best squads by clear rate, then faster average clear time.
 * Suggestions are teammates the viewer already clears with.
 */
export function evaluateFireteamChemistry(runs: RunRecord[], viewer: FireteamViewer): ChemistryBoard {
  const squads = new Map<string, SquadStats>()
  const pairs = new Map<string, PairStats>()

  for (const run of runs) {
    if (!runIncludesViewer(run, viewer)) continue
    const teammates = teammatesOf(run, viewer)
    if (!teammates.length) continue
    const cleared = isFullClearStampEligible(run)
    const squadIds = [viewer.membershipId, ...teammates.map((member) => member.membershipId)].filter(Boolean)
    const squadKey = squadKeyFromMembers(squadIds)
    const names = teammates.map((member) => member.displayName).filter(Boolean)
    const squad = squads.get(squadKey) ?? {
      squadKey,
      memberNames: names,
      runsTogether: 0,
      clears: 0,
      clearSeconds: [],
    }
    squad.runsTogether += 1
    if (cleared) {
      squad.clears += 1
      if (run.durationSeconds > 0) squad.clearSeconds.push(run.durationSeconds)
    }
    if (names.length) squad.memberNames = names
    squads.set(squadKey, squad)

    for (const teammate of teammates) {
      const pair = pairs.get(teammate.membershipId) ?? {
        membershipId: teammate.membershipId,
        displayName: teammate.displayName,
        runsTogether: 0,
        clearsTogether: 0,
        clearSeconds: [],
      }
      pair.displayName = teammate.displayName || pair.displayName
      pair.runsTogether += 1
      if (cleared) {
        pair.clearsTogether += 1
        if (run.durationSeconds > 0) pair.clearSeconds.push(run.durationSeconds)
      }
      pairs.set(teammate.membershipId, pair)
    }
  }

  const squadRows: ChemistrySquad[] = Array.from(squads.values())
    .filter((squad) => squad.runsTogether >= MIN_SQUAD_RUNS)
    .map((squad) => ({
      squadKey: squad.squadKey,
      memberNames: squad.memberNames,
      runsTogether: squad.runsTogether,
      clears: squad.clears,
      clearRate: clearRate(squad.clears, squad.runsTogether),
      averageClearSeconds: average(squad.clearSeconds),
      bestClearSeconds: fastest(squad.clearSeconds),
    }))
    .sort((a, b) => {
      if (b.clearRate !== a.clearRate) return b.clearRate - a.clearRate
      const aTime = a.averageClearSeconds ?? Number.POSITIVE_INFINITY
      const bTime = b.averageClearSeconds ?? Number.POSITIVE_INFINITY
      if (aTime !== bTime) return aTime - bTime
      return b.clears - a.clears
    })
    .slice(0, SQUAD_LIMIT)

  const suggestions: TeammateSuggestion[] = Array.from(pairs.values())
    .filter((pair) => pair.clearsTogether > 0)
    .map((pair) => {
      const rate = clearRate(pair.clearsTogether, pair.runsTogether)
      const averageClearSeconds = average(pair.clearSeconds)
      const reason =
        rate >= 0.75
          ? `Clears ${Math.round(rate * 100)}% of runs together`
          : `${pair.clearsTogether} verified clears together`
      return {
        membershipId: pair.membershipId,
        displayName: pair.displayName,
        runsTogether: pair.runsTogether,
        clearsTogether: pair.clearsTogether,
        clearRate: rate,
        averageClearSeconds,
        reason,
      }
    })
    .sort((a, b) => {
      if (b.clearRate !== a.clearRate) return b.clearRate - a.clearRate
      const aTime = a.averageClearSeconds ?? Number.POSITIVE_INFINITY
      const bTime = b.averageClearSeconds ?? Number.POSITIVE_INFINITY
      if (aTime !== bTime) return aTime - bTime
      return b.clearsTogether - a.clearsTogether
    })
    .slice(0, SUGGESTION_LIMIT)

  return { squads: squadRows, suggestions }
}
