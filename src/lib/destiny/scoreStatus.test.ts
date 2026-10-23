import { describe, expect, it } from 'vitest'
import { recentRunLines, scoreBoardLines, scorePointsLine } from '@/lib/destiny/scoreStatus'

describe('score status', () => {
  it('names each board rank in plain words', () => {
    expect(
      scoreBoardLines([
        { category: 'raid', rank: 2, points: 40 },
        { category: 'new_bonds', rank: 1, points: 15 },
      ])
    ).toEqual([
      'Raid board: #2 · 40 pts',
      'Dungeon board: not ranked yet',
      'New Teammates board: #1 · 15 pts',
    ])
  })

  it('lists recent clears and the point totals', () => {
    expect(scorePointsLine({ raidPoints: 12, dungeonPoints: 4, verifiedClears: 3 })).toContain('12')
    expect(
      recentRunLines([
        { id: 'a', activityName: 'Vault of Glass', pointsAwarded: 8, completedAt: '2026-10-20T00:00:00.000Z' },
      ])
    ).toEqual([{ id: 'a', line: 'Vault of Glass · 8 pts' }])
  })
})