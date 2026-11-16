import { describe, expect, it } from 'vitest'
import {
  NEST_SEASON_CATALOG,
  PRESEASON_NAME,
  SEASON_LENGTH_MONTHS,
  SEASON_TIME_ZONE,
  resolveActiveSeasonByDate,
  DEFAULT_SEASON_PRIZE_RULES,
  prizeForCountry,
  seasonDefinitionToSeason,
  zonedWallTimeUtc,
} from './seasonCatalog'
import { seasonBannerLabel } from './seasonConfig'
import { seasonsAwaitingFreeze } from './seasonRollover'
import { aggregateLeaderboard } from './leaderboards'
import { votesInsideWindow } from './mvpVoting'
import type { RunRecord, RunTeamMember, Season } from './types'

function wall(iso: string, timeZone = SEASON_TIME_ZONE): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(iso))
}

function member(id: string, displayName: string): RunTeamMember {
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
    completed: true,
  }
}

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
    teamMembers: [member('999', 'Ada#1234')],
    clanMemberCount: 0,
    randoCount: 0,
    isFullClanTeam: false,
    suspiciousScore: 0,
    verificationStatus: 'verified',
    pointsAwarded: 3,
    ownerUserId: 'ada',
    ownerMembershipId: '999',
    ownerDisplayName: 'Ada#1234',
    ...partial,
  }
}

describe('preseason and Season 1 restart', () => {
  const preseason = NEST_SEASON_CATALOG[0]!
  const season1 = NEST_SEASON_CATALOG[1]!
  const season2 = NEST_SEASON_CATALOG[2]!
  const season3 = NEST_SEASON_CATALOG[3]!
  const season4 = NEST_SEASON_CATALOG[4]!

  it('keeps Oct 1–Dec 31 2026 as the preseason and restarts Season 1 on Jan 1 2027 Vancouver', () => {
    expect(SEASON_TIME_ZONE).toBe('America/Vancouver')
    expect(SEASON_LENGTH_MONTHS).toBe(3)
    expect(preseason.kind).toBe('preseason')
    expect(preseason.seasonNumber).toBe(0)
    expect(preseason.name).toBe(PRESEASON_NAME)
    expect(preseason.name).toBe('Preseason (Oct-Dec 2026)')
    expect(wall(preseason.startDate)).toBe('10/01/2026, 00:00:00')
    expect(wall(preseason.endDate)).toBe('12/31/2026, 23:59:59')
    expect(season1.kind).toBe('season')
    expect(season1.seasonNumber).toBe(1)
    expect(season1.name).toBe('Season 1')
    expect(wall(season1.startDate)).toBe('01/01/2027, 00:00:00')
    expect(wall(season1.endDate)).toBe('03/31/2027, 23:59:59')
    expect(wall(season2.startDate)).toBe('04/01/2027, 00:00:00')
    expect(season2.seasonNumber).toBe(2)
    expect(wall(season3.startDate)).toBe('07/01/2027, 00:00:00')
    expect(wall(season4.startDate)).toBe('10/01/2027, 00:00:00')
  })

  it('uses America/Vancouver even when Los Angeles is still on the previous evening', () => {
    expect(season1.startDate).toBe(zonedWallTimeUtc(2027, 1, 1).toISOString())
    expect(wall(season1.startDate, 'America/Los_Angeles')).toBe('12/31/2026, 23:00:00')
    expect(preseason.startDate).toBe('2026-10-01T07:00:00.000Z')
    expect(season1.startDate).toBe('2027-01-01T07:00:00.000Z')
    expect(preseason.endDate).toBe('2027-01-01T06:59:59.999Z')
  })

  it('keeps windows contiguous and three months long', () => {
    for (let i = 1; i < NEST_SEASON_CATALOG.length; i += 1) {
      expect(Date.parse(NEST_SEASON_CATALOG[i]!.startDate) - Date.parse(NEST_SEASON_CATALOG[i - 1]!.endDate)).toBe(1)
    }
    const start = Date.parse(season1.startDate)
    const next = Date.parse(season2.startDate)
    expect(next).toBeGreaterThan(start)
  })

  it('resolves the preseason before Jan 1 and Season 1 after it', () => {
    const duringPreseason = resolveActiveSeasonByDate(new Date('2026-10-13T18:00:00Z'))
    expect(duringPreseason.kind).toBe('preseason')
    expect(duringPreseason.name).toBe('Preseason (Oct-Dec 2026)')
    expect(duringPreseason.seasonNumber).toBe(0)

    const lastSecond = zonedWallTimeUtc(2026, 12, 31, 23, 59, 59)
    expect(resolveActiveSeasonByDate(lastSecond).kind).toBe('preseason')
    expect(resolveActiveSeasonByDate(new Date(Date.parse(preseason.endDate))).name).toBe(PRESEASON_NAME)

    const season1Open = new Date(season1.startDate)
    expect(resolveActiveSeasonByDate(season1Open).seasonNumber).toBe(1)
    expect(resolveActiveSeasonByDate(season1Open).name).toBe('Season 1')
    expect(resolveActiveSeasonByDate(new Date('2027-02-10T18:00:00Z')).seasonNumber).toBe(1)
    expect(resolveActiveSeasonByDate(new Date(season2.startDate)).seasonNumber).toBe(2)
    expect(resolveActiveSeasonByDate(new Date('2026-09-30T18:00:00Z')).status).toBe('upcoming')
  })

  it('labels Season 1 as starting Jan 1 until that midnight, then as Season 1', () => {
    expect(seasonBannerLabel(new Date('2026-11-16T18:00:00Z'))).toBe('Season 1 starts Jan 1')
    expect(seasonBannerLabel(new Date(season1.startDate))).toBe('Season 1')
    expect(seasonBannerLabel(new Date('2027-02-10T18:00:00Z'))).toBe('Season 1')
    expect(seasonBannerLabel(new Date(season2.startDate))).toBe('Season 2')
  })

  it('scores a Dec 31 clear on the preseason only, and a Jan 1 clear on Season 1 only', () => {
    const pre = seasonDefinitionToSeason(preseason, 'active')
    const live = seasonDefinitionToSeason(season1, 'active')
    const dec31 = raid({ id: 'dec', completedAt: zonedWallTimeUtc(2026, 12, 31, 23, 59, 59).toISOString() })
    const jan1 = raid({
      id: 'jan',
      pgcrId: 'jan',
      completedAt: season1.startDate,
      teamMembers: [member('888', 'Bee#0002')],
      ownerUserId: 'bee',
      ownerMembershipId: '888',
      ownerDisplayName: 'Bee#0002',
    })
    const users = new Map([
      ['ada', { userId: 'ada', bungieMembershipId: '999', bungieDisplayName: 'Ada#1234', platform: 'steam' as const }],
      ['bee', { userId: 'bee', bungieMembershipId: '888', bungieDisplayName: 'Bee#0002', platform: 'steam' as const }],
    ])
    expect(aggregateLeaderboard([dec31, jan1], users, 'raid', 'season', pre).map((row) => row.bungieDisplayName)).toEqual([
      'Ada#1234',
    ])
    expect(aggregateLeaderboard([dec31, jan1], users, 'raid', 'season', live).map((row) => row.bungieDisplayName)).toEqual([
      'Bee#0002',
    ])
    expect(aggregateLeaderboard([dec31], users, 'raid', 'season', live)).toEqual([])
  })

  it('dedupes two memberships that share one Bungie name and ignores MVP votes from the other window', () => {
    const live = seasonDefinitionToSeason(season1, 'active') as Season
    const first = raid({
      id: 'a',
      completedAt: '2027-01-15T18:00:00.000Z',
      teamMembers: [member('111', 'Nova#1111')],
      ownerUserId: 'one',
      ownerMembershipId: '111',
      ownerDisplayName: 'Nova#1111',
    })
    const second = raid({
      id: 'b',
      pgcrId: 'b',
      completedAt: '2027-02-15T18:00:00.000Z',
      teamMembers: [member('222', 'Nova#1111')],
      ownerUserId: 'two',
      ownerMembershipId: '222',
      ownerDisplayName: 'Nova#1111',
    })
    const rows = aggregateLeaderboard([first, second], new Map(), 'raid', 'season', live)
    expect(rows).toHaveLength(1)
    expect(rows[0]?.bungieDisplayName).toBe('Nova#1111')
    expect(rows[0]?.points).toBe(6)

    const votes = votesInsideWindow(
      [
        { createdAt: '2026-12-15T18:00:00.000Z', selectedMembershipId: '111' },
        { createdAt: '2027-01-20T18:00:00.000Z', selectedMembershipId: '111' },
      ],
      live.startDate,
      live.endDate
    )
    expect(votes).toHaveLength(1)
    expect(votes[0]?.createdAt).toBe('2027-01-20T18:00:00.000Z')
  })

  it('archives an ended preseason without listing any run deletion', () => {
    const before = seasonsAwaitingFreeze(new Date('2026-11-16T18:00:00Z'), [])
    expect(before).toEqual([])
    const after = seasonsAwaitingFreeze(new Date(season1.startDate), [])
    expect(after.map((def) => def.name)).toEqual(['Preseason (Oct-Dec 2026)'])
    const frozen = seasonsAwaitingFreeze(new Date(season1.startDate), [
      { id: preseason.id, standingsFrozenAt: season1.startDate },
    ])
    expect(frozen).toEqual([])
  })

  it('prize is a 3D print (US/CA) or $50 CAD Steam card (UK); old $250 pool gone', () => {
    const txt = JSON.stringify(DEFAULT_SEASON_PRIZE_RULES).toLowerCase()
    expect(txt).toContain('3d print')
    expect(txt).not.toMatch(/\$250|platform card|\$25 /)
    expect(prizeForCountry('US')).toContain('3D print')
    expect(prizeForCountry('ca')).toContain('3D print')
    expect(prizeForCountry('UK')).toBe('$50 CAD Steam gift card')
    expect(prizeForCountry('GB')).toBe('$50 CAD Steam gift card')
    expect(prizeForCountry('DE')).toBeNull()
  })
})
