import { describe, expect, it } from 'vitest'
import { calculateRunPoints } from '@/lib/destiny/scoring'
import {
  evaluatePassport,
  formatStampPoints,
  REPEAT_TEAMMATE_STAMP_WEIGHT,
  staffApprovedFullClearForDecision,
  type FireteamViewer,
} from '@/lib/destiny/passport'
import type { RunRecord, RunTeamMember } from '@/lib/destiny/types'

const viewer: FireteamViewer = {
  userId: 'user-me',
  membershipId: 'me',
  clanId: 'clan-a',
  displayName: 'Me',
}

function member(id: string, extra: Partial<RunTeamMember> = {}): RunTeamMember {
  return {
    membershipId: id,
    displayName: id,
    platform: 'steam',
    characterClass: 'hunter',
    kills: 10,
    deaths: 1,
    assists: 3,
    score: 100,
    powerLevel: 2000,
    ...extra,
  }
}

function run(partial: Partial<RunRecord> & Pick<RunRecord, 'id' | 'completedAt'>): RunRecord {
  return {
    pgcrId: partial.id,
    activityId: 100,
    activityName: 'Vault of Glass',
    type: 'raid',
    difficulty: 'normal',
    durationSeconds: 1500,
    completed: true,
    checkpointLikely: false,
    teamMembers: [member('me', { displayName: 'Me' })],
    clanMemberCount: 1,
    randoCount: 0,
    isFullClanTeam: false,
    suspiciousScore: 0,
    verificationStatus: 'verified',
    pointsAwarded: 4,
    ownerUserId: 'user-me',
    ...partial,
  }
}

describe('passport stamps', () => {
  it('stamps a verified full clear and ignores the viewer as a teammate', () => {
    const passport = evaluatePassport(
      [run({ id: 'run-1', completedAt: '2026-10-08T18:00:00.000Z', teamMembers: [member('me'), member('ada')] })],
      viewer
    )

    expect(passport.clearStamps).toBe(1)
    expect(passport.newGuardianStamps).toBe(1)
    expect(passport.distinctTeammates).toBe(1)
    expect(passport.totalStamps).toBe(2)
    expect(passport.displayTitle).toBe('Stamped Guardian')
    expect(passport.activities).toHaveLength(1)
    expect(passport.activities[0]?.badgeLabel).toBe('Vault of Glass — First stamp')
  })

  it('gives repeat teammates a smaller stamp than a new Guardian', () => {
    const first = run({
      id: 'run-1',
      completedAt: '2026-10-08T18:00:00.000Z',
      teamMembers: [member('me'), member('ada'), member('bob')],
    })
    const second = run({
      id: 'run-2',
      pgcrId: 'run-2',
      completedAt: '2026-10-09T18:00:00.000Z',
      teamMembers: [member('me'), member('ada'), member('cara')],
    })

    const passport = evaluatePassport([second, first], viewer)
    const newest = passport.recentStamps[0]

    expect(passport.clearStamps).toBe(2)
    expect(passport.newGuardianStamps).toBe(3)
    expect(passport.repeatTeammateCredit).toBeCloseTo(REPEAT_TEAMMATE_STAMP_WEIGHT)
    expect(passport.distinctTeammates).toBe(3)
    expect(passport.totalStamps).toBeCloseTo(2 + 3 + REPEAT_TEAMMATE_STAMP_WEIGHT)
    expect(newest?.newGuardianNames).toEqual(['cara'])
    expect(newest?.repeatTeammateCredit).toBeCloseTo(REPEAT_TEAMMATE_STAMP_WEIGHT)
  })

  it('does not stamp incomplete, flagged, rejected, or checkpoint runs', () => {
    const base = { completedAt: '2026-10-08T18:00:00.000Z', teamMembers: [member('me'), member('ada')] }
    const passport = evaluatePassport(
      [
        run({ ...base, id: 'incomplete', completed: false }),
        run({ ...base, id: 'flagged', verificationStatus: 'flagged' }),
        run({ ...base, id: 'rejected', verificationStatus: 'rejected' }),
        run({ ...base, id: 'checkpoint', checkpointLikely: true }),
      ],
      viewer
    )

    expect(passport.clearStamps).toBe(0)
    expect(passport.totalStamps).toBe(0)
    expect(passport.displayTitle).toBe('Unstamped')
  })

  it('stamps a checkpoint only when staff approved it as a full clear', () => {
    const checkpoint = run({
      id: 'cp',
      completedAt: '2026-10-08T18:00:00.000Z',
      checkpointLikely: true,
      staffApprovedFullClear: true,
      pointsAwarded: 0,
      teamMembers: [member('me'), member('ada')],
    })

    const passport = evaluatePassport([checkpoint], viewer)
    expect(passport.clearStamps).toBe(1)

    const scoring = calculateRunPoints({
      activityType: 'raid',
      clanMemberCount: 1,
      randoCount: 1,
      isFullClanTeam: false,
      completed: true,
      checkpointLikely: true,
      verificationStatus: 'verified',
      suspiciousScore: 0,
    })
    expect(scoring.points).toBe(0)
    expect(checkpoint.pointsAwarded).toBe(0)
  })

  it('collapses duplicate PGCR rows and groups activity badges', () => {
    const clears = [1, 2, 3].map((index) =>
      run({
        id: index === 1 ? 'same' : `run-${index}`,
        pgcrId: index === 1 ? 'pgcr-1' : `pgcr-${index}`,
        completedAt: `2026-10-0${index + 6}T18:00:00.000Z`,
        activityName: 'Vow of the Disciple',
        activityId: 77,
        teamMembers: [member('me'), member(`g${index}`)],
      })
    )
    clears.push(
      run({
        id: 'dup',
        pgcrId: 'pgcr-1',
        completedAt: '2026-10-07T18:00:00.000Z',
        activityName: 'Vow of the Disciple',
        activityId: 77,
        teamMembers: [member('me'), member('g1')],
      })
    )

    const passport = evaluatePassport(clears, viewer)
    expect(passport.clearStamps).toBe(3)
    expect(passport.activities).toHaveLength(1)
    expect(passport.activities[0]?.clearCount).toBe(3)
    expect(passport.activities[0]?.badgeLabel).toBe('Vow of the Disciple — Regular')
  })

  it('formats fractional stamps without trailing zeros', () => {
    expect(formatStampPoints(2)).toBe('2')
    expect(formatStampPoints(2.5)).toBe('2.5')
    expect(formatStampPoints(0.25)).toBe('0.25')
  })

  it('maps staff review decisions onto the full-clear flag', () => {
    expect(staffApprovedFullClearForDecision('approve')).toBe(true)
    expect(staffApprovedFullClearForDecision('checkpoint_non_scoring')).toBe(false)
    expect(staffApprovedFullClearForDecision('reject')).toBe(false)
  })
})
