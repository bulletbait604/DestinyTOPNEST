import { describe, expect, it } from 'vitest'
import { applyMvpBoardPoints } from '@/lib/destiny/leaderboardAdjustments'
import { assignStoredClearPoints, MVP_BOARD_POINTS, storedClearPoints } from '@/lib/destiny/scoring'
import type { LeaderboardEntry, RunRecord } from '@/lib/destiny/types'

function run(partial: Partial<RunRecord>): RunRecord {
  return {
    id: 'run',
    pgcrId: 'pgcr',
    activityId: 1,
    activityName: 'Vault of Glass',
    type: 'raid',
    difficulty: 'normal',
    completedAt: '2026-10-01T00:00:00.000Z',
    durationSeconds: 1200,
    completed: true,
    checkpointLikely: false,
    teamMembers: [],
    clanMemberCount: 0,
    randoCount: 0,
    isFullClanTeam: false,
    suspiciousScore: 0,
    verificationStatus: 'verified',
    pointsAwarded: 10,
    ...partial,
  }
}

describe('clear and MVP scoring', () => {
  it('scores a raid at 3 and a dungeon at 1, and ignores incomplete clears', () => {
    expect(storedClearPoints(run({ type: 'raid' }))).toBe(3)
    expect(storedClearPoints(run({ type: 'dungeon', activityName: 'Duality' }))).toBe(1)
    expect(storedClearPoints(run({ type: 'pantheon' }))).toBe(0)
    expect(storedClearPoints(run({ completed: false }))).toBe(0)
    expect(storedClearPoints(run({ checkpointLikely: true }))).toBe(0)
    expect(storedClearPoints(run({ checkpointLikely: true, staffApprovedFullClear: true }))).toBe(3)
    expect(storedClearPoints(run({ verificationStatus: 'rejected' }))).toBe(0)
  })

  it('adds 2 points for every MVP vote on raid and dungeon boards', () => {
    const entry = {
      userId: 'ada',
      bungieDisplayName: 'Ada',
      platform: 'steam',
      category: 'raid',
      seasonId: 's',
      period: 'season',
      points: 3,
      verifiedClears: 1,
      rank: 1,
      mvpVotes: 2,
    } as LeaderboardEntry
    const [row] = applyMvpBoardPoints([entry], 'raid')
    expect(row.points).toBe(3 + 2 * MVP_BOARD_POINTS)
    expect(applyMvpBoardPoints([{ ...entry, category: 'new_bonds' }], 'new_bonds')[0].points).toBe(3)
  })

  it('keeps one completed clear per PGCR and drops the duplicate', () => {
    const first = run({ id: 'a', pgcrId: 'same' })
    const duplicate = run({ id: 'b', pgcrId: 'same' })
    const unfinished = run({ id: 'c', pgcrId: 'same', completed: false })
    const dungeon = run({ id: 'd', pgcrId: 'other', type: 'dungeon', activityName: 'Duality' })
    const assigned = assignStoredClearPoints([duplicate, unfinished, first, dungeon])
    expect(assigned.find((row) => row.id === 'a')).toMatchObject({ points: 3, duplicate: false })
    expect(assigned.find((row) => row.id === 'b')).toMatchObject({ points: 0, duplicate: true })
    expect(assigned.find((row) => row.id === 'c')).toMatchObject({ points: 0, duplicate: true })
    expect(assigned.find((row) => row.id === 'd')).toMatchObject({ points: 1, duplicate: false })
  })
})
