import { afterEach, describe, expect, it, vi } from 'vitest'
import { BungieApiError, getDestinyEntityDefinition } from '@/lib/destiny/bungieClient'
import { bungieRetryDelayMs } from '@/lib/destiny/bungieRateLimit'
import { clanDivisionForPoints, evaluateClanWars } from '@/lib/destiny/clanWars'
import { evaluateFireteamChemistry } from '@/lib/destiny/fireteamChemistry'
import { monetaryPrizesEnabled, seasonPrizesEnabled } from '@/lib/destiny/featureFlags'
import { evaluateNightOps, resolveNightOpsCatalog } from '@/lib/destiny/nightOps'
import type { FireteamViewer } from '@/lib/destiny/passport'
import { evaluateSherpaRanks, sherpaTitleForPoints } from '@/lib/destiny/sherpaRanks'
import type { MvpVote, NightOpsEvent, RunRecord, RunTeamMember } from '@/lib/destiny/types'

const viewer: FireteamViewer = {
  userId: 'user-me',
  membershipId: 'me',
  clanId: 'clan-a',
  displayName: 'Me',
}

const SEASON = { startDate: '2026-10-01T17:00:00.000Z', endDate: '2026-10-31T23:59:59.999Z' }
const NOW = new Date('2026-10-11T18:00:00.000Z')

function member(id: string, extra: Partial<RunTeamMember> = {}): RunTeamMember {
  return {
    membershipId: id,
    displayName: extra.displayName ?? id,
    platform: 'steam',
    characterClass: 'hunter',
    kills: 10,
    deaths: 1,
    assists: 2,
    score: 40,
    powerLevel: 2000,
    ...extra,
  }
}

function run(partial: Partial<RunRecord> & Pick<RunRecord, 'id' | 'completedAt'>): RunRecord {
  return {
    pgcrId: partial.id,
    activityId: 100,
    activityName: 'Vault of Glass',
    type: 'raid',
    difficulty: 'normal',
    durationSeconds: 1200,
    completed: true,
    checkpointLikely: false,
    teamMembers: [member('me', { clanId: 'clan-a', clanName: 'Nest' }), member('ada', { clanId: 'clan-a', clanName: 'Nest' })],
    clanMemberCount: 2,
    randoCount: 0,
    isFullClanTeam: true,
    suspiciousScore: 0,
    verificationStatus: 'verified',
    pointsAwarded: 4,
    ownerUserId: 'user-me',
    ...partial,
  }
}

function vote(partial: Partial<MvpVote> & Pick<MvpVote, 'runId' | 'voterId' | 'selectedMembershipId'>): MvpVote {
  return {
    id: `${partial.runId}-${partial.voterId}`,
    selectedUserId: partial.selectedUserId ?? '',
    selectedDisplayName: partial.selectedDisplayName ?? partial.selectedMembershipId,
    createdAt: '2026-10-08T19:00:00.000Z',
    ...partial,
  }
}

const originalFetch = globalThis.fetch
const originalDestinyApi = process.env.DESTINY_API
const originalBungieApi = process.env.BUNGIE_API_KEY
const originalNightOps = process.env.FIRETEAM_HQ_NIGHT_OPS_JSON
const originalPrizeFlag = process.env.NEXT_PUBLIC_FIRETEAM_HQ_MONETARY_PRIZES

afterEach(() => {
  globalThis.fetch = originalFetch
  restoreEnv('DESTINY_API', originalDestinyApi)
  restoreEnv('BUNGIE_API_KEY', originalBungieApi)
  restoreEnv('FIRETEAM_HQ_NIGHT_OPS_JSON', originalNightOps)
  restoreEnv('NEXT_PUBLIC_FIRETEAM_HQ_MONETARY_PRIZES', originalPrizeFlag)
  vi.useRealTimers()
})

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) delete process.env[key]
  else process.env[key] = value
}

describe('sherpa ranks', () => {
  it('credits a sherpa for a learner first clear and adds a point when that learner votes them MVP', () => {
    const prior = run({
      id: 'prior',
      completedAt: '2026-10-02T18:00:00.000Z',
      teamMembers: [member('sherpa', { displayName: 'Guide' }), member('old', { displayName: 'Old' })],
    })
    const guided = run({
      id: 'guided',
      completedAt: '2026-10-08T18:00:00.000Z',
      teamMembers: [
        member('sherpa', { displayName: 'Guide' }),
        member('learner', { displayName: 'Learner' }),
      ],
    })
    const board = evaluateSherpaRanks({
      runs: [guided, prior],
      votes: [vote({ runId: 'guided', voterId: 'user-learner', selectedMembershipId: 'sherpa', selectedUserId: 'user-sherpa' })],
      membershipToUserId: new Map([
        ['learner', 'user-learner'],
        ['sherpa', 'user-sherpa'],
      ]),
      season: SEASON,
      viewerMembershipId: 'sherpa',
    })

    expect(board.guidedClears).toBe(1)
    expect(board.learnerMvps).toBe(1)
    expect(board.points).toBe(2)
    expect(board.title).toBe('Trail Guide')
    expect(board.rank).toBe(1)
    expect(board.hallOfFame[0]?.displayName).toBe('Guide')
    expect(board.recentCredits[0]?.learnerMvp).toBe(true)
  })

  it('does not award sherpa credit when everyone on the clear is a first-timer', () => {
    const board = evaluateSherpaRanks({
      runs: [
        run({
          id: 'fresh',
          completedAt: '2026-10-08T18:00:00.000Z',
          teamMembers: [member('sherpa'), member('learner')],
        }),
      ],
      season: SEASON,
      viewerMembershipId: 'sherpa',
    })

    expect(board.guidedClears).toBe(0)
    expect(board.points).toBe(0)
    expect(board.title).toBe('Unranked')
    expect(board.hallOfFame).toEqual([])
  })

  it('credits an unregistered sherpa when the learner MVP is keyed by membership id', () => {
    const prior = run({
      id: 'prior',
      completedAt: '2026-10-02T18:00:00.000Z',
      teamMembers: [member('sherpa', { displayName: 'Guide' }), member('old')],
    })
    const guided = run({
      id: 'guided',
      completedAt: '2026-10-08T18:00:00.000Z',
      teamMembers: [member('sherpa', { displayName: 'Guide' }), member('learner', { displayName: 'Learner' })],
    })
    const board = evaluateSherpaRanks({
      runs: [prior, guided],
      votes: [
        vote({
          runId: 'guided',
          voterId: 'user-learner',
          selectedMembershipId: 'sherpa',
          category: 'mvp',
        }),
      ],
      membershipToUserId: new Map([['learner', 'user-learner']]),
      season: SEASON,
      viewerMembershipId: 'sherpa',
    })

    expect(board.learnerMvps).toBe(1)
    expect(board.points).toBe(2)
    expect(board.hallOfFame[0]?.membershipId).toBe('sherpa')
  })

  it('does not treat kudos as a learner MVP', () => {
    const prior = run({
      id: 'prior',
      completedAt: '2026-10-02T18:00:00.000Z',
      teamMembers: [member('sherpa'), member('old')],
    })
    const guided = run({
      id: 'guided',
      completedAt: '2026-10-08T18:00:00.000Z',
      teamMembers: [member('sherpa'), member('learner')],
    })
    const board = evaluateSherpaRanks({
      runs: [prior, guided],
      votes: [
        vote({
          runId: 'guided',
          voterId: 'user-learner',
          selectedMembershipId: 'sherpa',
          category: 'kudos',
        }),
      ],
      membershipToUserId: new Map([
        ['learner', 'user-learner'],
        ['sherpa', 'user-sherpa'],
      ]),
      season: SEASON,
      viewerMembershipId: 'sherpa',
    })

    expect(board.guidedClears).toBe(1)
    expect(board.learnerMvps).toBe(0)
    expect(board.points).toBe(1)
  })

  it('ignores a learner MVP vote that does not name the sherpa', () => {
    const prior = run({
      id: 'prior',
      completedAt: '2026-10-02T18:00:00.000Z',
      teamMembers: [member('sherpa'), member('old')],
    })
    const guided = run({
      id: 'guided',
      completedAt: '2026-10-08T18:00:00.000Z',
      teamMembers: [member('sherpa'), member('learner')],
    })
    const board = evaluateSherpaRanks({
      runs: [prior, guided],
      votes: [vote({ runId: 'guided', voterId: 'user-learner', selectedMembershipId: 'someone-else' })],
      membershipToUserId: new Map([['learner', 'user-learner']]),
      season: SEASON,
      viewerMembershipId: 'sherpa',
    })

    expect(board.guidedClears).toBe(1)
    expect(board.learnerMvps).toBe(0)
    expect(board.points).toBe(1)
  })

  it('maps point totals onto sherpa titles', () => {
    expect(sherpaTitleForPoints(0)).toBe('Unranked')
    expect(sherpaTitleForPoints(1)).toBe('Trail Guide')
    expect(sherpaTitleForPoints(5)).toBe('Sherpa')
    expect(sherpaTitleForPoints(15)).toBe('Pathfinder')
    expect(sherpaTitleForPoints(30)).toBe('Oath Sherpa')
  })
})

describe('clan wars', () => {
  it('scores a clan only when two clanmates clear, and adds a recruit bonus for a first clear', () => {
    const solo = run({
      id: 'solo-clan',
      completedAt: '2026-10-08T18:00:00.000Z',
      teamMembers: [member('me', { clanId: 'clan-a', clanName: 'Nest' }), member('rando')],
    })
    const recruitClear = run({
      id: 'recruit',
      completedAt: '2026-10-08T19:00:00.000Z',
      teamMembers: [
        member('me', { clanId: 'clan-a', clanName: 'Nest' }),
        member('rookie', { displayName: 'Rookie', clanId: 'clan-a', clanName: 'Nest' }),
      ],
    })
    const board = evaluateClanWars({
      runs: [solo, recruitClear],
      season: SEASON,
      now: NOW,
      viewerClanId: 'clan-a',
    })

    expect(board.standings).toHaveLength(1)
    expect(board.viewerClan?.verifiedClears).toBe(1)
    expect(board.viewerClan?.recruitBonuses).toBe(1)
    expect(board.viewerClan?.seasonPoints).toBe(4)
    expect(board.viewerClan?.weeklyPoints).toBe(4)
    expect(board.viewerClan?.division).toBe('Ember')
  })

  it('keeps last week on the season total and off the current week', () => {
    const lastWeek = run({
      id: 'last-week',
      completedAt: '2026-10-01T18:00:00.000Z',
      teamMembers: [
        member('me', { clanId: 'clan-a', clanName: 'Nest' }),
        member('ada', { clanId: 'clan-a', clanName: 'Nest' }),
      ],
    })
    const priorMe = run({
      id: 'prior-me',
      completedAt: '2026-09-20T18:00:00.000Z',
      teamMembers: [member('me', { clanId: 'clan-a', clanName: 'Nest' }), member('old')],
    })
    const priorAda = run({
      id: 'prior-ada',
      completedAt: '2026-09-21T18:00:00.000Z',
      teamMembers: [member('ada', { clanId: 'clan-a', clanName: 'Nest' }), member('old')],
    })
    const board = evaluateClanWars({
      runs: [priorMe, priorAda, lastWeek],
      season: SEASON,
      now: NOW,
      viewerClanId: 'clan-a',
    })

    expect(board.viewerClan?.seasonPoints).toBe(2)
    expect(board.viewerClan?.weeklyPoints).toBe(0)
    expect(board.viewerClan?.recruitBonuses).toBe(0)
  })

  it('names divisions from season points', () => {
    expect(clanDivisionForPoints(0)).toBe('Ember')
    expect(clanDivisionForPoints(9)).toBe('Ember')
    expect(clanDivisionForPoints(10)).toBe('Ash')
    expect(clanDivisionForPoints(25)).toBe('Iron')
    expect(clanDivisionForPoints(50)).toBe('Steel')
  })
})

describe('night ops', () => {
  const event: NightOpsEvent = {
    id: 'ops-1',
    title: 'Vow Night',
    hostName: 'NestTV',
    startsAt: '2026-10-11T17:00:00.000Z',
    endsAt: '2026-10-11T21:00:00.000Z',
    activityName: 'Vault of Glass',
    twitchUrl: 'https://twitch.tv/nesttv',
    kickUrl: 'javascript:alert(1)',
  }

  it('badges a verified clear inside the window and ignores clears outside it or on another activity', () => {
    const inside = run({ id: 'inside', completedAt: '2026-10-11T18:00:00.000Z', activityName: 'Vault of Glass' })
    const early = run({ id: 'early', completedAt: '2026-10-11T16:00:00.000Z', activityName: 'Vault of Glass' })
    const other = run({ id: 'other', completedAt: '2026-10-11T18:30:00.000Z', activityName: 'Deep Stone Crypt', activityId: 9 })
    const board = evaluateNightOps({
      runs: [early, other, inside],
      viewer,
      now: new Date('2026-10-11T18:30:00.000Z'),
      events: [event],
    })

    expect(board.events[0]?.status).toBe('live')
    expect(board.events[0]?.attended).toBe(true)
    expect(board.events[0]?.evidenceRunId).toBe('inside')
    expect(board.badges).toEqual(['Night Ops — Vow Night'])
    expect(board.events[0]?.event.twitchUrl).toBe('https://twitch.tv/nesttv')
    expect(board.events[0]?.event.kickUrl).toBeUndefined()
  })

  it('marks upcoming and ended events and does not badge them without a clear', () => {
    const upcoming = evaluateNightOps({
      runs: [],
      viewer,
      now: new Date('2026-10-11T16:00:00.000Z'),
      events: [event],
    })
    const ended = evaluateNightOps({
      runs: [],
      viewer,
      now: new Date('2026-10-11T22:00:00.000Z'),
      events: [event],
    })

    expect(upcoming.events[0]?.status).toBe('upcoming')
    expect(upcoming.badges).toEqual([])
    expect(ended.events[0]?.status).toBe('ended')
    expect(ended.events[0]?.attended).toBe(false)
  })

  it('falls back to an empty catalog when the env JSON is invalid', () => {
    process.env.FIRETEAM_HQ_NIGHT_OPS_JSON = '{not json'
    expect(resolveNightOpsCatalog()).toEqual([])
    delete process.env.FIRETEAM_HQ_NIGHT_OPS_JSON
    expect(resolveNightOpsCatalog()).toEqual([])
  })
})

describe('fireteam chemistry', () => {
  it('ranks squads by clear rate then faster average time, and suggests teammates with a clear', () => {
    const adaClear = (id: string, seconds: number) =>
      run({
        id,
        completedAt: '2026-10-08T18:00:00.000Z',
        durationSeconds: seconds,
        teamMembers: [member('me'), member('ada', { displayName: 'Ada' })],
      })
    const adaFail = run({
      id: 'ada-fail',
      completedAt: '2026-10-09T18:00:00.000Z',
      completed: false,
      verificationStatus: 'verified',
      teamMembers: [member('me'), member('ada', { displayName: 'Ada' })],
    })
    const boaClears = [1, 2, 3].map((index) =>
      run({
        id: `boa-${index}`,
        completedAt: `2026-10-0${index}T18:00:00.000Z`,
        durationSeconds: 2000,
        teamMembers: [member('me'), member('boa', { displayName: 'Boa' })],
      })
    )
    const once = run({
      id: 'once',
      completedAt: '2026-10-04T18:00:00.000Z',
      durationSeconds: 4000,
      teamMembers: [member('me'), member('cy', { displayName: 'Cy' })],
    })

    const board = evaluateFireteamChemistry([adaFail, adaClear('ada-1', 1000), adaClear('ada-2', 2000), ...boaClears, once], viewer)

    expect(board.squads.map((squad) => squad.memberNames[0])).toEqual(['Boa', 'Ada'])
    expect(board.squads[0]?.clearRate).toBe(1)
    expect(board.squads[1]?.clearRate).toBeCloseTo(0.667)
    expect(board.squads[1]?.averageClearSeconds).toBe(1500)
    expect(board.squads.find((squad) => squad.memberNames.includes('Cy'))).toBeUndefined()
    expect(board.suggestions[0]?.displayName).toBe('Boa')
    expect(board.suggestions[0]?.reason).toBe('Clears 100% of runs together')
    expect(board.suggestions.find((row) => row.displayName === 'Ada')?.reason).toBe('2 verified clears together')
  })
})

describe('bungie rate limit', () => {
  it('waits once using Retry-After and caps the delay at two seconds', () => {
    expect(bungieRetryDelayMs('1', 0)).toBe(1000)
    expect(bungieRetryDelayMs('9', 0)).toBe(2000)
    expect(bungieRetryDelayMs(null, 0)).toBe(1000)
    expect(bungieRetryDelayMs('1', 1)).toBeNull()
  })

  it('retries a 429 once, then surfaces the rate limit instead of looping', async () => {
    process.env.DESTINY_API = 'test-key'
    let calls = 0
    globalThis.fetch = vi.fn(async () => {
      calls += 1
      if (calls < 3) {
        return new Response('', { status: 429, headers: { 'retry-after': '0.001' } })
      }
      return new Response(
        JSON.stringify({ ErrorCode: 1, ErrorStatus: 'Success', Message: 'Ok', MessageData: {}, Response: { name: 'Ok' } }),
        { status: 200 }
      )
    }) as typeof fetch

    await expect(getDestinyEntityDefinition('DestinyActivityDefinition', 1)).rejects.toBeInstanceOf(BungieApiError)
    expect(calls).toBe(2)
  })

  it('fails closed when the Bungie API key is missing', async () => {
    delete process.env.DESTINY_API
    delete process.env.BUNGIE_API_KEY
    await expect(getDestinyEntityDefinition('DestinyActivityDefinition', 1)).rejects.toMatchObject({ statusCode: 503 })
  })
})

describe('reward flag', () => {
  it('keeps monetary prizes off unless the flag is explicitly enabled', () => {
    delete process.env.NEXT_PUBLIC_FIRETEAM_HQ_MONETARY_PRIZES
    expect(monetaryPrizesEnabled()).toBe(false)
    process.env.NEXT_PUBLIC_FIRETEAM_HQ_MONETARY_PRIZES = 'false'
    expect(monetaryPrizesEnabled()).toBe(false)
    process.env.NEXT_PUBLIC_FIRETEAM_HQ_MONETARY_PRIZES = 'true'
    expect(monetaryPrizesEnabled()).toBe(true)
  })
  it('season 3D-print prizes default on and can be switched off', () => {
    delete process.env.NEXT_PUBLIC_SEASON_PRIZES
    expect(seasonPrizesEnabled()).toBe(true)
    process.env.NEXT_PUBLIC_SEASON_PRIZES = 'off'
    expect(seasonPrizesEnabled()).toBe(false)
    delete process.env.NEXT_PUBLIC_SEASON_PRIZES
  })
})
