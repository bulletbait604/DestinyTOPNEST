import { afterEach, describe, expect, it } from 'vitest'
import { applyLiveFeaturedSelection, clearBungieWeeklyCacheForTests, refreshLiveWeeklyRotation } from '@/lib/destiny/bungieWeekly'
import { assemblePublicHub } from '@/lib/destiny/publicHub'
import {
  DUNGEON_ACTIVITY_MODE,
  RAID_ACTIVITY_MODE,
  selectFeaturedWeeklyActivities,
  type WeeklyMilestoneSnapshot,
} from '@/lib/destiny/weeklyFeaturedSelection'
import {
  cacheControlUntilWeeklyReset,
  dungeonPairForWeekIndex,
  getCurrentWeekResetStart,
  getWeeklyResetState,
  raidPairForWeekIndex,
} from '@/lib/destiny/weeklyRotation'

const OCT_6 = new Date('2026-10-06T17:00:00.000Z')
const OCT_11 = new Date('2026-10-11T18:00:00.000Z')
const RESET_END = '2026-10-13T17:00:00.000Z'

afterEach(() => {
  clearBungieWeeklyCacheForTests()
})

describe('weekly reset boundary', () => {
  it('starts the week at Tuesday 17:00 UTC and not a minute earlier', () => {
    expect(getCurrentWeekResetStart(new Date('2026-10-13T16:59:59.999Z')).toISOString()).toBe(
      '2026-10-06T17:00:00.000Z'
    )
    expect(getCurrentWeekResetStart(new Date('2026-10-13T17:00:00.000Z')).toISOString()).toBe(
      '2026-10-13T17:00:00.000Z'
    )
    expect(getWeeklyResetState(new Date('2026-10-13T16:59:59.999Z')).weekStart).toBe('2026-10-06')
    expect(getWeeklyResetState(new Date('2026-10-13T17:00:00.000Z')).weekStart).toBe('2026-10-13')
  })

  it('keeps the HTTP cache from outliving the reset', () => {
    const thirtySecondsBefore = new Date('2026-10-13T16:59:30.000Z')
    const tight = cacheControlUntilWeeklyReset(thirtySecondsBefore, {
      scope: 'public',
      maxAge: 60,
      staleWhileRevalidate: 300,
    })
    expect(tight).toBe('public, max-age=30, s-maxage=30')

    const twoHoursBefore = new Date('2026-10-13T15:00:00.000Z')
    const loose = cacheControlUntilWeeklyReset(twoHoursBefore, {
      scope: 'private',
      maxAge: 120,
      staleWhileRevalidate: 300,
    })
    expect(loose).toBe('private, max-age=120, stale-while-revalidate=300')
  })
})

/** Blueberries 2026 table rows the 8-week raid cycle and 9-dungeon ring both reproduce. */
const BLUEBERRIES_WEEKS: Array<{
  at: string
  weekStart: string
  raids: [string, string]
  dungeons: [string, string]
}> = [
  {
    at: '2026-07-07T17:00:00.000Z',
    weekStart: '2026-07-07',
    raids: ['Last Wish', 'Vow of the Disciple'],
    dungeons: ['Shattered Throne', 'Duality'],
  },
  {
    at: '2026-08-04T17:00:00.000Z',
    weekStart: '2026-08-04',
    raids: ['Vow of the Disciple', 'Last Wish'],
    dungeons: ['Duality', "Vesper's Host"],
  },
  {
    at: '2026-09-22T17:00:00.000Z',
    weekStart: '2026-09-22',
    raids: ['Vault of Glass', "Crota's End"],
    dungeons: ['Prophecy', 'Ghosts of the Deep'],
  },
  {
    at: '2026-09-29T18:00:00.000Z',
    weekStart: '2026-09-29',
    raids: ['Vow of the Disciple', 'Last Wish'],
    dungeons: ['Grasp of Avarice', "Warlord's Ruin"],
  },
  {
    at: '2026-10-06T17:00:00.000Z',
    weekStart: '2026-10-06',
    raids: ["King's Fall", 'Garden of Salvation'],
    dungeons: ['Duality', "Vesper's Host"],
  },
  {
    at: '2026-10-13T18:00:00.000Z',
    weekStart: '2026-10-13',
    raids: ['Root of Nightmares', 'Deep Stone Crypt'],
    dungeons: ['Spire of the Watcher', 'Shattered Throne'],
  },
  {
    at: '2026-10-20T17:00:00.000Z',
    weekStart: '2026-10-20',
    raids: ["Crota's End", 'Vault of Glass'],
    dungeons: ['Ghosts of the Deep', 'Pit of Heresy'],
  },
  {
    at: '2026-10-27T17:00:00.000Z',
    weekStart: '2026-10-27',
    raids: ['Last Wish', 'Vow of the Disciple'],
    dungeons: ["Warlord's Ruin", 'Prophecy'],
  },
]

describe('featured rotation schedule', () => {
  it('matches the blueberries week of 6 Oct 2026', () => {
    const state = getWeeklyResetState(OCT_11)
    expect(state.weekStart).toBe('2026-10-06')
    expect(state.rotationSource).toBe('schedule')
    expect(state.featuredRaids.map((raid) => raid.name)).toEqual(["King's Fall", 'Garden of Salvation'])
    expect(state.featuredDungeons.map((dungeon) => dungeon.name)).toEqual(['Duality', "Vesper's Host"])
    expect(state.pantheon).toBe('Calus · Consecrated Mind')
    expect(state.nextResetAt).toBe(RESET_END)
  })

  it('matches the blueberries week of 29 Sep 2026', () => {
    const state = getWeeklyResetState(new Date('2026-09-30T18:00:00.000Z'))
    expect(state.weekStart).toBe('2026-09-29')
    expect(state.featuredRaids.map((raid) => raid.name)).toEqual(['Vow of the Disciple', 'Last Wish'])
    expect(state.featuredDungeons.map((dungeon) => dungeon.name)).toEqual([
      'Grasp of Avarice',
      "Warlord's Ruin",
    ])
    expect(state.pantheon).toBe('Gahlran · Warpriest')
  })

  it('keeps the Aug 4 and Sep 22 blueberries pairs', () => {
    expect(raidPairForWeekIndex(8)).toEqual(['Vow of the Disciple', 'Last Wish'])
    expect(dungeonPairForWeekIndex(8)).toEqual(['Duality', "Vesper's Host"])
    const sep22 = getWeeklyResetState(new Date('2026-09-22T17:00:00.000Z'))
    expect(sep22.featuredRaids.map((raid) => raid.name)).toEqual(['Vault of Glass', "Crota's End"])
    expect(sep22.featuredDungeons.map((dungeon) => dungeon.name)).toEqual(['Prophecy', 'Ghosts of the Deep'])
  })

  it('matches Oct 13 2026 and the neighboring blueberries weeks', () => {
    for (const week of BLUEBERRIES_WEEKS) {
      const state = getWeeklyResetState(new Date(week.at))
      expect({
        weekStart: state.weekStart,
        rotationSource: state.rotationSource,
        raids: state.featuredRaids.map((raid) => raid.name),
        dungeons: state.featuredDungeons.map((dungeon) => dungeon.name),
      }).toEqual({
        weekStart: week.weekStart,
        rotationSource: 'schedule',
        raids: [...week.raids],
        dungeons: [...week.dungeons],
      })
    }
  })

  it('repeats the raid cycle every 8 weeks and the dungeon ring every 9', () => {
    expect(raidPairForWeekIndex(0)).toEqual(['Vow of the Disciple', 'Last Wish'])
    expect(raidPairForWeekIndex(18)).toEqual(raidPairForWeekIndex(18 + 8))
    expect(dungeonPairForWeekIndex(18)).toEqual(dungeonPairForWeekIndex(18 + 9))
    const oct13 = getWeeklyResetState(new Date('2026-10-13T18:00:00.000Z'))
    const eightWeeksLater = getWeeklyResetState(new Date('2026-12-08T18:00:00.000Z'))
    const nineWeeksLater = getWeeklyResetState(new Date('2026-12-15T18:00:00.000Z'))
    expect(eightWeeksLater.featuredRaids.map((raid) => raid.name)).toEqual(
      oct13.featuredRaids.map((raid) => raid.name)
    )
    expect(nineWeeksLater.featuredDungeons.map((dungeon) => dungeon.name)).toEqual(
      oct13.featuredDungeons.map((dungeon) => dungeon.name)
    )
  })

  it('feeds the same Oct 13 pairs to the weekly reset state and the public hub', () => {
    const now = new Date('2026-10-13T18:00:00.000Z')
    const state = getWeeklyResetState(now)
    const hub = assemblePublicHub({ now, runs: [], lobbies: [] })
    expect(state.featuredRaids.map((raid) => raid.name)).toEqual([
      'Root of Nightmares',
      'Deep Stone Crypt',
    ])
    expect(state.featuredDungeons.map((dungeon) => dungeon.name)).toEqual([
      'Spire of the Watcher',
      'Shattered Throne',
    ])
    expect(hub.featuredRaids).toEqual(state.featuredRaids.map((raid) => raid.name))
    expect(hub.featuredDungeons).toEqual(state.featuredDungeons.map((dungeon) => dungeon.name))
    expect(hub.weekLabel).toBe('Oct 13 – Oct 19')
  })
})

describe('Bungie milestone selection', () => {
  const milestones = (): WeeklyMilestoneSnapshot[] => [
    {
      milestoneHash: 'nightfall',
      name: 'Grandmaster Nightfall',
      order: 1,
      endDate: RESET_END,
      activities: [{ name: 'The Arms Dealer', activityModeType: 46 }],
    },
    {
      milestoneHash: 'raid-challenge',
      name: 'Garden of Salvation Challenge',
      order: 2,
      endDate: RESET_END,
      activities: [{ name: 'Garden of Salvation', activityModeType: RAID_ACTIVITY_MODE }],
    },
    {
      milestoneHash: 'featured-raid',
      name: 'Featured Raid',
      order: 3,
      endDate: RESET_END,
      activities: [
        { name: 'Vault of Glass', activityModeType: RAID_ACTIVITY_MODE },
        { name: "Vault of Glass: Master", activityModeType: RAID_ACTIVITY_MODE },
        { name: "Salvation's Edge", activityModeType: RAID_ACTIVITY_MODE },
      ],
    },
    {
      milestoneHash: 'featured-dungeon',
      name: 'Featured Dungeon',
      order: 4,
      endDate: RESET_END,
      activities: [
        { name: "Warlord's Ruin", activityModeType: DUNGEON_ACTIVITY_MODE },
        { name: 'Pit of Heresy', activityModeType: DUNGEON_ACTIVITY_MODE },
      ],
    },
    {
      milestoneHash: 'pantheon',
      name: 'Pantheon',
      order: 5,
      endDate: RESET_END,
      activities: [{ name: 'Calus' }, { name: 'Consecrated Mind' }],
    },
  ]

  it('keeps the featured pair and ignores challenges, nightfalls, and pantheon bosses', () => {
    const selected = selectFeaturedWeeklyActivities(milestones(), OCT_11)
    expect(selected?.raids).toEqual(['Vault of Glass', "Salvation's Edge"])
    expect(selected?.dungeons).toEqual(["Warlord's Ruin", 'Pit of Heresy'])
    expect(selected?.pantheon).toBe('Calus · Consecrated Mind')
  })

  it('drops a featured milestone that already ended', () => {
    const expired = milestones().map((milestone) =>
      milestone.milestoneHash === 'featured-raid' || milestone.milestoneHash === 'featured-dungeon'
        ? { ...milestone, endDate: '2026-10-06T17:00:00.000Z' }
        : milestone
    )
    const selected = selectFeaturedWeeklyActivities(expired, OCT_11)
    expect(selected?.raids ?? []).toEqual([])
    expect(selected?.dungeons ?? []).toEqual([])
  })

  it('reads a two-and-two weekly milestone that is not labeled featured', () => {
    const selected = selectFeaturedWeeklyActivities(
      [
        {
          name: 'Raid and Dungeon Weekly',
          endDate: RESET_END,
          activities: [
            { name: 'Vault of Glass' },
            { name: "Salvation's Edge" },
            { name: "Warlord's Ruin" },
            { name: 'Pit of Heresy' },
          ],
        },
      ],
      OCT_11
    )
    expect(selected?.raids).toEqual(['Vault of Glass', "Salvation's Edge"])
    expect(selected?.dungeons).toEqual(["Warlord's Ruin", 'Pit of Heresy'])
  })

  it('accepts a new featured dungeon name when the mode says dungeon', () => {
    const selected = selectFeaturedWeeklyActivities(
      [
        {
          name: 'Featured Dungeon',
          endDate: RESET_END,
          activities: [
            { name: 'Equilibrium', activityModeType: DUNGEON_ACTIVITY_MODE },
            { name: "Warlord's Ruin", activityModeType: DUNGEON_ACTIVITY_MODE },
          ],
        },
      ],
      OCT_11
    )
    expect(selected?.dungeons).toEqual(['Equilibrium', "Warlord's Ruin"])
  })
})

describe('live rotation cache', () => {
  it('overrides only the cached reset week and expires at the next reset', async () => {
    await refreshLiveWeeklyRotation(OCT_11, async () => ({
      raids: ['Vault of Glass', "Salvation's Edge"],
      dungeons: ["Warlord's Ruin", 'Pit of Heresy'],
      pantheon: 'Calus · Consecrated Mind',
      endsAtMs: new Date(RESET_END).getTime(),
    }))

    const current = getWeeklyResetState(OCT_11)
    expect(current.rotationSource).toBe('bungie')
    expect(current.featuredRaids.map((raid) => raid.name)).toEqual(['Vault of Glass', "Salvation's Edge"])

    const nextWeek = getWeeklyResetState(new Date(RESET_END))
    expect(nextWeek.rotationSource).toBe('schedule')
    expect(nextWeek.featuredRaids.map((raid) => raid.name)).toEqual(['Root of Nightmares', 'Deep Stone Crypt'])
    expect(nextWeek.featuredDungeons.map((dungeon) => dungeon.name)).toEqual([
      'Spire of the Watcher',
      'Shattered Throne',
    ])
    expect(nextWeek.weekStart).toBe('2026-10-13')
  })

  it('does not cache a milestone that ended before now', () => {
    applyLiveFeaturedSelection(OCT_6, {
      raids: ['Vault of Glass', "Salvation's Edge"],
      dungeons: ["Warlord's Ruin", 'Pit of Heresy'],
      endsAtMs: OCT_6.getTime(),
    })
    expect(getWeeklyResetState(OCT_11).rotationSource).toBe('schedule')
  })

  it('does not let a failed refresh replace a still-valid week', async () => {
    await refreshLiveWeeklyRotation(OCT_11, async () => ({
      raids: ['Vault of Glass', "Salvation's Edge"],
      dungeons: ["Warlord's Ruin", 'Pit of Heresy'],
      endsAtMs: new Date(RESET_END).getTime(),
    }))
    await refreshLiveWeeklyRotation(OCT_11, async () => {
      throw new Error('bungie down')
    })
    expect(getWeeklyResetState(OCT_11).rotationSource).toBe('bungie')
  })
})
