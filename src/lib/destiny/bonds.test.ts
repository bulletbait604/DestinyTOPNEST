import { describe, expect, it } from 'vitest'
import { BOND_RULES, bondPairKey, bondRingSuspicion, eligibleBondTeammates, scoreBondRun } from './bonds'
import { calculateRunPoints } from './scoring'
import type { RunTeamMember } from './types'

function member(id: string, extra: Partial<RunTeamMember> = {}): RunTeamMember {
  return {
    membershipId: id,
    displayName: `G${id}`,
    platform: 'steam',
    characterClass: 'hunter',
    kills: 10,
    deaths: 1,
    assists: 1,
    score: 0,
    powerLevel: 2000,
    completed: true,
    timePlayedSeconds: 3000,
    fireteamId: 'ft1',
    ...extra,
  }
}

const mates = (ids: string[]) => ids.map((id) => ({ membershipId: id, displayName: id }))

describe('eligibleBondTeammates', () => {
  it('excludes the owner, non-finishers, short stays, and other fireteams', () => {
    const team = [
      member('me'),
      member('a'),
      member('b', { completed: false }),
      member('c', { timePlayedSeconds: 600 }),
      member('d', { fireteamId: 'other' }),
      member('a'),
    ]
    expect(eligibleBondTeammates(team, 'me', 3600).map((m) => m.membershipId)).toEqual(['a'])
  })
  it('keeps legacy rows without completion data', () => {
    const team = [member('me'), member('x', { completed: undefined, timePlayedSeconds: undefined, fireteamId: undefined })]
    expect(eligibleBondTeammates(team, 'me', 3600)).toHaveLength(1)
  })
})

describe('scoreBondRun', () => {
  it('rewards every first-time teammate in a raid (no stranger cap)', () => {
    const s = scoreBondRun({
      activityType: 'raid',
      durationSeconds: 3600,
      teammates: mates(['1', '2', '3', '4', '5']),
      priorRunsTogether: new Map(),
      newBondsLast24h: 0,
    })
    expect(s.newBondIds).toHaveLength(5)
    expect(s.bondPoints).toBe(5 * BOND_RULES.newBondPoints.raid)
    expect(s.points).toBe(BOND_RULES.basePoints.raid + 75)
  })
  it('gives smaller growing-bond points for 2nd/3rd runs then stops', () => {
    const s = scoreBondRun({
      activityType: 'dungeon',
      durationSeconds: 1800,
      teammates: mates(['a', 'b', 'c']),
      priorRunsTogether: new Map([
        ['a', 1],
        ['b', 2],
        ['c', 3],
      ]),
      newBondsLast24h: 0,
    })
    expect(s.newBondIds).toEqual([])
    expect(s.repeatBondIds).toEqual(['a', 'b'])
    expect(s.bondPoints).toBe(2 * BOND_RULES.repeatBondPoints)
  })
  it('caps new bonds per 24h', () => {
    const s = scoreBondRun({
      activityType: 'raid',
      durationSeconds: 3600,
      teammates: mates(['1', '2', '3', '4', '5']),
      priorRunsTogether: new Map(),
      newBondsLast24h: BOND_RULES.dailyNewBondCap - 2,
    })
    expect(s.newBondIds).toHaveLength(2)
    expect(s.cappedBondIds).toHaveLength(3)
  })
  it('gives no bond bonus for suspiciously short clears', () => {
    const s = scoreBondRun({
      activityType: 'raid',
      durationSeconds: 300,
      teammates: mates(['1']),
      priorRunsTogether: new Map(),
      newBondsLast24h: 0,
    })
    expect(s.bondPoints).toBe(0)
    expect(s.points).toBe(BOND_RULES.basePoints.raid)
  })
  it('adds a sherpa bonus for a teammate first clear', () => {
    const s = scoreBondRun({
      activityType: 'dungeon',
      durationSeconds: 1800,
      teammates: mates(['n']),
      priorRunsTogether: new Map(),
      newBondsLast24h: 0,
      firstClearTeammateIds: new Set(['n']),
    })
    expect(s.bondPoints).toBe(BOND_RULES.newBondPoints.dungeon + BOND_RULES.sherpaBonusPoints)
  })
})

describe('calculateRunPoints with bonds', () => {
  const base = {
    activityType: 'raid' as const,
    clanMemberCount: 0,
    randoCount: 5,
    isFullClanTeam: false,
    completed: true,
    checkpointLikely: false,
    verificationStatus: 'verified' as const,
    suspiciousScore: 0,
  }
  it('no longer zeroes runs with many randoms', () => {
    const r = calculateRunPoints({ ...base, bondPoints: 30 })
    expect(r.eligible).toBe(true)
    expect(r.points).toBe(BOND_RULES.basePoints.raid + 30)
  })
  it('still blocks checkpoint, unverified and suspicious runs', () => {
    expect(calculateRunPoints({ ...base, checkpointLikely: true, bondPoints: 30 }).points).toBe(0)
    expect(calculateRunPoints({ ...base, verificationStatus: 'pending', bondPoints: 30 }).points).toBe(0)
    expect(calculateRunPoints({ ...base, suspiciousScore: 80, bondPoints: 30 }).points).toBe(0)
  })
})

describe('helpers', () => {
  it('pair keys are order independent', () => {
    expect(bondPairKey('b', 'a')).toBe(bondPairKey('a', 'b'))
  })
  it('flags alt-heavy bond rings', () => {
    expect(bondRingSuspicion({ bondsLast7d: 40, distinctPartnersLast30d: 10, partnersWithPrivateOrNewAccounts: 8 })).toBe(90)
    expect(bondRingSuspicion({ bondsLast7d: 5, distinctPartnersLast30d: 10, partnersWithPrivateOrNewAccounts: 0 })).toBe(0)
  })
})
