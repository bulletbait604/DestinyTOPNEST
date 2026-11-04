import { describe, expect, it } from 'vitest'
import { aggregateLeaderboard } from '@/lib/destiny/leaderboards'
import {
  formatBungieGlobalName,
  isBungieGlobalName,
  preferBungieGlobalName,
  primaryMembershipId,
} from '@/lib/destiny/guardianIdentity'
import type { StoredDestinyUser } from '@/lib/destiny/destinyUserStore'
import type { RunRecord, RunTeamMember, Season } from '@/lib/destiny/types'

function member(id: string, displayName: string, extra: Partial<RunTeamMember> = {}): RunTeamMember {
  return {
    membershipId: id,
    displayName,
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
    pointsAwarded: 3,
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

const SILVER = '4611686018508727816'

describe('Bungie global names', () => {
  it('formats Name#code and prefers it over a platform name', () => {
    expect(formatBungieGlobalName('SilverWolf27', 1750)).toBe('SilverWolf27#1750')
    expect(isBungieGlobalName('SilverWolf27#1750')).toBe(true)
    expect(isBungieGlobalName('SilverWolf27')).toBe(false)
    expect(preferBungieGlobalName('SilverWolf27', 'SilverWolf27#1750')).toBe('SilverWolf27#1750')
    expect(preferBungieGlobalName('SilverWolf27#1750', 'SilverWolf27')).toBe('SilverWolf27#1750')
  })

  it('follows a cross-save alias to the primary membership', () => {
    const aliases = new Map([['platform-id', SILVER]])
    expect(primaryMembershipId('platform-id', aliases)).toBe(SILVER)
    expect(primaryMembershipId(SILVER, aliases)).toBe(SILVER)
  })
})

describe('leaderboard identity', () => {
  it('lists one row per Bungie membership and combines that Guardian\'s clears', () => {
    const own = raid({
      id: 'own',
      pgcrId: 'pgcr-own',
      ownerUserId: 'site-user',
      ownerMembershipId: SILVER,
      ownerDisplayName: 'SilverWolf27#1750',
      pointsAwarded: 3,
      teamMembers: [member(SILVER, 'SilverWolf27#1750')],
    })
    const teammate = raid({
      id: 'with-friends',
      pgcrId: 'pgcr-friends',
      ownerUserId: 'other',
      ownerMembershipId: '999',
      ownerDisplayName: 'EyeAmNote#3615',
      pointsAwarded: 3,
      teamMembers: [member('999', 'EyeAmNote#3615'), member(SILVER, 'SilverWolf27')],
    })
    const sameRunCopy = raid({
      id: 'own-copy',
      pgcrId: 'pgcr-own',
      ownerUserId: 'bungie:' + SILVER,
      ownerMembershipId: SILVER,
      pointsAwarded: 3,
      teamMembers: [member(SILVER, 'SilverWolf27')],
    })

    const rows = aggregateLeaderboard([own, teammate, sameRunCopy], new Map(), 'raid', 'all_time', season)
    const memberships = rows.map((row) => row.bungieMembershipId)
    expect(new Set(memberships).size).toBe(memberships.length)
    expect(memberships.filter((id) => id === SILVER)).toHaveLength(1)

    const wolf = rows.find((row) => row.bungieMembershipId === SILVER)
    expect(wolf?.bungieDisplayName).toBe('SilverWolf27#1750')
    expect(wolf?.points).toBe(6)
    expect(wolf?.userId).toBe(`bungie:${SILVER}`)
  })

  it('merges cross-save platform ids onto the primary membership without scoring one clear twice', () => {
    const users = new Map<string, StoredDestinyUser>([
      [
        'wolf',
        {
          userId: 'wolf',
          bungieMembershipId: SILVER,
          bungieDisplayName: 'SilverWolf27#1750',
          linkedMembershipIds: ['platform-id'],
          platform: 'steam',
        },
      ],
    ])
    const platformClear = raid({
      id: 'platform',
      pgcrId: 'pgcr-platform',
      ownerUserId: 'wolf',
      ownerMembershipId: 'platform-id',
      pointsAwarded: 3,
      teamMembers: [member('platform-id', 'SilverWolf27'), member(SILVER, 'SilverWolf27#1750')],
    })
    const primaryClear = raid({
      id: 'primary',
      pgcrId: 'pgcr-primary',
      ownerUserId: 'someone',
      ownerMembershipId: '888',
      pointsAwarded: 3,
      teamMembers: [member('888', 'Other#0001'), member(SILVER, 'SilverWolf27#1750')],
    })
    const rows = aggregateLeaderboard([platformClear, primaryClear], users, 'raid', 'all_time', season)
    const wolves = rows.filter((row) => row.bungieMembershipId === SILVER || row.bungieMembershipId === 'platform-id')
    expect(wolves).toHaveLength(1)
    expect(wolves[0]?.points).toBe(6)
    expect(wolves[0]?.bungieDisplayName).toBe('SilverWolf27#1750')
    expect(new Set(rows.map((row) => row.bungieMembershipId)).size).toBe(rows.length)
  })
})
