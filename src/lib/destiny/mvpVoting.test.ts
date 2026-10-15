import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ActivityFireteamVoteList } from '@/app/components/destiny/PreviousActivitiesSection'
import type { StoredDestinyUser } from '@/lib/destiny/destinyUserStore'
import { usersByMembershipMap } from '@/lib/destiny/fireteamReputation'
import { aggregateLeaderboard } from '@/lib/destiny/leaderboards'
import {
  buildActivityRunsForVote,
  guardianVoteState,
  kudosVoteId,
  mvpVoteId,
  mvpVotesReceivedQuery,
  parseMvpVoteCategory,
  resolveVoteTargetMembershipId,
  unclaimedVoteAttachmentQuery,
  validateMvpVoteSubmission,
} from '@/lib/destiny/mvpVoting'
import { resetMvpVoteRateLimits, takeMvpVoteRateLimit } from '@/lib/destiny/mvpVoteRateLimit'
import { buildPendingPlayer } from '@/lib/destiny/pendingPlayers'
import { computePendingRunActions } from '@/lib/destiny/pendingRunActions'
import type { MvpVote, RunRecord, RunTeamMember, Season } from '@/lib/destiny/types'

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

function run(partial: Partial<RunRecord> & Pick<RunRecord, 'id'>): RunRecord {
  return {
    pgcrId: partial.pgcrId ?? partial.id,
    activityId: 100,
    activityName: 'Vault of Glass',
    type: 'raid',
    difficulty: 'normal',
    completedAt: '2026-10-08T18:00:00.000Z',
    durationSeconds: 1800,
    completed: true,
    checkpointLikely: false,
    teamMembers: [member('me', { displayName: 'Voter' }), member('ada', { displayName: 'Ada' }), member('bex', { displayName: 'Bex' })],
    clanMemberCount: 1,
    randoCount: 2,
    isFullClanTeam: false,
    suspiciousScore: 0,
    verificationStatus: 'verified',
    pointsAwarded: 10,
    ownerUserId: 'voter',
    ownerMembershipId: 'me',
    ...partial,
  }
}

function user(partial: Partial<StoredDestinyUser> & Pick<StoredDestinyUser, 'userId' | 'bungieMembershipId'>): StoredDestinyUser {
  return {
    bungieDisplayName: partial.bungieDisplayName ?? partial.userId,
    platform: 'steam',
    ...partial,
  }
}

const season = {
  id: 'season',
  name: 'Season',
  startDate: '2026-10-01T00:00:00.000Z',
  endDate: '2026-12-31T00:00:00.000Z',
  status: 'active',
  prizeRules: {
    raid: { first: '', second: '', thirdToFifth: '', participation: '' },
    dungeon: { first: '', second: '', thirdToFifth: '', participation: '' },
  },
} as Season

describe('fireteam MVP votes', () => {
  const runs = [run({ id: 'run-1' })]
  const linkedAda = user({ userId: 'ada-user', bungieMembershipId: 'ada', bungieDisplayName: 'Ada Nest' })

  it('lets a voter crown any other carnage-report guardian, including someone who has not joined', () => {
    const validation = validateMvpVoteSubmission({
      voterId: 'voter',
      voterMembershipId: 'me',
      targetMembershipId: 'ada',
      category: 'mvp',
      runId: 'run-1',
      runs,
      usersByMembership: usersByMembershipMap([]),
    })
    expect(validation.ok).toBe(true)
    if (!validation.ok) return
    expect(validation.pending).toBe(true)
    expect(validation.target.membershipId).toBe('ada')
    expect(validation.target.siteUserId).toBeUndefined()
    expect(validation.target.displayName).toBe('Ada')

    const activities = buildActivityRunsForVote('voter', 'me', runs, [], [])
    const ada = activities[0]?.guardians.find((guardian) => guardian.membershipId === 'ada')
    expect(ada?.canVoteFor).toBe(true)
    expect(ada?.siteUserId).toBeUndefined()
    expect(guardianVoteState(activities[0]!, ada!).mvpButton).toBe('vote')
    expect(guardianVoteState(activities[0]!, ada!).kudosButton).toBe('give')
  })

  it('keeps a linked guardian addressable by membership id and allows the crown to move', () => {
    const first = validateMvpVoteSubmission({
      voterId: 'voter',
      voterMembershipId: 'me',
      targetMembershipId: 'ada',
      category: 'mvp',
      runId: 'run-1',
      runs,
      usersByMembership: usersByMembershipMap([linkedAda]),
    })
    const second = validateMvpVoteSubmission({
      voterId: 'voter',
      voterMembershipId: 'me',
      targetMembershipId: 'bex',
      category: 'mvp',
      runId: 'run-1',
      runs,
      usersByMembership: usersByMembershipMap([linkedAda]),
    })
    expect(first.ok && second.ok).toBe(true)
    if (!first.ok || !second.ok) return
    expect(first.target.siteUserId).toBe('ada-user')
    expect(first.pending).toBe(false)
    expect(second.target.membershipId).toBe('bex')
    expect(second.pending).toBe(true)

    const crowned: MvpVote = {
      id: mvpVoteId('voter', 'run-1'),
      runId: 'run-1',
      voterId: 'voter',
      category: 'mvp',
      selectedMembershipId: 'ada',
      selectedUserId: 'ada-user',
      selectedDisplayName: 'Ada Nest',
      createdAt: '2026-10-08T19:00:00.000Z',
    }
    const [activity] = buildActivityRunsForVote('voter', 'me', runs, [linkedAda], [crowned])
    const ada = activity?.guardians.find((guardian) => guardian.membershipId === 'ada')
    const bex = activity?.guardians.find((guardian) => guardian.membershipId === 'bex')
    expect(activity?.userHasVoted).toBe(true)
    expect(activity?.selectedMembershipId).toBe('ada')
    expect(guardianVoteState(activity!, ada!).showMvpBadge).toBe(true)
    expect(guardianVoteState(activity!, ada!).mvpButton).toBe('hidden')
    expect(guardianVoteState(activity!, bex!).mvpButton).toBe('change')
  })

  it('allows one kudos per other participant without counting it as the MVP', () => {
    const kudos: MvpVote = {
      id: kudosVoteId('voter', 'run-1', 'bex'),
      runId: 'run-1',
      voterId: 'voter',
      category: 'kudos',
      selectedMembershipId: 'bex',
      selectedDisplayName: 'Bex',
      createdAt: '2026-10-08T19:00:00.000Z',
    }
    const again = validateMvpVoteSubmission({
      voterId: 'voter',
      voterMembershipId: 'me',
      targetMembershipId: 'bex',
      category: 'kudos',
      action: 'set',
      runId: 'run-1',
      runs,
      usersByMembership: new Map(),
    })
    expect(again.ok).toBe(true)
    const [activity] = buildActivityRunsForVote('voter', 'me', runs, [], [kudos])
    expect(activity?.userHasVoted).toBe(false)
    expect(activity?.kudosMembershipIds).toEqual(['bex'])
    const bex = activity?.guardians.find((guardian) => guardian.membershipId === 'bex')
    const ada = activity?.guardians.find((guardian) => guardian.membershipId === 'ada')
    expect(guardianVoteState(activity!, bex!).kudosButton).toBe('clear')
    expect(guardianVoteState(activity!, ada!).kudosButton).toBe('give')
    expect(kudosVoteId('voter', 'run-1', 'bex')).toBe('kudos-voter-run-1-bex')
  })

  it('rejects a self vote and anyone who was not on the carnage report', () => {
    const self = validateMvpVoteSubmission({
      voterId: 'voter',
      voterMembershipId: 'me',
      targetMembershipId: 'me',
      category: 'mvp',
      runId: 'run-1',
      runs,
      usersByMembership: new Map(),
    })
    expect(self.ok).toBe(false)
    if (!self.ok) expect(self.error).toMatch(/yourself/i)

    const outsiderRun = [run({ id: 'run-1', ownerUserId: 'voter', teamMembers: [member('ada'), member('bex')] })]
    const notOnReport = validateMvpVoteSubmission({
      voterId: 'voter',
      voterMembershipId: 'me',
      targetMembershipId: 'ada',
      category: 'mvp',
      runId: 'run-1',
      runs: outsiderRun,
      usersByMembership: new Map(),
    })
    expect(notOnReport.ok).toBe(false)
    if (!notOnReport.ok) expect(notOnReport.error).toMatch(/carnage report/i)

    const missingTarget = validateMvpVoteSubmission({
      voterId: 'voter',
      voterMembershipId: 'me',
      targetMembershipId: 'not-there',
      category: 'kudos',
      runId: 'run-1',
      runs,
      usersByMembership: new Map(),
    })
    expect(missingTarget.ok).toBe(false)
    if (!missingTarget.ok) expect(missingTarget.error).toMatch(/carnage report/i)

    const clearMvp = validateMvpVoteSubmission({
      voterId: 'voter',
      voterMembershipId: 'me',
      targetMembershipId: 'ada',
      category: 'mvp',
      action: 'clear',
      runId: 'run-1',
      runs,
      usersByMembership: new Map(),
    })
    expect(clearMvp.ok).toBe(false)
  })

  it('still treats a missing MVP as pending when the only teammates are unregistered', () => {
    const pending = computePendingRunActions('voter', 'me', runs, [], [], [])
    expect(pending.mvpRunCount).toBe(1)
    const voted = computePendingRunActions(
      'voter',
      'me',
      runs,
      [],
      [
        {
          id: mvpVoteId('voter', 'run-1'),
          runId: 'run-1',
          voterId: 'voter',
          selectedMembershipId: 'ada',
          selectedDisplayName: 'Ada',
          createdAt: '2026-10-08T19:00:00.000Z',
        },
      ],
      []
    )
    expect(voted.mvpRunCount).toBe(0)
  })

  it('resolves a legacy selected user id to that guardian’s membership id', () => {
    const resolved = resolveVoteTargetMembershipId({
      selectedUserId: 'Ada-User',
      usersByMembership: usersByMembershipMap([linkedAda]),
    })
    expect(resolved).toEqual({ ok: true, membershipId: 'ada' })
    expect(parseMvpVoteCategory(undefined)).toBe('mvp')
    expect(parseMvpVoteCategory('nope')).toBeNull()
  })

  it('does not let an unclaimed placeholder satisfy a linked-account lookup', () => {
    const placeholder = user({
      userId: 'pending:ada',
      bungieMembershipId: 'ada',
      bungieDisplayName: 'Ada',
      accountStatus: 'pending',
    })
    const [activity] = buildActivityRunsForVote('voter', 'me', runs, [placeholder], [])
    const ada = activity?.guardians.find((guardian) => guardian.membershipId === 'ada')
    expect(ada?.siteUserId).toBeUndefined()
    expect(ada?.canVoteFor).toBe(true)
    expect(usersByMembershipMap([placeholder]).has('ada')).toBe(false)
  })

  it('keys received-vote queries by Bungie membership id', () => {
    expect(mvpVotesReceivedQuery('Ada-User', ' 4611686018427387904 ', 'mvp')).toMatchObject({
      $and: [
        { $or: [{ selectedMembershipId: '4611686018427387904' }, { selectedUserId: 'ada-user' }] },
        { $or: [{ category: 'mvp' }, { category: { $exists: false } }, { category: null }] },
      ],
    })
    expect(unclaimedVoteAttachmentQuery('4611686018427387904').selectedMembershipId).toBe('4611686018427387904')
    const placeholder = buildPendingPlayer(
      { membershipId: '4611686018427387904', displayName: 'New Light', platform: 'steam', characterClass: 'warlock' },
      '2026-10-08T19:00:00.000Z'
    )
    expect(placeholder.bungieMembershipId).toBe('4611686018427387904')
    expect(placeholder.source).toBe('pgcr')
    expect('userId' in placeholder).toBe(false)
    expect(() => buildPendingPlayer({ membershipId: '  ', displayName: 'x' }, '2026-10-08T19:00:00.000Z')).toThrow(
      /membership id/i
    )
  })

  it('renders a vote for every other fireteam member', () => {
    const [activity] = buildActivityRunsForVote('voter', 'me', runs, [], [])
    const html = renderToStaticMarkup(
      createElement(ActivityFireteamVoteList, {
        run: activity!,
        darkMode: true,
        votingKey: null,
        onVote: () => undefined,
      })
    )
    expect(html).toContain('Vote MVP')
    expect(html).toContain('Kudos')
    expect(html).toContain('not on Top Nest yet')
    expect(html).toContain('Ada')
    expect(html).toContain('Bex')
    expect(html).not.toContain('No linked Top Nest')
  })
})

describe('mvp vote rate limit', () => {
  it('blocks a burst and allows another player after the window', () => {
    resetMvpVoteRateLimits()
    const start = 1_700_000_000_000
    for (let i = 0; i < 60; i += 1) {
      expect(takeMvpVoteRateLimit({ userId: 'Voter', now: start + i }).ok).toBe(true)
    }
    const blocked = takeMvpVoteRateLimit({ userId: 'voter', now: start + 61 })
    expect(blocked.ok).toBe(false)
    if (!blocked.ok) expect(blocked.retryAfterSec).toBeGreaterThan(0)
    expect(takeMvpVoteRateLimit({ userId: 'other', now: start }).ok).toBe(true)
    expect(takeMvpVoteRateLimit({ userId: 'voter', now: start + 10 * 60 * 1000 + 62 }).ok).toBe(true)
  })
})

describe('leaderboards ignore unclaimed players', () => {
  it('skips runs owned by a pending placeholder and still ranks claimed players', () => {
    const rows = aggregateLeaderboard(
      [
        run({ id: 'real', ownerUserId: 'ada', pointsAwarded: 10, type: 'raid' }),
        run({ id: 'ghost-run', ownerUserId: 'ghost', pointsAwarded: 40, type: 'raid' }),
        run({ id: 'unknown', ownerUserId: 'stranger', pointsAwarded: 4, type: 'raid' }),
      ],
      new Map([
        ['ada', user({ userId: 'ada', bungieMembershipId: 'ada', bungieDisplayName: 'Ada' })],
        [
          'ghost',
          user({
            userId: 'ghost',
            bungieMembershipId: 'ghost',
            bungieDisplayName: 'Ghost',
            accountStatus: 'pending',
          }),
        ],
      ]),
      'raid',
      'all_time',
      season
    )
    expect(rows.map((row) => row.userId)).toEqual(['ada', 'stranger'])
    expect(rows.find((row) => row.userId === 'ghost')).toBeUndefined()
  })
})
