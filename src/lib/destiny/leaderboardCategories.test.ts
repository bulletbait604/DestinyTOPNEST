import { describe, expect, it } from 'vitest'
import { ACTIVE_LEADERBOARD_CATEGORIES, isActiveLeaderboardCategory } from './leaderboards'
import { DEFAULT_SEASON_PRIZE_RULES } from './seasonCatalog'

describe('active leaderboards', () => {
  it('scores only raid, dungeon, and new bonds', () => {
    expect([...ACTIVE_LEADERBOARD_CATEGORIES]).toEqual(['raid', 'dungeon', 'new_bonds'])
    expect(isActiveLeaderboardCategory('raid')).toBe(true)
    expect(isActiveLeaderboardCategory('dungeon')).toBe(true)
    expect(isActiveLeaderboardCategory('new_bonds')).toBe(true)
    expect(isActiveLeaderboardCategory('pantheon')).toBe(false)
    expect(isActiveLeaderboardCategory('top_guardians')).toBe(false)
    expect(isActiveLeaderboardCategory('commander')).toBe(false)
  })

  it('does not prize pantheon or commander boards', () => {
    expect(Object.keys(DEFAULT_SEASON_PRIZE_RULES).sort()).toEqual(['dungeon', 'newBonds', 'raid'])
    const text = JSON.stringify(DEFAULT_SEASON_PRIZE_RULES).toLowerCase()
    expect(text).not.toContain('pantheon')
    expect(text).not.toContain('commander')
  })
})
