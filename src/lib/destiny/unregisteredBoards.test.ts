import { describe, expect, it } from 'vitest'
import { aggregateLeaderboard } from '@/lib/destiny/leaderboards'
import { isKickGuardiansClan, kickOwnerRecord } from '@/lib/destiny/kickGuardians'
import type { StoredDestinyUser } from '@/lib/destiny/destinyUserStore'
import type { RunRecord, RunTeamMember, Season } from '@/lib/destiny/types'

function member(id: string, extra: Partial<RunTeamMember> = {}): RunTeamMember {
  return {
    membershipId: id,
    displayName: extra.displayName ?? id,
    platform: 'steam',
    characterClass: 'hunter',
    kills: 1,
    deaths: 0,
    assists: 0,
    score: 1,
    powerLevel: 2000,
    ...extra,
  }
}

function raid(partial: Partial<RunRecord> & Pick<RunRecord, 'id'>): RunRecord {
  return {
    pgcrId: partial.pgcrId ?? partial.id,
    activityId: 1,
    activityName: 'Vault of Glass',
    type: 'raid',
    difficulty: 'normal',
    completedAt: '2026-10-08T18:00:00.000Z',
    durationSeconds: 1800,
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

const season = {
  id: 'season',
  name: 'Season',
  startDate: '2026-10-01T00:00:00.000Z',
  endDate: '2026-12-31T00:00:00.000Z',
  status: 'active',
  prizeRules: {
    raid: { first: '', second: '', thirdToFifth: '', participation: '' },
    dungeon: { first: '', second: '', thirdToFifth: '', participation: '' },
  },
} as Season

const users = new Map<string, StoredDestinyUser>([
  ['ada', { userId: 'ada', bungieMembershipId: '111', bungieDisplayName: 'Ada Nest', platform: 'steam' }],
])

describe('unregistered leaderboard players', () => {
  it('recognizes Kick Guardians and builds an unregistered owner key', () => {
    expect(isKickGuardiansClan(' kick guardians ')).toBe(true)
    expect(isKickGuardiansClan('Other Clan')).toBe(false)
    expect(kickOwnerRecord({ membershipId: '444', displayName: 'Kick Lead' }).userId).toBe('bungie:444')
  })

  it('scores teammates once per clear and keeps random groups off the board', () => {
    const shared = raid({
      id: 'shared',
      pgcrId: 'pgcr-1',
      ownerUserId: 'ada',
      ownerMembershipId: '111',
      pointsAwarded: 25,
      bondPoints: 15,
      teamMembers: [
        member('111', { displayName: 'Ada Nest' }),
        member('222', { displayName: 'Bex' }),
        member('333', { displayName: 'Left Early', completed: false }),
      ],
    })
    const duplicate = raid({
      id: 'dup',
      pgcrId: 'pgcr-1',
      ownerUserId: 'other',
      ownerMembershipId: '111',
      pointsAwarded: 25,
      bondPoints: 15,
      teamMembers: shared.teamMembers,
    })
    const randoms = raid({
      id: 'randos',
      pgcrId: 'pgcr-3',
      ownerUserId: 'bungie:777',
      ownerMembershipId: '777',
      pointsAwarded: 99,
      teamMembers: [member('777', { displayName: 'Lfg' }), member('888', { displayName: 'Lfg2' })],
    })

    const rows = aggregateLeaderboard([shared, duplicate, randoms], users, 'raid', 'all_time', season)
    expect(rows.map((row) => [row.userId, row.points])).toEqual([
      ['ada', 25],
      ['bungie:222', 25],
    ])
    expect(rows.find((row) => row.userId === 'bungie:222')?.bungieMembershipId).toBe('222')
    expect(rows.find((row) => row.userId === 'bungie:333')).toBeUndefined()

    const bonds = aggregateLeaderboard([shared, duplicate], users, 'new_bonds', 'all_time', season)
    expect(bonds.map((row) => row.points)).toEqual([15, 15])
  })

  it('scores a Kick Guardians clear and the guardians who ran with them', () => {
    const kickOnly = raid({
      id: 'kick',
      pgcrId: 'pgcr-2',
      type: 'dungeon',
      ownerUserId: 'bungie:444',
      ownerMembershipId: '444',
      ownerDisplayName: 'Kick Lead',
      pointsAwarded: 6,
      teamMembers: [
        member('444', { displayName: 'Kick Lead', clanName: 'Kick Guardians' }),
        member('555', { displayName: 'Guest' }),
      ],
    })
    const rows = aggregateLeaderboard([kickOnly], users, 'dungeon', 'all_time', season)
    expect(rows.map((row) => [row.userId, row.bungieDisplayName, row.points])).toEqual([
      ['bungie:444', 'Kick Lead', 6],
      ['bungie:555', 'Guest', 6],
    ])
  })
})
