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

/** Published rotator rows. Raids repeat every 9 weeks from 2026-07-28; dungeons every 10 from 2026-07-21. */
const ROTATOR_WEEKS: Array<{
  at: string
  weekStart: string
  raids: [string, string]
  dungeons: [string, string]
}> = [
  {
    at: '2026-07-28T17:00:00.000Z',
    weekStart: '2026-07-28',
    raids: ['Deep Stone Crypt', "Crota's End"],
    dungeons: ["Warlord's Ruin", 'Pit of Heresy'],
  },
  {
    at: '2026-08-04T17:00:00.000Z',
    weekStart: '2026-08-04',
    raids: ['Vault of Glass', "Salvation's Edge"],
    dungeons: ['Prophecy', "Vesper's Host"],
  },
  {
    at: '2026-08-11T17:00:00.000Z',
    weekStart: '2026-08-11',
    raids: ['Vow of the Disciple', 'Last Wish'],
    dungeons: ['Grasp of Avarice', 'Sundered Doctrine'],
  },
  {
    at: '2026-09-22T17:00:00.000Z',
    weekStart: '2026-09-22',
    raids: ['Garden of Salvation', 'Root of Nightmares'],
    dungeons: ['Spire of the Watcher', 'Sundered Doctrine'],
  },
  {
    at: '2026-09-29T18:00:00.000Z',
    weekStart: '2026-09-29',
    raids: ['Deep Stone Crypt', "Crota's End"],
    dungeons: ['Ghosts of the Deep', 'Shattered Throne'],
  },
  {
    at: '2026-10-06T17:00:00.000Z',
    weekStart: '2026-10-06',
    raids: ['Vault of Glass', "Salvation's Edge"],
    dungeons: ["Warlord's Ruin", 'Pit of Heresy'],
  },
  {
    at: '2026-10-13T18:00:00.000Z',
    weekStart: '2026-10-13',
    raids: ['Vow of the Disciple', 'Last Wish'],
    dungeons: ['Prophecy', "Vesper's Host"],
  },
  {
    at: '2026-10-20T17:00:00.000Z',
    weekStart: '2026-10-20',
    raids: ['Garden of Salvation', "King's Fall"],
    dungeons: ['Grasp of Avarice', 'Sundered Doctrine'],
  },
]

describe('featured rotation schedule', () => {
  it('pins the week of 13 Oct 2026 to Vow, Last Wish, Prophecy, and Vesper\'s Host', () => {
    const state = getWeeklyResetState(new Date('2026-10-14T12:00:00.000Z'))
    expect(state.weekStart).toBe('2026-10-13')
    expect(state.rotationSource).toBe('schedule')
    expect(state.featuredRaids.map((raid) => raid.name)).toEqual(['Vow of the Disciple', 'Last Wish'])
    expect(state.featuredDungeons.map((dungeon) => dungeon.name)).toEqual(['Prophecy', "Vesper's Host"])
    expect(state.nextResetAt).toBe('2026-10-20T17:00:00.000Z')
  })

  it('matches the week of 6 Oct 2026 on the last-resort calendar', () => {
    const state = getWeeklyResetState(OCT_11)
    expect(state.weekStart).toBe('2026-10-06')
    expect(state.rotationSource).toBe('schedule')
    expect(state.featuredRaids.map((raid) => raid.name)).toEqual(['Vault of Glass', "Salvation's Edge"])
    expect(state.featuredDungeons.map((dungeon) => dungeon.name)).toEqual(["Warlord's Ruin", 'Pit of Heresy'])
    expect(state.nextResetAt).toBe(RESET_END)
  })

  it('keeps the Aug 4 and Sep 22 rotator pairs', () => {
    expect(raidPairForWeekIndex(1)).toEqual(['Vault of Glass', "Salvation's Edge"])
    expect(dungeonPairForWeekIndex(2)).toEqual(['Prophecy', "Vesper's Host"])
    const sep22 = getWeeklyResetState(new Date('2026-09-22T17:00:00.000Z'))
    expect(sep22.featuredRaids.map((raid) => raid.name)).toEqual(['Garden of Salvation', 'Root of Nightmares'])
    expect(sep22.featuredDungeons.map((dungeon) => dungeon.name)).toEqual([
      'Spire of the Watcher',
      'Sundered Doctrine',
    ])
  })

  it('matches the published rotator weeks, including 13 Oct 2026', () => {
    for (const week of ROTATOR_WEEKS) {
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

  it('repeats the raid cycle every 9 weeks and the dungeon cycle every 10', () => {
    expect(raidPairForWeekIndex(0)).toEqual(['Deep Stone Crypt', "Crota's End"])
    expect(raidPairForWeekIndex(2)).toEqual(['Vow of the Disciple', 'Last Wish'])
    expect(dungeonPairForWeekIndex(0)).toEqual(['Ghosts of the Deep', 'Shattered Throne'])
    expect(dungeonPairForWeekIndex(2)).toEqual(['Prophecy', "Vesper's Host"])
    expect(raidPairForWeekIndex(2)).toEqual(raidPairForWeekIndex(2 + 9))
    expect(dungeonPairForWeekIndex(2)).toEqual(dungeonPairForWeekIndex(2 + 10))
    const oct13 = getWeeklyResetState(new Date('2026-10-13T18:00:00.000Z'))
    const nineWeeksLater = getWeeklyResetState(new Date('2026-12-15T18:00:00.000Z'))
    const tenWeeksLater = getWeeklyResetState(new Date('2026-12-22T18:00:00.000Z'))
    expect(nineWeeksLater.featuredRaids.map((raid) => raid.name)).toEqual(
      oct13.featuredRaids.map((raid) => raid.name)
    )
    expect(tenWeeksLater.featuredDungeons.map((dungeon) => dungeon.name)).toEqual(
      oct13.featuredDungeons.map((dungeon) => dungeon.name)
    )
  })

  it('feeds the same Oct 13 pairs to the weekly reset state and the public hub', () => {
    const now = new Date('2026-10-13T18:00:00.000Z')
    const state = getWeeklyResetState(now)
    const hub = assemblePublicHub({ now, runs: [], lobbies: [] })
    expect(state.featuredRaids.map((raid) => raid.name)).toEqual([
      'Vow of the Disciple',
      'Last Wish',
    ])
    expect(state.featuredDungeons.map((dungeon) => dungeon.name)).toEqual([
      'Prophecy',
      "Vesper's Host",
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

  it('pins the 13 Oct 2026 featured pair from a milestone payload', () => {
    const now = new Date('2026-10-14T12:00:00.000Z')
    const selected = selectFeaturedWeeklyActivities(
      [
        {
          name: 'Grandmaster Nightfall',
          endDate: '2026-10-20T17:00:00.000Z',
          activities: [{ name: 'Warden of Nothing', activityModeType: 46 }],
        },
        {
          name: 'Garden of Salvation Challenge',
          endDate: '2026-10-20T17:00:00.000Z',
          activities: [{ name: 'Garden of Salvation', activityModeType: RAID_ACTIVITY_MODE }],
        },
        {
          name: 'Featured Raid',
          endDate: '2026-10-20T17:00:00.000Z',
          activities: [
            { name: 'Vow of the Disciple', activityModeType: RAID_ACTIVITY_MODE },
            { name: 'Vow of the Disciple: Master', activityModeType: RAID_ACTIVITY_MODE },
            { name: 'Last Wish', activityModeType: RAID_ACTIVITY_MODE },
          ],
        },
        {
          name: 'Featured Dungeon',
          endDate: '2026-10-20T17:00:00.000Z',
          activities: [
            { name: 'Prophecy', activityModeType: DUNGEON_ACTIVITY_MODE },
            { name: "Vesper's Host", activityModeType: DUNGEON_ACTIVITY_MODE },
          ],
        },
        {
          name: 'Pantheon',
          endDate: '2026-10-20T17:00:00.000Z',
          activities: [{ name: 'Argos' }, { name: 'Morgeth' }],
        },
      ],
      now
    )
    expect(selected?.raids).toEqual(['Vow of the Disciple', 'Last Wish'])
    expect(selected?.dungeons).toEqual(['Prophecy', "Vesper's Host"])
    expect(selected?.pantheon).toBe('Argos · Morgeth')
    expect(selected?.nightfall).toBe('Warden of Nothing')
  })
})

describe('live rotation cache', () => {
  it('overrides only the cached reset week and expires at the next reset', async () => {
    await refreshLiveWeeklyRotation(OCT_11, async () => ({
      raids: ['Last Wish', 'Root of Nightmares'],
      dungeons: ['Duality', 'Ghosts of the Deep'],
      pantheon: 'Calus · Consecrated Mind',
      endsAtMs: new Date(RESET_END).getTime(),
    }))

    const current = getWeeklyResetState(OCT_11)
    expect(current.rotationSource).toBe('bungie')
    expect(current.featuredRaids.map((raid) => raid.name)).toEqual(['Last Wish', 'Root of Nightmares'])

    const nextWeek = getWeeklyResetState(new Date(RESET_END))
    expect(nextWeek.rotationSource).toBe('schedule')
    expect(nextWeek.featuredRaids.map((raid) => raid.name)).toEqual(['Vow of the Disciple', 'Last Wish'])
    expect(nextWeek.featuredDungeons.map((dungeon) => dungeon.name)).toEqual(['Prophecy', "Vesper's Host"])
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
      raids: ['Last Wish', 'Root of Nightmares'],
      dungeons: ['Duality', 'Ghosts of the Deep'],
      endsAtMs: new Date(RESET_END).getTime(),
    }))
    await refreshLiveWeeklyRotation(OCT_11, async () => {
      throw new Error('bungie down')
    })
    expect(getWeeklyResetState(OCT_11).rotationSource).toBe('bungie')
  })

  it('uses Bungie for the week of 13 Oct 2026 when milestones name the featured pair', async () => {
    const now = new Date('2026-10-14T12:00:00.000Z')
    await refreshLiveWeeklyRotation(now, async () => ({
      raids: ['Vow of the Disciple', 'Last Wish'],
      dungeons: ['Prophecy', "Vesper's Host"],
      pantheon: 'Argos · Morgeth',
      nightfall: 'Warden of Nothing',
      endsAtMs: new Date('2026-10-20T17:00:00.000Z').getTime(),
    }))
    const state = getWeeklyResetState(now)
    expect(state.rotationSource).toBe('bungie')
    expect(state.featuredRaids.map((raid) => raid.name)).toEqual(['Vow of the Disciple', 'Last Wish'])
    expect(state.featuredDungeons.map((dungeon) => dungeon.name)).toEqual(['Prophecy', "Vesper's Host"])
    expect(state.pantheon).toBe('Argos · Morgeth')
    expect(state.nightfall).toBe('Warden of Nothing')
  })

  it('scrapes a reset post and caches it when Bungie returns nothing', async () => {
    const now = new Date('2026-10-14T12:00:00.000Z')
    let writes = 0
    await refreshLiveWeeklyRotation(now, {
      loadBungie: async () => null,
      loadWeb: async () => ({
        raids: ['Vow of the Disciple', 'Last Wish'],
        dungeons: ['Prophecy', "Vesper's Host"],
        nightfall: 'Warden of Nothing',
      }),
      store: {
        read: async () => null,
        write: async () => {
          writes += 1
        },
      },
    })
    const state = getWeeklyResetState(now)
    expect(state.rotationSource).toBe('web')
    expect(state.featuredRaids.map((raid) => raid.name)).toEqual(['Vow of the Disciple', 'Last Wish'])
    expect(state.featuredDungeons.map((dungeon) => dungeon.name)).toEqual(['Prophecy', "Vesper's Host"])
    expect(state.nightfall).toBe('Warden of Nothing')
    expect(writes).toBe(1)
  })

  it('reads the cached week before calling Bungie again', async () => {
    const now = new Date('2026-10-14T12:00:00.000Z')
    let bungieCalls = 0
    await refreshLiveWeeklyRotation(now, {
      loadBungie: async () => {
        bungieCalls += 1
        return null
      },
      loadWeb: async () => {
        throw new Error('scrape should not run')
      },
      store: {
        read: async () => ({
          weekStart: '2026-10-13',
          expiresAtMs: new Date('2026-10-20T17:00:00.000Z').getTime(),
          raids: ['Vow of the Disciple', 'Last Wish'],
          dungeons: ['Prophecy', "Vesper's Host"],
          source: 'bungie',
        }),
        write: async () => {
          throw new Error('should not write')
        },
      },
    })
    expect(bungieCalls).toBe(0)
    const state = getWeeklyResetState(now)
    expect(state.rotationSource).toBe('bungie')
    expect(state.featuredRaids.map((raid) => raid.name)).toEqual(['Vow of the Disciple', 'Last Wish'])
    expect(state.featuredDungeons.map((dungeon) => dungeon.name)).toEqual(['Prophecy', "Vesper's Host"])
  })
})
