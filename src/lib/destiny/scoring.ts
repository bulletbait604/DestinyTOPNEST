import { BOND_RULES } from '@/lib/destiny/bonds'
import type { ActivityType } from '@/lib/destiny/types'

export interface ScoringInput {
  activityType: ActivityType
  clanMemberCount: number
  randoCount: number
  isFullClanTeam: boolean
  completed: boolean
  checkpointLikely: boolean
  verificationStatus: 'verified' | 'pending' | 'flagged' | 'rejected'
  suspiciousScore: number
  /** Bond bonus computed by scoreBondRun (0 when none). */
  bondPoints?: number
}

export interface ScoringResult {
  points: number
  eligible: boolean
  reasons: string[]
}

/** Calculate points for a run per DestinyTopNest rules. */
export function calculateRunPoints(input: ScoringInput): ScoringResult {
  const reasons: string[] = []

  if (!input.completed) {
    return { points: 0, eligible: false, reasons: ['Run not completed'] }
  }
  if (input.checkpointLikely) {
    return { points: 0, eligible: false, reasons: ['Checkpoint run — requires manual approval for scoring'] }
  }
  if (input.verificationStatus !== 'verified') {
    return { points: 0, eligible: false, reasons: [`Verification status: ${input.verificationStatus}`] }
  }
  if (input.suspiciousScore >= 70) {
    return { points: 0, eligible: false, reasons: ['Suspicious score 70+ — blocked until admin approval'] }
  }

  // The old stranger cap (max 2 randos raid / 1 dungeon) is gone: playing with new
  // people is the point. Points = base clear + New Bonds bonus (see bonds.ts).
  const base = BOND_RULES.basePoints[input.activityType] ?? 0
  const bondPoints = Math.max(0, input.bondPoints ?? 0)
  const points = base + bondPoints
  if (bondPoints > 0) reasons.push(`+${bondPoints} New Bonds points`)

  if (input.isFullClanTeam) {
    reasons.push('Full clan team clear')
  }

  return { points, eligible: true, reasons }
}
