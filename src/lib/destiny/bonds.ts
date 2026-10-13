/**
 * "New Bonds" scoring — rewards completing activities with fireteam members you
 * have never cleared with before (detected from Bungie PGCR fireteam data).
 *
 * Pure functions only; persistence lives in bondStore.ts.
 */
import type { ActivityType, RunTeamMember } from '@/lib/destiny/types'

export const BOND_RULES = {
  /** Base points for any verified full clear. */
  basePoints: { raid: 10, dungeon: 6, pantheon: 10 } as Record<ActivityType, number>,
  /** Bonus per first-time teammate. */
  newBondPoints: { raid: 15, dungeon: 10, pantheon: 15 } as Record<ActivityType, number>,
  /** Bonus per teammate on your 2nd or 3rd clear together (turn LFG into friends). */
  repeatBondPoints: 4,
  /** Runs together after which a pair stops earning bond bonuses. */
  repeatBondMaxRuns: 3,
  /** Extra per first-time teammate for whom this was their first clear of the activity. */
  sherpaBonusPoints: 10,
  /** Max new bonds that can score in a rolling 24h window (anti-farm). */
  dailyNewBondCap: 6,
  /** Teammate must play at least this fraction of the activity to count. */
  minTimePlayedFraction: 0.5,
  /** Activities shorter than this never award bond points (seconds). */
  minActivitySeconds: { raid: 900, dungeon: 600, pantheon: 300 } as Record<ActivityType, number>,
} as const

export interface BondTeammate {
  membershipId: string
  displayName: string
}

/** Teammates that legitimately shared the clear with the owner. */
export function eligibleBondTeammates(
  members: RunTeamMember[],
  ownerMembershipId: string,
  activityDurationSeconds: number
): BondTeammate[] {
  const owner = members.find((m) => m.membershipId === ownerMembershipId)
  const minPlayed = Math.max(0, activityDurationSeconds) * BOND_RULES.minTimePlayedFraction
  const seen = new Set<string>()
  const out: BondTeammate[] = []
  for (const m of members) {
    if (!m.membershipId || m.membershipId === ownerMembershipId || seen.has(m.membershipId)) continue
    if (m.completed === false) continue
    if (owner?.fireteamId && m.fireteamId && owner.fireteamId !== m.fireteamId) continue
    if (m.timePlayedSeconds != null && activityDurationSeconds > 0 && m.timePlayedSeconds < minPlayed) continue
    seen.add(m.membershipId)
    out.push({ membershipId: m.membershipId, displayName: m.displayName })
  }
  return out
}

export interface BondScoreInput {
  activityType: ActivityType
  durationSeconds: number
  teammates: BondTeammate[]
  /** Prior clears together per teammate membershipId (excluding this run). */
  priorRunsTogether: Map<string, number>
  /** New bonds already scored by the owner in the last 24h (excluding this run). */
  newBondsLast24h: number
  /** Teammates for whom this was their first-ever clear of the activity (optional signal). */
  firstClearTeammateIds?: Set<string>
}

export interface BondScore {
  basePoints: number
  bondPoints: number
  points: number
  newBondIds: string[]
  repeatBondIds: string[]
  cappedBondIds: string[]
  reasons: string[]
}

export function scoreBondRun(input: BondScoreInput): BondScore {
  const reasons: string[] = []
  const basePoints = BOND_RULES.basePoints[input.activityType] ?? 0
  const result: BondScore = {
    basePoints,
    bondPoints: 0,
    points: basePoints,
    newBondIds: [],
    repeatBondIds: [],
    cappedBondIds: [],
    reasons,
  }
  const minSeconds = BOND_RULES.minActivitySeconds[input.activityType] ?? 0
  if (input.durationSeconds > 0 && input.durationSeconds < minSeconds) {
    reasons.push(`Clear shorter than ${Math.round(minSeconds / 60)} min — no bond bonus`)
    return result
  }

  let capLeft = Math.max(0, BOND_RULES.dailyNewBondCap - input.newBondsLast24h)
  const perNew = BOND_RULES.newBondPoints[input.activityType] ?? 0
  for (const mate of input.teammates) {
    const prior = input.priorRunsTogether.get(mate.membershipId) ?? 0
    if (prior === 0) {
      if (capLeft <= 0) {
        result.cappedBondIds.push(mate.membershipId)
        continue
      }
      capLeft -= 1
      result.newBondIds.push(mate.membershipId)
      result.bondPoints += perNew
      if (input.firstClearTeammateIds?.has(mate.membershipId)) {
        result.bondPoints += BOND_RULES.sherpaBonusPoints
        reasons.push(`Sherpa bonus: first clear for ${mate.displayName}`)
      }
    } else if (prior < BOND_RULES.repeatBondMaxRuns) {
      result.repeatBondIds.push(mate.membershipId)
      result.bondPoints += BOND_RULES.repeatBondPoints
    }
  }
  if (result.newBondIds.length) reasons.push(`${result.newBondIds.length} new fireteam bond(s)`)
  if (result.repeatBondIds.length) reasons.push(`${result.repeatBondIds.length} growing bond(s)`)
  if (result.cappedBondIds.length) reasons.push(`Daily new-bond cap (${BOND_RULES.dailyNewBondCap}) reached`)
  result.points = basePoints + result.bondPoints
  return result
}

/** Canonical pair key — order-independent. */
export function bondPairKey(a: string, b: string): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`
}

/**
 * Farm-ring heuristic: many runs, almost all with the same tiny pool of partners
 * yet the run keeps "creating" bonds via alt accounts. Returns 0-100 suspicion.
 */
export function bondRingSuspicion(stats: {
  bondsLast7d: number
  distinctPartnersLast30d: number
  partnersWithPrivateOrNewAccounts: number
}): number {
  let score = 0
  if (stats.bondsLast7d > 30) score += 40
  if (stats.distinctPartnersLast30d > 0) {
    const altRatio = stats.partnersWithPrivateOrNewAccounts / stats.distinctPartnersLast30d
    if (altRatio > 0.6) score += 50
    else if (altRatio > 0.3) score += 20
  }
  return Math.min(100, score)
}
