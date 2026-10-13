import { describe, expect, it } from 'vitest'
import { pickNewFriendCandidates, rankLobbiesForNewBonds } from './lfgSuggestions'
import type { FireteamLobby } from './types'

const lobby = (id: string, host: string, members: string[], extra: Partial<FireteamLobby> = {}) =>
  ({
    id,
    hostUserId: host,
    hostDisplayName: host,
    activityType: 'raid',
    activityName: 'Vault of Glass',
    goal: 'clear',
    tags: [],
    platform: 'crossplay',
    micRequired: false,
    scoringEligible: true,
    maxPlayers: 6,
    currentPlayers: 1 + members.length,
    status: 'open',
    createdAt: new Date().toISOString(),
    memberUserIds: members,
    ...extra,
  }) as FireteamLobby

describe('LFG new-friend ranking', () => {
  it('ranks rooms with more strangers first and skips own/full-joined rooms', () => {
    const ranked = rankLobbiesForNewBonds(
      [lobby('known', 'friend', ['friend2']), lobby('fresh', 'x', ['y', 'z']), lobby('mine', 'me', [])],
      'me',
      new Set(['friend', 'friend2'])
    )
    expect(ranked.map((r) => r.lobby.id)).toEqual(['fresh', 'known'])
    expect(ranked[0]!.newFaces).toBe(3)
  })
  it('penalises full rooms', () => {
    const ranked = rankLobbiesForNewBonds([lobby('full', 'a', ['b', 'c', 'd', 'e', 'f']), lobby('open', 'g', [])], 'me', new Set())
    expect(ranked[0]!.lobby.id).toBe('open')
  })
  it('suggests unbonded recent players', () => {
    const c = pickNewFriendCandidates(
      [
        { userId: 'u1', bungieMembershipId: '1', bungieDisplayName: 'A', updatedAt: '2026-10-10' },
        { userId: 'u2', bungieMembershipId: '2', bungieDisplayName: 'B', updatedAt: '2026-10-12' },
        { userId: 'me', bungieMembershipId: 'me', bungieDisplayName: 'Me' },
      ],
      'me',
      new Set(['1'])
    )
    expect(c.map((x) => x.membershipId)).toEqual(['2'])
  })
})
