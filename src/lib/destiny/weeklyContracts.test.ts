import { afterEach, describe, expect, it } from 'vitest'
import type { FireteamViewer } from '@/lib/destiny/passport'
import type { RunRecord, RunTeamMember, WeeklyContractDefinition } from '@/lib/destiny/types'
import {
  DEFAULT_WEEKLY_CONTRACTS,
  resolveSeasonTier,
  resolveWeeklyContractCatalog,
} from '@/lib/destiny/weeklyContractCatalog'
import { evaluateWeeklyContracts } from '@/lib/destiny/weeklyContracts'
import { getWeeklyResetState } from '@/lib/destiny/weeklyRotation'

const viewer: FireteamViewer = {
  userId: 'user-me',
  membershipId: 'me',
  clanId: 'clan-a',
  displayName: 'Me',
}

const NOW = new Date('2026-10-14T18:00:00.000Z')
const SEASON = { startDate: '2026-10-01T17:00:00.000Z', endDate: '2026-10-31T23:59:59.999Z' }
const featured = () => ['Duality', 'Spire of the Watcher']

function member(id: string, extra: Partial<RunTeamMember> = {}): RunTeamMember {
  return {
    membershipId: id,
    displayName: extra.displayName ?? id,
    platform: 'steam',
    characterClass: 'hunter',
    kills: 12,
    deaths: 2,
    assists: 4,
    score: 80,
    powerLevel: 2000,
    ...extra,
  }
}

function run(partial: Partial<RunRecord> & Pick<RunRecord, 'id' | 'completedAt'>): RunRecord {
  return {
    pgcrId: partial.id,
    activityId: 42,
    activityName: 'Duality',
    type: 'dungeon',
    difficulty: 'normal',
    durationSeconds: 900,
    completed: true,
    checkpointLikely: false,
    teamMembers: [member('me', { displayName: 'Me', clanId: 'clan-a' })],
    clanMemberCount: 1,
    randoCount: 0,
    isFullClanTeam: false,
    suspiciousScore: 0,
    verificationStatus: 'verified',
    pointsAwarded: 7,
    ownerUserId: 'user-me',
    ...partial,
  }
}

function contract(id: string, board = evaluateWeeklyContracts({
  runs: [],
  viewer,
  now: NOW,
  season: SEASON,
  featuredDungeonsAt: featured,
})) {
  return board.contracts.find((entry) => entry.id === id)
}

/** A clear the viewer did not play, so those guardians are not new to the activity. */
function priorClear(id: string, activityName: string, activityId: number, membershipIds: string[], completedAt: string): RunRecord {
  return run({
    id,
    pgcrId: id,
    completedAt,
    activityName,
    activityId,
    type: activityName === 'Duality' || activityName === 'Pit of Heresy' ? 'dungeon' : 'raid',
    ownerUserId: 'someone-else',
    teamMembers: [member('sherpa'), ...membershipIds.map((membershipId) => member(membershipId))],
  })
}

describe('weekly contracts', () => {
  const originalCatalog = process.env.FIRETEAM_HQ_WEEKLY_CONTRACTS_JSON

  afterEach(() => {
    if (originalCatalog === undefined) delete process.env.FIRETEAM_HQ_WEEKLY_CONTRACTS_JSON
    else process.env.FIRETEAM_HQ_WEEKLY_CONTRACTS_JSON = originalCatalog
  })

  it('uses the Tuesday reset that contains the run', () => {
    const week = getWeeklyResetState(NOW)
    expect(week.weekStart).toBe('2026-10-13')
    expect(getWeeklyResetState(new Date('2026-10-13T16:30:00.000Z')).weekStart).toBe('2026-10-06')
  })

  it('completes the featured dungeon contract with two new Guardians', () => {
    const clear = run({
      id: 'dung',
      completedAt: '2026-10-14T12:00:00.000Z',
      teamMembers: [member('me', { clanId: 'clan-a' }), member('new-1'), member('new-2')],
    })
    const board = evaluateWeeklyContracts({
      runs: [priorClear('prior-duality', 'Duality', 42, ['new-1', 'new-2'], '2026-10-02T18:00:00.000Z'), clear],
      viewer,
      now: NOW,
      season: SEASON,
      featuredDungeonsAt: featured,
    })

    expect(contract('featured-dungeon-new-guardians', board)?.completed).toBe(true)
    expect(contract('featured-dungeon-new-guardians', board)?.progressLabel).toContain('Duality')
    expect(board.weekTierPoints).toBe(15)
    expect(board.seasonTierPoints).toBe(15)
    expect(board.seasonTier.tier).toBe(2)
    expect(board.seasonTier.title).toBe('Contract Runner')
    expect(clear.pointsAwarded).toBe(7)
  })

  it('tracks partial new-Guardian progress and ignores a non-featured dungeon', () => {
    const partial = run({
      id: 'one-new',
      completedAt: '2026-10-14T12:00:00.000Z',
      teamMembers: [member('me'), member('only-one')],
    })
    const offFeatured = run({
      id: 'off',
      pgcrId: 'off',
      completedAt: '2026-10-14T15:00:00.000Z',
      activityName: 'Pit of Heresy',
      activityId: 88,
      teamMembers: [member('me'), member('a'), member('b')],
    })

    const one = evaluateWeeklyContracts({
      runs: [partial],
      viewer,
      now: NOW,
      season: SEASON,
      featuredDungeonsAt: featured,
    })
    expect(contract('featured-dungeon-new-guardians', one)?.completed).toBe(false)
    expect(contract('featured-dungeon-new-guardians', one)?.progressLabel).toContain('1/2')

    const other = evaluateWeeklyContracts({
      runs: [priorClear('prior-pit', 'Pit of Heresy', 88, ['a', 'b'], '2026-10-02T18:00:00.000Z'), offFeatured],
      viewer,
      now: NOW,
      season: SEASON,
      featuredDungeonsAt: featured,
    })
    expect(contract('featured-dungeon-new-guardians', other)?.completed).toBe(false)
    expect(other.weekTierPoints).toBe(0)
  })

  it('completes a raid with a clanmate and a non-clanmate once per week', () => {
    const raid = (id: string, completedAt: string): RunRecord =>
      run({
        id,
        pgcrId: id,
        completedAt,
        type: 'raid',
        activityName: "King's Fall",
        activityId: 9,
        clanMemberCount: 2,
        randoCount: 1,
        teamMembers: [
          member('me', { clanId: 'clan-a' }),
          member('clanmate', { clanId: 'clan-a' }),
          member('outsider', { clanId: 'clan-z' }),
        ],
      })

    const sameWeek = evaluateWeeklyContracts({
      runs: [
        priorClear('prior-kings', "King's Fall", 9, ['clanmate', 'outsider'], '2026-10-02T18:00:00.000Z'),
        raid('raid-1', '2026-10-14T12:00:00.000Z'),
        raid('raid-2', '2026-10-14T20:00:00.000Z'),
      ],
      viewer,
      now: NOW,
      season: SEASON,
      featuredDungeonsAt: featured,
    })
    expect(contract('raid-clan-and-outsider', sameWeek)?.completed).toBe(true)
    expect(sameWeek.weekTierPoints).toBe(15)
    expect(sameWeek.seasonTierPoints).toBe(15)

    const fullClan = evaluateWeeklyContracts({
      runs: [
        run({
          id: 'full-clan',
          completedAt: '2026-10-14T12:00:00.000Z',
          type: 'raid',
          activityName: 'Last Wish',
          teamMembers: [member('me', { clanId: 'clan-a' }), member('a', { clanId: 'clan-a' }), member('b', { clanId: 'clan-a' })],
        }),
      ],
      viewer,
      now: NOW,
      season: SEASON,
      featuredDungeonsAt: featured,
    })
    expect(contract('raid-clan-and-outsider', fullClan)?.completed).toBe(false)

    const counted = evaluateWeeklyContracts({
      runs: [
        run({
          id: 'counts',
          completedAt: '2026-10-14T12:00:00.000Z',
          type: 'raid',
          activityName: 'Last Wish',
          clanMemberCount: 2,
          randoCount: 1,
          teamMembers: [member('me'), member('ally'), member('rando')],
        }),
      ],
      viewer,
      now: NOW,
      season: SEASON,
      featuredDungeonsAt: featured,
    })
    expect(contract('raid-clan-and-outsider', counted)?.completed).toBe(true)
  })

  it('completes help-a-first-timer only when the learner has no earlier clear of that activity', () => {
    const earlier = run({
      id: 'old-vow',
      completedAt: '2026-10-08T18:00:00.000Z',
      type: 'raid',
      activityName: 'Vow of the Disciple',
      activityId: 55,
      ownerUserId: 'someone-else',
      teamMembers: [member('veteran'), member('learner', { displayName: 'Learner' })],
    })
    const teachingKnown = run({
      id: 'teach-known',
      pgcrId: 'teach-known',
      completedAt: '2026-10-14T12:00:00.000Z',
      type: 'raid',
      activityName: 'Vow of the Disciple',
      activityId: 55,
      teamMembers: [member('me'), member('learner', { displayName: 'Learner' })],
    })
    const teachingNewActivity = run({
      id: 'teach-new',
      pgcrId: 'teach-new',
      completedAt: '2026-10-14T16:00:00.000Z',
      type: 'raid',
      activityName: "King's Fall",
      activityId: 56,
      teamMembers: [member('me'), member('learner', { displayName: 'Learner' })],
    })

    const blocked = evaluateWeeklyContracts({
      runs: [earlier, teachingKnown],
      viewer,
      now: NOW,
      season: SEASON,
      featuredDungeonsAt: featured,
    })
    expect(contract('help-first-timer', blocked)?.completed).toBe(false)

    const helped = evaluateWeeklyContracts({
      runs: [earlier, teachingNewActivity],
      viewer,
      now: NOW,
      season: SEASON,
      featuredDungeonsAt: featured,
    })
    const help = contract('help-first-timer', helped)
    expect(help?.completed).toBe(true)
    expect(help?.progressLabel).toContain('Learner')
    expect(help?.progressLabel).toContain("King's Fall")
    expect(helped.seasonTierPoints).toBe(20)
  })

  it('does not treat the viewer as the learner and ignores checkpoint runs', () => {
    const solo = run({
      id: 'solo',
      completedAt: '2026-10-14T12:00:00.000Z',
      type: 'raid',
      activityName: 'Vault of Glass',
      activityId: 3,
      teamMembers: [member('me')],
    })
    const checkpoint = run({
      id: 'cp',
      pgcrId: 'cp',
      completedAt: '2026-10-14T13:00:00.000Z',
      type: 'raid',
      activityName: 'Vault of Glass',
      activityId: 3,
      checkpointLikely: true,
      teamMembers: [member('me'), member('fresh')],
    })
    const board = evaluateWeeklyContracts({
      runs: [solo, checkpoint],
      viewer,
      now: NOW,
      season: SEASON,
      featuredDungeonsAt: featured,
    })
    expect(contract('help-first-timer', board)?.completed).toBe(false)
    expect(board.seasonTierPoints).toBe(0)
  })

  it('awards the same contract again next week and keeps the prior week inside the season total', () => {
    const raid = (id: string, completedAt: string): RunRecord =>
      run({
        id,
        pgcrId: id,
        completedAt,
        type: 'raid',
        activityName: 'Deep Stone Crypt',
        activityId: 11,
        clanMemberCount: 2,
        randoCount: 1,
        teamMembers: [
          member('me', { clanId: 'clan-a' }),
          member('clanmate', { clanId: 'clan-a' }),
          member('outsider', { clanId: 'clan-z' }),
        ],
      })

    const board = evaluateWeeklyContracts({
      runs: [
        priorClear('prior-dsc', 'Deep Stone Crypt', 11, ['clanmate', 'outsider'], '2026-10-02T18:00:00.000Z'),
        raid('last-week', '2026-10-10T18:00:00.000Z'),
        raid('this-week', '2026-10-14T18:00:00.000Z'),
      ],
      viewer,
      now: NOW,
      season: SEASON,
      featuredDungeonsAt: featured,
    })

    expect(getWeeklyResetState(new Date('2026-10-10T18:00:00.000Z')).weekStart).toBe('2026-10-06')
    expect(contract('raid-clan-and-outsider', board)?.completed).toBe(true)
    expect(board.weekTierPoints).toBe(15)
    expect(board.seasonTierPoints).toBe(30)
    expect(board.seasonTier.pointsToNext).toBe(10)
  })

  it('leaves a pre-reset clear on the previous week', () => {
    const board = evaluateWeeklyContracts({
      runs: [
        priorClear('prior-reset-dungeon', 'Duality', 42, ['n1', 'n2'], '2026-10-02T18:00:00.000Z'),
        run({
          id: 'before-reset',
          completedAt: '2026-10-13T16:30:00.000Z',
          teamMembers: [member('me'), member('n1'), member('n2')],
        }),
      ],
      viewer,
      now: NOW,
      season: SEASON,
      featuredDungeonsAt: featured,
    })
    expect(contract('featured-dungeon-new-guardians', board)?.completed).toBe(false)
    expect(board.weekTierPoints).toBe(0)
    expect(board.seasonTierPoints).toBe(15)
  })

  it('refuses new-Guardian and first-timer credit when history was truncated', () => {
    const clear = run({
      id: 'now',
      completedAt: '2026-10-14T12:00:00.000Z',
      type: 'raid',
      activityName: 'Garden of Salvation',
      activityId: 70,
      clanMemberCount: 2,
      randoCount: 1,
      teamMembers: [
        member('me', { clanId: 'clan-a' }),
        member('clanmate', { clanId: 'clan-a' }),
        member('learner'),
      ],
    })
    const board = evaluateWeeklyContracts({
      runs: [clear],
      viewer,
      now: NOW,
      season: SEASON,
      featuredDungeonsAt: featured,
      viewerHistoryComplete: false,
      clearHistoryComplete: false,
    })
    expect(contract('help-first-timer', board)?.completed).toBe(false)
    expect(contract('help-first-timer', board)?.progressLabel).toContain('incomplete')
    expect(contract('raid-clan-and-outsider', board)?.completed).toBe(true)
    expect(board.historyComplete).toBe(false)
  })

  it('accepts a custom contract catalog and ignores invalid JSON', () => {
    const custom: WeeklyContractDefinition[] = [
      {
        id: 'custom-raid',
        title: 'Any raid',
        description: 'Clear a raid.',
        tierPoints: 5,
        rule: { kind: 'raid_mixed_clan' },
      },
    ]
    const board = evaluateWeeklyContracts({
      runs: [
        run({
          id: 'custom',
          completedAt: '2026-10-14T12:00:00.000Z',
          type: 'raid',
          activityName: 'Crota\'s End',
          clanMemberCount: 2,
          randoCount: 1,
          teamMembers: [member('me', { clanId: 'clan-a' }), member('c', { clanId: 'clan-a' }), member('o')],
        }),
      ],
      viewer,
      now: NOW,
      season: SEASON,
      contracts: custom,
      featuredDungeonsAt: featured,
    })
    expect(board.contracts).toHaveLength(1)
    expect(board.contracts[0]?.id).toBe('custom-raid')
    expect(board.weekTierPoints).toBe(5)

    process.env.FIRETEAM_HQ_WEEKLY_CONTRACTS_JSON = '{not json'
    expect(resolveWeeklyContractCatalog().map((entry) => entry.id)).toEqual(
      DEFAULT_WEEKLY_CONTRACTS.map((entry) => entry.id)
    )
  })

  it('maps season tier thresholds without monetary rewards', () => {
    expect(resolveSeasonTier(0).tier).toBe(1)
    expect(resolveSeasonTier(15).title).toBe('Contract Runner')
    expect(resolveSeasonTier(39).tier).toBe(2)
    expect(resolveSeasonTier(40).frame).toBe('silver')
    expect(resolveSeasonTier(140).frame).toBe('prismatic')
    expect(resolveSeasonTier(140).pointsToNext).toBeNull()
    expect(resolveSeasonTier(80).title).not.toMatch(/\$|card|cash/i)
  })
})
