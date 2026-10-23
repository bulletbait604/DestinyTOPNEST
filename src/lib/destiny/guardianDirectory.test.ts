import { describe, expect, it } from 'vitest'
import { filterLeaderboardEntries } from '@/lib/destiny/boardFilters'
import { RATE_TAGS } from '@/lib/destiny/quickRate'
import {
  guardianBadges,
  guardianNameMatches,
  sortGuardianCards,
  splitBungieNameQuery,
  type GuardianDirectoryCard,
} from '@/lib/destiny/guardianDirectory'
import { parsePublicPresentation, readModeClears } from '@/lib/destiny/publicProfileParse'
import type { LeaderboardEntry } from '@/lib/destiny/types'

function card(partial: Partial<GuardianDirectoryCard> & Pick<GuardianDirectoryCard, 'displayName' | 'membershipId'>): GuardianDirectoryCard {
  return {
    status: 'member',
    mvpCount: 0,
    kudosCount: 0,
    badges: [],
    ...partial,
  }
}

describe('guardian directory', () => {
  it('matches a Bungie name with or without the code', () => {
    expect(guardianNameMatches('Ada-1#0042', 'ada')).toBe(true)
    expect(guardianNameMatches('Ada-1#0042', 'Ada-1#42')).toBe(false)
    expect(guardianNameMatches('Ada-1#0042', 'ada-1#0042')).toBe(true)
    expect(splitBungieNameQuery('Ada-1#0042')).toEqual({ displayName: 'Ada-1', code: 42 })
    expect(splitBungieNameQuery('Ada')).toBeNull()
  })

  it('ranks claimed accounts ahead of pending names', () => {
    const rows = sortGuardianCards(
      [
        card({ membershipId: '2', displayName: 'Nova#0002', status: 'pending' }),
        card({ membershipId: '1', displayName: 'Nova#0001', status: 'member' }),
      ],
      'nova'
    )
    expect(rows.map((row) => row.status)).toEqual(['member', 'pending'])
  })

  it('builds reputation badges for pending players and MVP votes', () => {
    const badges = guardianBadges({
      status: 'pending',
      verifiedClears: 10,
      mvpCount: 2,
      kudosCount: 1,
      sherpaPoints: 5,
    })
    expect(badges).toContain('Awaiting sign-in')
    expect(badges).toContain('10+ verified clears')
    expect(badges).toContain('2 MVPs')
    expect(badges).toContain('Sherpa')
  })

  it('keeps New Light and Useless on the rank list, away from the MVP crown', () => {
    expect(RATE_TAGS).toContain('new_light')
    expect(RATE_TAGS).toContain('useless')
    expect([...(RATE_TAGS as readonly string[])]).not.toContain('mvp')
  })
})

describe('public profile parse', () => {
  it('reads characters, equipped weapons, and vault hashes', () => {
    const parsed = parsePublicPresentation({
      profile: { data: { userInfo: { bungieGlobalDisplayName: 'Nova' } } },
      characters: {
        data: {
          a: { characterId: 'a', classType: 1, light: 2000, emblemPath: '/img/emblem.jpg' },
        },
      },
      characterEquipment: {
        data: {
          a: { items: [{ itemHash: 11, bucketHash: 1498876634 }, { itemHash: 99, bucketHash: 3448274439 }] },
        },
      },
      profileInventory: { data: { items: [{ itemHash: 22 }, { itemHash: 22 }, { itemHash: 33 }] } },
    })
    expect(parsed.displayName).toBe('Nova')
    expect(parsed.characters[0]?.className).toBe('hunter')
    expect(parsed.equippedHashes.map((slot) => slot.itemHash)).toEqual([11])
    expect(parsed.vaultHashes).toEqual([22, 33])
  })

  it('reads raid clears from a results wrapper', () => {
    expect(readModeClears({ results: { raid: { allTime: { activitiesCleared: { basic: { value: 14 } } } } } }, 'raid')).toBe(14)
  })
})

describe('leaderboard filters', () => {
  const entry = {
    userId: 'u',
    bungieDisplayName: 'Nova',
    platform: 'steam',
    category: 'raid',
    seasonId: 's1',
    period: 'season',
    points: 10,
    verifiedClears: 1,
    rank: 1,
    fastestActivityName: 'Vault of Glass',
  } satisfies LeaderboardEntry

  it('filters by name, platform, and fastest activity', () => {
    expect(filterLeaderboardEntries([entry], { name: 'no' })).toHaveLength(1)
    expect(filterLeaderboardEntries([entry], { name: 'zzz' })).toHaveLength(0)
    expect(filterLeaderboardEntries([entry], { platform: 'xbox' })).toHaveLength(0)
    expect(filterLeaderboardEntries([entry], { activity: 'vault' })).toHaveLength(1)
  })
})
