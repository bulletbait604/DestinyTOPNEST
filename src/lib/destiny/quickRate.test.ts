import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { QuickRateForm, RatePage } from '@/app/components/hub/QuickRate'
import type { StoredDestinyUser } from '@/lib/destiny/destinyUserStore'
import {
  RATE_TAGS,
  buildQuickRateWrite,
  normalizeRateNote,
  parseRateTags,
  pickSharedRun,
  rateTagLine,
  recentTeammatesFromRuns,
  resetQuickRateLimits,
  takeQuickRateLimit,
  toggleRateTag,
  trustFromTags,
} from '@/lib/destiny/quickRate'
import { computeCompositeTrustScore } from '@/lib/destiny/trustRank'
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
    expect(parseRateTags(['Chill', 'good comms', 'nope', 'chill', 'MVP', 'New Light'])).toEqual([
      'chill',
      'good_comms',
      'new_light',
    ])
    expect([...(RATE_TAGS as readonly string[])]).not.toContain('mvp')
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
      tags: ['chill'],
      now: '2026-10-23T00:00:00.000Z',
      runs: [],
      users: [ada],
    })
    expect(built.ok).toBe(true)
    if (!built.ok) return
    expect(built.draft.rating.tags).toEqual(['chill'])
    expect(built.draft.mvpVote).toBeUndefined()
    expect(built.draft.kudosVote).toBeUndefined()
    expect(built.draft.mvpStatus).toBe('skipped')
  })

  it('saves a sherpa rank without writing an MVP crown or kudos', () => {
    const shared = run('run-1', '2026-10-21T00:00:00.000Z')
    const built = buildQuickRateWrite({
      voterId: 'voter',
      voterMembershipId: '111',
      targetMembershipId: '222',
      targetDisplayName: 'Ada',
      targetSiteUserId: 'ada',
      tags: ['helpful', 'sherpa'],
      note: 'Patient callouts',
      now: '2026-10-23T00:00:00.000Z',
      runs: [shared],
      users: [ada],
    })
    expect(built.ok).toBe(true)
    if (!built.ok) return
    expect(built.draft.mvpVote).toBeUndefined()
    expect(built.draft.kudosVote).toBeUndefined()
    expect(built.draft.rating.tags).toEqual(['helpful', 'sherpa'])
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
      tags: ['clutch'],
      now: '2026-10-23T00:00:00.000Z',
      preferredRunId: 'run-old',
      runs: [older, newer],
      existingTrustRunIds: ['run-old'],
    })
    expect(built.ok).toBe(true)
    if (!built.ok) return
    expect(built.draft.trustReview).toBeUndefined()
    expect(built.draft.mvpVote).toBeUndefined()
    expect(built.draft.mvpStatus).toBe('skipped')
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
    const empty = buildQuickRateWrite({
      voterId: 'voter',
      voterMembershipId: '111',
      targetMembershipId: '222',
      targetDisplayName: 'Ada',
      tags: [],
      now: '2026-10-23T00:00:00.000Z',
      runs: [],
    })
    expect(empty.ok).toBe(false)
    if (empty.ok) return
    expect(empty.error).toContain('at least one tag')
  })

  it('maps tags onto the private commend scale', () => {
    expect(trustFromTags(['chill'])).toEqual({ knowledge: 3, vibes: 'good' })
    expect(trustFromTags([])).toBeNull()
    expect(trustFromTags(['new_light'])).toEqual({ knowledge: 2, vibes: 'new_light' })
    expect(trustFromTags(['useless'])).toEqual({ knowledge: 1, vibes: 'useless' })
    expect(computeCompositeTrustScore(1, 'useless')).toBe(1)
    expect(computeCompositeTrustScore(2, 'new_light')).toBe(2)
    expect(toggleRateTag(['new_light'], 'useless')).toEqual(['new_light', 'useless'])
    expect(toggleRateTag(['new_light', 'useless'], 'useless')).toEqual(['new_light'])
    expect(
      rateTagLine({ sherpa: 1, clutch: 0, helpful: 0, chill: 2, good_comms: 0, new_light: 1, useless: 0 })
    ).toBe('Sherpa / Teacher 1 · Chill 2 · New Light 1')
  })

  it('limits how fast one voter can submit', () => {
    resetQuickRateLimits()
    for (let i = 0; i < 30; i += 1) expect(takeQuickRateLimit({ userId: 'voter', now: 1_000 + i }).ok).toBe(true)
    expect(takeQuickRateLimit({ userId: 'voter', now: 2_000 }).ok).toBe(false)
  })

  it('keeps New Light and Useless on the guardian rank, not an MVP vote', () => {
    const saved = buildQuickRateWrite({
      voterId: 'voter',
      voterMembershipId: '111',
      targetMembershipId: '222',
      targetDisplayName: 'Ada',
      tags: ['new_light', 'useless'],
      now: '2026-10-23T00:00:00.000Z',
      runs: [run('run-1', '2026-10-20T00:00:00.000Z')],
      users: [ada],
    })
    expect(saved.ok).toBe(true)
    if (!saved.ok) return
    expect(saved.draft.mvpVote).toBeUndefined()
    expect(saved.draft.kudosVote).toBeUndefined()
    expect(saved.draft.rating.tags).toEqual(['new_light', 'useless'])
    expect(saved.draft.trustReview?.vibes).toBe('useless')
    expect(saved.draft.trustReview?.knowledge).toBe(1)
  })

  it('shows guardian ranks in one click and keeps MVP on its own crown', () => {
    const signedOut = renderToStaticMarkup(
      createElement(QuickRateForm, {
        signedIn: false,
        target: { membershipId: '222', displayName: 'Ada' },
      })
    )
    expect(signedOut).toContain('Sherpa / Teacher')
    expect(signedOut).toContain('New Light')
    expect(signedOut).toContain('Useless')
    expect(signedOut).toContain('Sign in with Bungie to rank this Guardian')
    expect(signedOut).not.toContain('Cast MVP Vote')
    expect(signedOut).not.toContain('>MVP<')

    const page = renderToStaticMarkup(createElement(RatePage))
    expect(page).toContain('Crown Run MVP (1 per run)')
    expect(page).toContain('Rank a Guardian')
    expect(page).toContain('New Light')
    expect(page).toContain('Useless')
    expect(page).toContain('Great Comms')
    expect(page).toContain('Search')
    expect(page).not.toContain('Choose MVP, New Light, or Useless')
  })
})
