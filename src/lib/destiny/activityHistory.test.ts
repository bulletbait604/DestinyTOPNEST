import { describe, expect, it } from 'vitest'
import { trimPgcr } from '@/lib/destiny/activityHistoryPgcr'
import {
  ACTIVITY_HISTORY_PAGE_SIZE,
  addRunToBucket,
  advanceCharacterSync,
  classifyActivityModes,
  consumeHistoryPage,
  emptyStatBucket,
  escapeRegex,
  isSyncComplete,
  kdRatio,
  mergeCharacterCursors,
  newCharacterCursor,
  nextSyncCharacter,
  parseHistoricalCharacters,
  parseHistoryActivity,
  prepareSyncPass,
  resolveResumePage,
  syncProgressPercent,
  takeNewActivities,
} from '@/lib/destiny/activityHistoryModel'
import { isBungieThrottleCode, patientBackoffMs } from '@/lib/destiny/bungieRateLimit'
import type { ParsedHistoryActivity } from '@/lib/destiny/activityHistoryModel'

function run(instanceId: string, overrides: Partial<ParsedHistoryActivity> = {}): ParsedHistoryActivity {
  return {
    instanceId,
    period: '2024-06-01T00:00:00Z',
    referenceId: 910380154,
    directorActivityHash: 910380154,
    mode: 4,
    modes: [4, 7],
    activityType: 'raid',
    kills: 40,
    deaths: 2,
    assists: 5,
    score: 0,
    completed: true,
    completionReason: 0,
    timePlayedSeconds: 900,
    durationSeconds: 1200,
    isPrivate: false,
    ...overrides,
  }
}

function rowsFor(prefix: string, count: number): ParsedHistoryActivity[] {
  return Array.from({ length: count }, (_, index) => run(`${prefix}-${index}`))
}

describe('activity history classification', () => {
  it('maps Bungie modes and lets raid beat a mixed mode list', () => {
    expect(classifyActivityModes(4, [4])).toBe('raid')
    expect(classifyActivityModes(82, [82])).toBe('dungeon')
    expect(classifyActivityModes(46, [46, 3])).toBe('nightfall')
    expect(classifyActivityModes(3, [3, 18])).toBe('strike')
    expect(classifyActivityModes(63, [63])).toBe('gambit')
    expect(classifyActivityModes(5, [10])).toBe('crucible')
    expect(classifyActivityModes(85, [])).toBe('dares')
    expect(classifyActivityModes(87, [])).toBe('lostSector')
    expect(classifyActivityModes(2, [])).toBe('story')
    expect(classifyActivityModes(6, [])).toBe('patrol')
    expect(classifyActivityModes(0, [4, 5])).toBe('raid')
    expect(classifyActivityModes(0, [])).toBe('other')
  })

  it('parses a history row and skips rows without an instance', () => {
    const parsed = parseHistoryActivity({
      period: '2024-06-01T00:00:00Z',
      activityDetails: {
        instanceId: '999',
        referenceId: 82,
        directorActivityHash: 82,
        mode: 82,
        modes: [82],
        isPrivate: true,
        completionReason: 0,
      },
      values: {
        kills: { basic: { value: 10 } },
        deaths: { basic: { value: 0 } },
        timePlayedSeconds: { basic: { value: 400 } },
        activityDurationSeconds: { basic: { value: 500 } },
      },
    })
    expect(parsed?.instanceId).toBe('999')
    expect(parsed?.activityType).toBe('dungeon')
    expect(parsed?.completed).toBe(true)
    expect(parsed?.isPrivate).toBe(true)
    expect(parsed?.durationSeconds).toBe(500)
    expect(parseHistoryActivity({ activityDetails: {} })).toBeNull()
  })
})

describe('activity history stats', () => {
  it('rolls kills, clears, and the fastest completed run', () => {
    const bucket = emptyStatBucket()
    addRunToBucket(bucket, run('a', { kills: 10, deaths: 2, durationSeconds: 800, timePlayedSeconds: 700 }))
    addRunToBucket(
      bucket,
      run('b', { completed: false, kills: 4, deaths: 4, durationSeconds: 100, timePlayedSeconds: 90 })
    )
    addRunToBucket(bucket, run('c', { kills: 6, deaths: 0, durationSeconds: 0, timePlayedSeconds: 50 }))
    expect(bucket.runs).toBe(3)
    expect(bucket.clears).toBe(2)
    expect(bucket.kills).toBe(20)
    expect(bucket.deaths).toBe(6)
    expect(bucket.kd).toBeCloseTo(kdRatio(20, 6))
    expect(bucket.timePlayedSeconds).toBe(840)
    expect(bucket.fastestClearSeconds).toBe(800)
    expect(kdRatio(8, 0)).toBe(8)
  })
})

describe('activity history paging', () => {
  it('resumes only when the newest instance is still the anchor', () => {
    expect(resolveResumePage({ resumePage: 4, anchorInstanceId: 'a', headInstanceId: 'a' })).toBe(4)
    expect(resolveResumePage({ resumePage: 4, anchorInstanceId: 'a', headInstanceId: 'b' })).toBe(0)
    expect(resolveResumePage({ resumePage: 0, anchorInstanceId: 'a', headInstanceId: 'b' })).toBe(0)
  })

  it('keeps only runs newer than the saved head', () => {
    const rows = [run('new'), run('saved'), run('older')]
    expect(takeNewActivities(rows, 'saved').fresh.map((row) => row.instanceId)).toEqual(['new'])
    expect(takeNewActivities(rows, 'saved').reachedKnown).toBe(true)
    expect(takeNewActivities(rows).reachedKnown).toBe(false)
  })

  it('marks a short backfill page as the end of history', () => {
    const cursor = newCharacterCursor({
      membershipType: 3,
      membershipId: 'm',
      characterId: 'c',
      classLabel: 'Hunter',
      platformLabel: 'steam',
      deleted: false,
    })
    const consumed = consumeHistoryPage(cursor, 0, [run('only')], 'backfill')
    expect(consumed.done).toBe(true)
    expect(consumed.cursor.backfillComplete).toBe(true)
    expect(consumed.cursor.newestInstanceId).toBe('only')
    expect(consumed.upserts).toHaveLength(1)
  })

  it('walks full pages until a short page and remembers the newest run', async () => {
    const cursor = newCharacterCursor({
      membershipType: 3,
      membershipId: 'm',
      characterId: 'c',
      classLabel: 'Hunter',
      platformLabel: 'steam',
      deleted: false,
    })
    const fetched: number[] = []
    const result = await advanceCharacterSync(
      cursor,
      async (page) => {
        fetched.push(page)
        if (page < 2) return rowsFor(`${page}`, ACTIVITY_HISTORY_PAGE_SIZE)
        return [run('tail')]
      },
      8
    )
    expect(fetched).toEqual([0, 1, 2])
    expect(result.cursor.backfillComplete).toBe(true)
    expect(result.cursor.newestInstanceId).toBe('0-0')
    expect(result.upserts).toHaveLength(ACTIVITY_HISTORY_PAGE_SIZE * 2 + 1)
  })

  it('continues a backfill when the anchor still matches', async () => {
    const cursor = {
      ...newCharacterCursor({
        membershipType: 3,
        membershipId: 'm',
        characterId: 'c',
        classLabel: 'Titan',
        platformLabel: 'steam',
        deleted: false,
      }),
      resumePage: 2,
      anchorInstanceId: '0-0',
      newestInstanceId: '0-0',
    }
    const fetched: number[] = []
    const result = await advanceCharacterSync(
      cursor,
      async (page) => {
        fetched.push(page)
        if (page === 0) return rowsFor('0', ACTIVITY_HISTORY_PAGE_SIZE)
        return [run('tail')]
      },
      4
    )
    expect(fetched).toEqual([0, 2])
    expect(result.upserts.map((row) => row.instanceId)).toEqual(['tail'])
    expect(result.cursor.backfillComplete).toBe(true)
  })

  it('restarts a shifted backfill at the new head instead of skipping', async () => {
    const cursor = {
      ...newCharacterCursor({
        membershipType: 3,
        membershipId: 'm',
        characterId: 'c',
        classLabel: 'Warlock',
        platformLabel: 'steam',
        deleted: false,
      }),
      resumePage: 6,
      anchorInstanceId: 'old-head',
    }
    const result = await advanceCharacterSync(
      cursor,
      async (page) => {
        if (page === 0) return rowsFor('new', ACTIVITY_HISTORY_PAGE_SIZE)
        return []
      },
      1
    )
    expect(result.pagesUsed).toBe(1)
    expect(result.cursor.resumePage).toBe(1)
    expect(result.cursor.anchorInstanceId).toBe('new-0')
    expect(result.cursor.backfillComplete).toBe(false)
    expect(result.upserts).toHaveLength(ACTIVITY_HISTORY_PAGE_SIZE)
  })

  it('stops an incremental sync at the saved newest run', async () => {
    const cursor = {
      ...newCharacterCursor({
        membershipType: 3,
        membershipId: 'm',
        characterId: 'c',
        classLabel: 'Hunter',
        platformLabel: 'steam',
        deleted: false,
      }),
      backfillComplete: true,
      incrementalDone: false,
      newestInstanceId: 'saved',
      anchorInstanceId: 'saved',
    }
    const result = await advanceCharacterSync(
      cursor,
      async () => [run('fresh-2'), run('fresh-1'), run('saved'), run('older')],
      3
    )
    expect(result.upserts.map((row) => row.instanceId)).toEqual(['fresh-2', 'fresh-1'])
    expect(result.cursor.incrementalDone).toBe(true)
    expect(result.cursor.newestInstanceId).toBe('fresh-2')
    expect(result.cursor.anchorInstanceId).toBe('fresh-2')
  })

  it('picks the unfinished character before an incremental one', () => {
    const open = newCharacterCursor({
      membershipType: 3,
      membershipId: 'm',
      characterId: 'open',
      classLabel: 'Hunter',
      platformLabel: 'steam',
      deleted: false,
    })
    const done = {
      ...newCharacterCursor({
        membershipType: 3,
        membershipId: 'm',
        characterId: 'done',
        classLabel: 'Titan',
        platformLabel: 'steam',
        deleted: false,
      }),
      backfillComplete: true,
      incrementalDone: false,
    }
    expect(nextSyncCharacter([done, open])?.cursor.characterId).toBe('open')
    expect(isSyncComplete([])).toBe(false)
    expect(isSyncComplete([{ ...done, incrementalDone: true }])).toBe(true)
  })

  it('keeps the backfill cursor when a later visit looks for new runs', () => {
    const cursor = {
      ...newCharacterCursor({
        membershipType: 3,
        membershipId: 'm',
        characterId: 'c',
        classLabel: 'Hunter',
        platformLabel: 'steam',
        deleted: false,
      }),
      resumePage: 9,
      anchorInstanceId: 'head',
    }
    const [prepared] = prepareSyncPass([cursor])
    expect(prepared.resumePage).toBe(9)
    expect(prepared.backfillComplete).toBe(false)

    const finished = { ...cursor, backfillComplete: true, incrementalDone: true, incrementalPage: 3 }
    const [reset] = prepareSyncPass([finished])
    expect(reset.incrementalDone).toBe(false)
    expect(reset.incrementalPage).toBe(0)
    expect(reset.resumePage).toBe(9)
  })

  it('merges a rediscovered character without dropping its page cursor', () => {
    const saved = {
      ...newCharacterCursor({
        membershipType: 3,
        membershipId: 'm',
        characterId: 'c',
        classLabel: 'Hunter',
        platformLabel: 'steam',
        deleted: false,
      }),
      resumePage: 4,
      backfillComplete: false,
      anchorInstanceId: 'head',
    }
    const rediscovered = newCharacterCursor({
      membershipType: 3,
      membershipId: 'm',
      characterId: 'c',
      classLabel: 'Hunter',
      platformLabel: 'steam',
      light: 2000,
      deleted: false,
    })
    const [merged] = mergeCharacterCursors([saved], [rediscovered])
    expect(merged.resumePage).toBe(4)
    expect(merged.anchorInstanceId).toBe('head')
    expect(merged.light).toBe(2000)
  })

  it('caps in-progress percent below 100', () => {
    const cursor = newCharacterCursor({
      membershipType: 3,
      membershipId: 'm',
      characterId: 'c',
      classLabel: 'Hunter',
      platformLabel: 'steam',
      deleted: false,
      historical: { activitiesEntered: 100, kills: 1, deaths: 1, secondsPlayed: 10 },
    })
    expect(syncProgressPercent([cursor], 40)).toBe(40)
    expect(syncProgressPercent([{ ...cursor, backfillComplete: true, incrementalDone: true }], 100)).toBe(100)
    expect(syncProgressPercent([cursor], 500)).toBeLessThan(100)
  })
})

describe('bungie throttle helpers', () => {
  it('backs off and recognizes throttle codes', () => {
    expect(isBungieThrottleCode(31)).toBe(true)
    expect(isBungieThrottleCode(1)).toBe(false)
    expect(patientBackoffMs(null, 0)).toBe(500)
    expect(patientBackoffMs(null, 2)).toBe(2000)
    expect(patientBackoffMs('30', 0)).toBe(8000)
    expect(escapeRegex('a+b')).toBe('a\\+b')
  })
})

describe('historical stats and pgcr trim', () => {
  it('reads deleted-character totals from account historical stats', () => {
    const rows = parseHistoricalCharacters({
      characters: [
        {
          characterId: '42',
          deleted: true,
          results: {
            allPvE: { allTime: { activitiesEntered: { basic: { value: 12 } }, kills: { basic: { value: 30 } } } },
            allPvP: { allTime: { activitiesEntered: { basic: { value: 4 } }, deaths: { basic: { value: 9 } } } },
          },
        },
      ],
    })
    expect(rows).toEqual([
      { characterId: '42', deleted: true, activitiesEntered: 16, kills: 30, deaths: 9, secondsPlayed: 0 },
    ])
  })

  it('keeps a compact post-game report', () => {
    const report = trimPgcr(
      '55',
      'user',
      {
        period: '2024-01-01T00:00:00Z',
        activityWasStartedFromBeginning: false,
        entries: [
          {
            player: {
              destinyUserInfo: { membershipId: '7', displayName: 'Ada' },
              characterClass: 'Hunter',
              lightLevel: 2000,
            },
            values: {
              kills: { basic: { value: 15 } },
              deaths: { basic: { value: 1 } },
              assists: { basic: { value: 3 } },
              score: { basic: { value: 100 } },
              completed: { basic: { value: 1 } },
            },
          },
        ],
      },
      'Deep Stone Crypt'
    )
    expect(report.entries[0]).toMatchObject({ displayName: 'Ada', kills: 15, completed: true })
    expect(report.startedFromBeginning).toBe(false)
    expect(report.activityName).toBe('Deep Stone Crypt')
  })
})
