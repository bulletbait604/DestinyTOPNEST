import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import PassportPanel from '@/app/components/destiny/PassportPanel'
import { evaluatePassport, type FireteamViewer } from '@/lib/destiny/passport'
import type { RunRecord, RunTeamMember } from '@/lib/destiny/types'
import { evaluateWeeklyContracts } from '@/lib/destiny/weeklyContracts'

const viewer: FireteamViewer = {
  userId: 'user-me',
  membershipId: 'me',
  clanId: 'clan-a',
  displayName: 'Me',
}

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
    activityId: 42,
    activityName: 'Duality',
    type: 'dungeon',
    difficulty: 'normal',
    durationSeconds: 800,
    completed: true,
    checkpointLikely: false,
    teamMembers: [
      member('me', { displayName: 'Me' }),
      member('ada', { displayName: 'Ada' }),
      member('bob', { displayName: 'Bob' }),
    ],
    clanMemberCount: 1,
    randoCount: 1,
    isFullClanTeam: false,
    suspiciousScore: 0,
    verificationStatus: 'verified',
    pointsAwarded: 5,
    ownerUserId: 'user-me',
    ...partial,
  }
}

describe('passport profile markup', () => {
  it('renders the collection, teammate count, and weekly contract', () => {
    const clear = run({ id: 'clear', completedAt: '2026-10-14T12:00:00.000Z' })
    const passport = evaluatePassport([clear], viewer)
    const weeklyContracts = evaluateWeeklyContracts({
      runs: [
        run({
          id: 'prior',
          pgcrId: 'prior',
          completedAt: '2026-10-02T18:00:00.000Z',
          ownerUserId: 'other',
          teamMembers: [
            member('sherpa'),
            member('ada', { displayName: 'Ada' }),
            member('bob', { displayName: 'Bob' }),
          ],
        }),
        clear,
      ],
      viewer,
      now: new Date('2026-10-14T18:00:00.000Z'),
      season: { startDate: '2026-10-01T17:00:00.000Z', endDate: '2026-10-31T23:59:59.999Z' },
      featuredDungeonsAt: () => ['Duality'],
    })

    const html = renderToStaticMarkup(
      createElement(PassportPanel, { passport, weeklyContracts, darkMode: true })
    )

    expect(html).toContain('Fireteam Passport')
    expect(html).toContain('Duality — First stamp')
    expect(html).toContain('Distinct teammates')
    expect(html).toContain('Featured dungeon, new faces')
    expect(html).toContain('Contract Runner')
    expect(passport.distinctTeammates).toBe(2)
  })
})