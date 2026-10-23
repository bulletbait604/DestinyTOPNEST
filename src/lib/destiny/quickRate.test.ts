import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { QuickRateForm, RatePage } from '@/app/components/hub/QuickRate'
import type { StoredDestinyUser } from '@/lib/destiny/destinyUserStore'
import {
  buildQuickRateWrite,
  normalizeRateNote,
  parseRateTags,
  pickSharedRun,
  rateTagLine,
  recentTeammatesFromRuns,
  resetQuickRateLimits,
  takeQuickRateLimit,
  trustFromTags,
} from '@/lib/destiny/quickRate'
import type { RunRecord, RunTeamMember } from '@/lib/destiny/types'

function member(id: string, name: string): RunTeamMember {
  return {
    membershipId: id,
    displayName: name,
    platform: 'steam',
    characterClass: 'hunter',
    kills: 1,
    deaths: 0,
    assists: 1,
    score: 10,
    powerLevel: 2000,
  }
}

function run(id: string, completedAt: string, status: RunRecord['verificationStatus'] = 'verified'): RunRecord {
  return {
    id,
    pgcrId: id,
    activityId: 1,
    activityName: 'Vault of Glass',
    type: 'raid',
    difficulty: 'normal',
    completedAt,
    durationSeconds: 1200,
    completed: true,
    checkpointLikely: false,
    teamMembers: [member('111', 'Voter'), member('222', 'Ada')],
    clanMemberCount: 0,
    randoCount: 2,
    isFullClanTeam: false,
    suspiciousScore: 0,
    verificationStatus: status,
    pointsAwarded: 10,
    ownerUserId: 'voter',
    ownerMembershipId: '111',
  }
}

const ada: StoredDestinyUser = {
  userId: 'ada',
  bungieMembershipId: '222',
  bungieDisplayName: 'Ada-1',
  platform: 'steam',
}

describe('quick guardian rating', () => {
  it('keeps known tags and a single short note', () => {
    expect(parseRateTags(['Chill', 'good comms', 'nope', 'chill', 'MVP'])).toEqual([
      'chill',
      'good_comms',
      'mvp',
    ])
    expect(normalizeRateNote('  clutch\nplay ')).toBe('clutch play')
    expect(normalizeRateNote('x'.repeat(140))?.length).toBe(120)
    expect(normalizeRateNote('   ')).toBeUndefined()
  })

  it('lists recent teammates and skips yourself', () => {
    const teammates = recentTeammatesFromRuns(
      [run('old', '2026-10-02T00:00:00.000Z', 'pending'), run('new', '2026-10-20T00:00:00.000Z')],
      '111'
    )
    expect(teammates).toEqual([{ membershipId: '222', displayName: 'Ada' }])
  })

  it('saves positive tags without inventing an MVP crown', () => {
    const built = buildQuickRateWrite({
      voterId: 'voter',
      voterMembershipId: '111',
      targetMembershipId: '222',
      targetDisplayName: 'Ada',
      targetSiteUserId: 'ada',
      tags: ['chill', 'mvp'],
      now: '2026-10-23T00:00:00.000Z',
      runs: [],
      users: [ada],
    })
    expect(built.ok).toBe(true)
    if (!built.ok) return
    expect(built.draft.rating.tags).toEqual(['chill'])
    expect(built.draft.mvpVote).toBeUndefined()
    expect(built.draft.mvpStatus).toBe('needs_run')
    expect(built.draft.message).toContain('clear together')
  })

  it('writes the MVP and kudos onto the shared clear membership id', () => {
    const shared = run('run-1', '2026-10-21T00:00:00.000Z')
    const built = buildQuickRateWrite({
      voterId: 'voter',
      voterMembershipId: '111',
      targetMembershipId: '222',
      targetDisplayName: 'Ada',
      targetSiteUserId: 'ada',
      tags: ['helpful', 'sherpa', 'mvp'],
      note: 'Patient callouts',
      now: '2026-10-23T00:00:00.000Z',
      runs: [shared],
      users: [ada],
    })
    expect(built.ok).toBe(true)
    if (!built.ok) return
    expect(built.draft.mvpVote?.selectedMembershipId).toBe('222')
    expect(built.draft.mvpVote?.id).toBe('mvp-voter-run-1')
    expect(built.draft.kudosVote?.id).toBe('kudos-voter-run-1-222')
    expect(built.draft.trustReview?.vibes).toBe('sherpa')
    expect(built.draft.trustReview?.knowledge).toBe(5)
    expect(built.draft.reputationReview?.notes).toBe('Patient callouts')
    expect(built.draft.reputationReview?.teaching).toBe(5)
    expect(built.draft.rating.targetMembershipId).toBe('222')
  })

  it('uses the requested clear and leaves an existing private rank alone', () => {
    const older = run('run-old', '2026-10-10T00:00:00.000Z')
    const newer = run('run-new', '2026-10-22T00:00:00.000Z')
    expect(pickSharedRun([older, newer], 'voter', '111', '222', 'run-old')?.id).toBe('run-old')
    const built = buildQuickRateWrite({
      voterId: 'voter',
      voterMembershipId: '111',
      targetMembershipId: '222',
      targetDisplayName: 'Ada',
      tags: ['clutch', 'mvp'],
      now: '2026-10-23T00:00:00.000Z',
      preferredRunId: 'run-old',
      runs: [older, newer],
      existingTrustRunIds: ['run-old'],
      existingMvpMembershipId: '222',
    })
    expect(built.ok).toBe(true)
    if (!built.ok) return
    expect(built.draft.trustReview).toBeUndefined()
    expect(built.draft.mvpStatus).toBe('already')
    expect(built.draft.rating.mvpRunId).toBe('run-old')
  })

  it('refuses a self rating and an MVP with no shared clear', () => {
    const self = buildQuickRateWrite({
      voterId: 'voter',
      voterMembershipId: '111',
      targetMembershipId: '111',
      targetDisplayName: 'Voter',
      tags: ['chill'],
      now: '2026-10-23T00:00:00.000Z',
      runs: [],
    })
    expect(self.ok).toBe(false)
    const mvpOnly = buildQuickRateWrite({
      voterId: 'voter',
      voterMembershipId: '111',
      targetMembershipId: '222',
      targetDisplayName: 'Ada',
      tags: ['mvp'],
      now: '2026-10-23T00:00:00.000Z',
      runs: [],
    })
    expect(mvpOnly.ok).toBe(false)
    if (mvpOnly.ok) return
    expect(mvpOnly.error).toContain('MVP votes count')
  })

  it('maps tags onto the private commend scale', () => {
    expect(trustFromTags(['chill'])).toEqual({ knowledge: 3, vibes: 'good' })
    expect(trustFromTags(['mvp'])).toBeNull()
    expect(rateTagLine({ chill: 2, helpful: 0, sherpa: 1, clutch: 0, good_comms: 0, mvp: 4 })).toBe(
      'Chill 2 · Sherpa / Teacher 1'
    )
  })

  it('limits how fast one voter can submit', () => {
    resetQuickRateLimits()
    for (let i = 0; i < 30; i += 1) expect(takeQuickRateLimit({ userId: 'voter', now: 1_000 + i }).ok).toBe(true)
    expect(takeQuickRateLimit({ userId: 'voter', now: 2_000 }).ok).toBe(false)
  })

  it('shows one MVP button and the sign-in line', () => {
    const signedOut = renderToStaticMarkup(
      createElement(QuickRateForm, {
        signedIn: false,
        target: { membershipId: '222', displayName: 'Ada' },
      })
    )
    expect(signedOut).toContain('Vote MVP')
    expect(signedOut).toContain('Sign in with Bungie to submit your vote')
    expect(signedOut).not.toContain('Cast MVP Vote')
    expect(signedOut).not.toContain('Sherpa / Teacher')
    expect(signedOut).not.toContain('Optional one-line note')

    const page = renderToStaticMarkup(createElement(RatePage))
    expect(page).toContain('Vote MVP')
    expect(page).toContain('Search')
    expect(page).not.toContain('Great Comms')
  })
})
