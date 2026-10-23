import { describe, expect, it } from 'vitest'
import { activityHistoryPath } from '@/lib/destiny/bungieClient'
import { aggregateLeaderboard } from '@/lib/destiny/leaderboards'
import {
  buildLookupRows,
  classifyStoredRun,
  collectRaidDungeonHistory,
  parseLookupQuery,
  runsToScore,
  shouldImportActivity,
  syncHistoryDepth,
} from '@/lib/destiny/runLookup'
import { isRunInActiveSeasonPacific, recentRunsFrom, withScoredRuns } from '@/lib/destiny/runDates'
import type { RunRecord, Season } from '@/lib/destiny/types'

const season = {
  id: 'season-1',
  name: 'Season of New Bonds',
  startDate: '2026-10-01T07:00:00.000Z',
  endDate: '2027-01-01T08:00:00.000Z',
  status: 'active',
  prizeRules: {
    raid: { first: '', second: '', thirdToFifth: '', participation: '' },
    dungeon: { first: '', second: '', thirdToFifth: '', participation: '' },
  },
} as Season

function raid(partial: Partial<RunRecord> & Pick<RunRecord, 'id' | 'completedAt'>): RunRecord {
  return {
    pgcrId: partial.pgcrId ?? partial.id,
    activityId: 1,
    activityName: 'Vault of Glass',
    type: 'raid',
    difficulty: 'normal',
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
    ownerUserId: 'ada',
    ...partial,
  }
}

describe('run history lookup', () => {
  it('asks Bungie for a specific activity history page', () => {
    expect(activityHistoryPath(3, '999', '111', 4, 25, 2)).toContain('mode=4')
    expect(activityHistoryPath(3, '999', '111', 4, 25, 2)).toContain('count=25')
    expect(activityHistoryPath(3, '999', '111', 4, 25, 2)).toContain('page=2')
  })

  it('pages through raid and dungeon history and stops on a short page', async () => {
    const calls: number[] = []
    const rows = await collectRaidDungeonHistory(
      {
        membershipType: 3,
        membershipId: '999',
        characterIds: ['111'],
        pages: 3,
        countPerPage: 2,
      },
      async (_type, _id, _character, mode, _count, _token, page = 0) => {
        calls.push(mode * 10 + page)
        if (page === 0) {
          return {
            activities: [
              { activityDetails: { instanceId: `${mode}-a`, referenceId: 1 }, period: '2026-10-02T00:00:00.000Z', values: { completionReason: { basic: { value: 0 } }, playerCount: { basic: { value: 6 } } } },
              { activityDetails: { instanceId: `${mode}-b`, referenceId: 1 }, period: '2026-09-01T00:00:00.000Z', values: { completionReason: { basic: { value: 0 } }, playerCount: { basic: { value: 3 } } } },
            ],
          }
        }
        return { activities: [{ activityDetails: { instanceId: `${mode}-c` }, period: '2026-08-01T00:00:00.000Z' }] }
      }
    )
    expect(calls).toEqual([40, 41, 820, 821])
    expect(rows.map((row) => row.instanceId)).toEqual(['4-a', '4-b', '4-c', '82-a', '82-b', '82-c'])
  })

  it('loads five history pages by default and eight when looking further back', () => {
    expect(syncHistoryDepth()).toEqual({ pages: 5, countPerPage: 25, includePrevious: false })
    expect(syncHistoryDepth({ includePrevious: true }).pages).toBe(8)
    expect(Array.from({ length: syncHistoryDepth().pages }, (_, page) => page)).toEqual([0, 1, 2, 3, 4])
    expect(shouldImportActivity('2026-06-01T00:00:00.000Z', false, 'raid')).toBe(true)
    expect(shouldImportActivity('2026-06-01T00:00:00.000Z', false, 'dungeon')).toBe(true)
    expect(shouldImportActivity('2026-06-01T00:00:00.000Z', false, 'pantheon')).toBe(false)
    expect(shouldImportActivity('2026-10-11T00:00:00.000Z', false, 'pantheon')).toBe(true)
  })

  it('walks raid and dungeon pages 0 through 4', async () => {
    const raidPages: number[] = []
    const dungeonPages: number[] = []
    const rows = await collectRaidDungeonHistory(
      {
        membershipType: 3,
        membershipId: '999',
        characterIds: ['111'],
        pages: 5,
        countPerPage: 1,
      },
      async (_type, _id, _character, mode, count, _token, page = 0) => {
        expect(count).toBe(1)
        if (mode === 4) raidPages.push(page)
        if (mode === 82) dungeonPages.push(page)
        return {
          activities: [
            {
              activityDetails: { instanceId: `${mode}-${page}` },
              period: '2026-01-15T00:00:00.000Z',
            },
          ],
        }
      }
    )
    expect(raidPages).toEqual([0, 1, 2, 3, 4])
    expect(dungeonPages).toEqual([0, 1, 2, 3, 4])
    expect(rows).toHaveLength(10)
    expect(isRunInActiveSeasonPacific('2026-01-15T00:00:00.000Z', new Date('2026-10-20T00:00:00.000Z'), true)).toBe(true)
    expect(recentRunsFrom([{ completedAt: '2026-01-15T00:00:00.000Z', scoredInActiveSeason: true }], 5)).toHaveLength(1)
  })

  it('labels scored, flagged, and new runs and picks the ones to add', () => {
    expect(classifyStoredRun(null, true)).toBe('unscored')
    expect(classifyStoredRun({ verificationStatus: 'verified', pointsAwarded: 10, checkpointLikely: false }, true)).toBe('scored')
    expect(classifyStoredRun({ verificationStatus: 'flagged', pointsAwarded: 0, checkpointLikely: true }, true)).toBe('flagged')
    const rows = buildLookupRows({
      activities: [
        { instanceId: '1', type: 'raid', period: '2026-05-01T00:00:00.000Z', durationSeconds: 2000, completed: true, referenceId: 9, playerCount: 6 },
        { instanceId: '2', type: 'dungeon', period: '2026-10-02T00:00:00.000Z', durationSeconds: 900, completed: true, referenceId: 8, playerCount: 3 },
      ],
      existing: [{ pgcrId: '2', verificationStatus: 'verified', pointsAwarded: 6, checkpointLikely: false, activityName: 'Pit of Heresy', bondPoints: 0 }],
      names: { '9': "Crota's End" },
      membershipId: '999',
      membershipType: 3,
      displayName: 'Ada-1#1234',
    })
    expect(rows[0]?.statusLabel).toBe('Not Scored Yet')
    expect(rows[0]?.activityName).toBe("Crota's End")
    expect(rows[1]?.statusLabel).toBe('Already Scored (+6 pts)')
    expect(runsToScore(rows).map((row) => row.instanceId)).toEqual(['1'])
    expect(parseLookupQuery('Ada-1#1234').kind).toBe('name')
    expect(parseLookupQuery('123456789').kind).toBe('pgcr')
  })

  it('counts an older clear on the season board after it is added to scoring', () => {
    const older = raid({
      id: 'old',
      completedAt: '2026-06-15T00:00:00.000Z',
      pointsAwarded: 25,
      bondPoints: 15,
      scoredInActiveSeason: true,
    })
    const ignored = raid({ id: 'ignored', completedAt: '2026-06-15T00:00:00.000Z', pointsAwarded: 10 })
    const users = new Map([['ada', { userId: 'ada', bungieMembershipId: '999', bungieDisplayName: 'Ada', platform: 'steam' as const }]])
    const seasonRows = aggregateLeaderboard([older, ignored], users, 'raid', 'season', season)
    expect(seasonRows.map((row) => row.points)).toEqual([25])
    const weekly = aggregateLeaderboard([older], users, 'raid', 'weekly', season)
    expect(weekly).toEqual([])
    const filter = withScoredRuns({ ownerUserId: 'ada' })
    expect(JSON.stringify(filter)).toContain('scoredInActiveSeason')
    const participant = withScoredRuns({ $or: [{ ownerUserId: 'ada' }] })
    expect(participant.$and).toBeTruthy()
  })
})
