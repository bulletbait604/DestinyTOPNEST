import { describe, expect, it } from 'vitest'
import { assemblePublicHub, HUB_SCORING, topGuardiansFromRuns } from '@/lib/destiny/publicHub'
import type { FireteamLobby, RunRecord, RunTeamMember } from '@/lib/destiny/types'

const NOW = new Date('2026-10-11T18:00:00.000Z')

function member(id: string, extra: Partial<RunTeamMember> = {}): RunTeamMember {
  return {
    membershipId: id,
    displayName: extra.displayName ?? id,
    platform: 'steam',
    characterClass: 'hunter',
    kills: 1,
    deaths: 0,
    assists: 0,
    score: 1,
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
    durationSeconds: 1000,
    completed: true,
    checkpointLikely: false,
    teamMembers: [],
    clanMemberCount: 2,
    randoCount: 0,
    isFullClanTeam: true,
    suspiciousScore: 0,
    verificationStatus: 'verified',
    pointsAwarded: 4,
    ...partial,
  }
}

describe('public guardian hub', () => {
  it('publishes this week’s contracts and plain scoring without cash prizes', () => {
    const hub = assemblePublicHub({ now: NOW, runs: [], lobbies: [] })
    expect(hub.contracts.map((contract) => contract.title)).toEqual([
      'Featured dungeon, new faces',
      'Open the raid',
      'Guide a first clear',
    ])
    expect(hub.weekLabel.length).toBeGreaterThan(0)
    expect(hub.featuredDungeons.length).toBeGreaterThan(0)
    const copy = HUB_SCORING.map((note) => `${note.title} ${note.body}`).join(' ')
    expect(copy).toContain('do not change the leaderboard')
    expect(copy.toLowerCase()).not.toContain('cash')
    expect(copy.toLowerCase()).not.toContain('prize')
  })

  it('lists a sherpa and a clan from verified clears, and open fireteams only', () => {
    const prior = run({
      id: 'prior',
      completedAt: '2026-10-02T18:00:00.000Z',
      teamMembers: [member('guide', { displayName: 'Guide' }), member('old', { displayName: 'Old' })],
    })
    const guided = run({
      id: 'guided',
      completedAt: '2026-10-08T18:00:00.000Z',
      teamMembers: [
        member('guide', { displayName: 'Guide', clanId: 'clan-a', clanName: 'Nest' }),
        member('learner', { displayName: 'Learner', clanId: 'clan-a', clanName: 'Nest' }),
      ],
    })
    const lobby = {
      id: 'room-1',
      hostUserId: 'host',
      hostDisplayName: 'Ada',
      activityType: 'raid',
      activityName: 'Vault of Glass',
      goal: 'teaching_run',
      tags: [],
      platform: 'crossplay',
      micRequired: false,
      scoringEligible: true,
      maxPlayers: 6,
      currentPlayers: 2,
      status: 'open',
      createdAt: '2026-10-11T18:00:00.000Z',
    } as FireteamLobby
    const closed = { ...lobby, id: 'closed', status: 'closed' } as FireteamLobby

    const hub = assemblePublicHub({ now: NOW, runs: [prior, guided], lobbies: [lobby, closed] })

    expect(hub.sherpas[0]?.displayName).toBe('Guide')
    expect(hub.sherpas[0]?.guidedClears).toBe(1)
    expect(hub.clans[0]?.clanName).toBe('Nest')
    expect(hub.clans[0]?.recruitBonuses).toBe(1)
    expect(hub.fireteams).toEqual([
      expect.objectContaining({ id: 'room-1', goal: 'teaching run', status: 'open' }),
    ])
    expect(hub.topGuardians).toEqual([])
    expect(hub.featuredBuilds).toEqual([])
  })

  it('names the season raid leader and skips pantheon boards', () => {
    const raid = run({
      id: 'ranked',
      completedAt: '2026-10-08T18:00:00.000Z',
      ownerUserId: 'owner-1',
      ownerDisplayName: 'Nova',
      pointsAwarded: 10,
      type: 'raid',
    })
    const rows = topGuardiansFromRuns([raid], NOW)
    expect(rows.find((row) => row.board === 'raid')).toMatchObject({ displayName: 'Nova', rank: 1, points: 10 })
    expect(rows.map((row) => row.board)).not.toContain('pantheon')
  })

  it('keeps the homepage preview to five names on each board', () => {
    const raids = [1, 2, 3, 4, 5, 6].map((rank) =>
      run({
        id: `raid-${rank}`,
        completedAt: '2026-10-08T18:00:00.000Z',
        ownerUserId: `owner-${rank}`,
        ownerDisplayName: `Raider ${rank}`,
        pointsAwarded: 70 - rank,
        type: 'raid',
      })
    )
    const rows = topGuardiansFromRuns(raids, NOW).filter((row) => row.board === 'raid')
    expect(rows).toHaveLength(5)
    expect(rows.map((row) => row.displayName)).toEqual(['Raider 1', 'Raider 2', 'Raider 3', 'Raider 4', 'Raider 5'])
  })
})
