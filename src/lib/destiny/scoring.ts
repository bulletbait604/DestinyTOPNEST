import { BOND_RULES } from '@/lib/destiny/bonds'
import type { ActivityType, RunRecord } from '@/lib/destiny/types'

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

/** Added to a raid or dungeon board total for each MVP vote that player has received. */
export const MVP_BOARD_POINTS = 2

export function mvpBoardBonus(mvpVotes: number | undefined, category: 'raid' | 'dungeon' | 'new_bonds'): number {
  if (category === 'new_bonds') return 0
  const votes = Math.max(0, Math.floor(mvpVotes ?? 0))
  return votes * MVP_BOARD_POINTS
}

/** Points stored on a completed clear. Raid 3, dungeon 1. Incomplete or rejected clears are 0. */
export function storedClearPoints(
  run: Pick<RunRecord, 'type' | 'completed' | 'verificationStatus' | 'checkpointLikely' | 'staffApprovedFullClear'>
): number {
  if (run.verificationStatus !== 'verified' || !run.completed) return 0
  if (run.checkpointLikely && !run.staffApprovedFullClear) return 0
  return BOND_RULES.basePoints[run.type] ?? 0
}

type ClearPointRun = Pick<
  RunRecord,
  'id' | 'pgcrId' | 'type' | 'completed' | 'verificationStatus' | 'checkpointLikely' | 'staffApprovedFullClear'
>

export interface StoredPointAssignment {
  id: string
  points: number
  duplicate: boolean
}

/**
 * One point value per PGCR. The completed clear keeps raid 3 or dungeon 1.
 * Later copies of that same report, and anything unfinished, are 0.
 */
export function assignStoredClearPoints(runs: ClearPointRun[]): StoredPointAssignment[] {
  const ranked = [...runs].sort((a, b) => (a.id || '').localeCompare(b.id || ''))
  const winnerByPgcr = new Map<string, ClearPointRun>()
  for (const run of ranked) {
    const key = (run.pgcrId || run.id || '').trim()
    if (!key) continue
    const current = winnerByPgcr.get(key)
    if (!current || storedClearPoints(run) > storedClearPoints(current)) winnerByPgcr.set(key, run)
  }
  return ranked.map((run) => {
    const key = (run.pgcrId || run.id || '').trim()
    const winner = key ? winnerByPgcr.get(key) : undefined
    const duplicate = Boolean(winner && winner.id !== run.id)
    return { id: run.id, points: duplicate ? 0 : storedClearPoints(run), duplicate }
  })
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

  // A clear is 3 for a raid and 1 for a dungeon. Teammate bonuses stay on bondPoints
  // for the New Teammates board. MVP votes add 2 points each when the board is built.
  const points = BOND_RULES.basePoints[input.activityType] ?? 0

  if (input.isFullClanTeam) {
    reasons.push('Full clan team clear')
  }

  return { points, eligible: true, reasons }
}
