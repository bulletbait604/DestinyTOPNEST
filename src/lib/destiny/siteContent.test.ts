import { describe, expect, it } from 'vitest'
import { normalizeEvents, normalizePrizeCopy, normalizeWeeklyGoals, SiteContentError } from '@/lib/destiny/siteContent'

describe('site content editors', () => {
  it('accepts a weekly goal written as form fields', () => {
    const goals = normalizeWeeklyGoals([
      {
        title: 'Teach a raid',
        description: 'Clear a raid with someone on their first clear.',
        tierPoints: 12,
        rule: { kind: 'help_first_timer' },
      },
    ])
    expect(goals[0]?.id).toBe('teach-a-raid')
    expect(goals[0]?.tierPoints).toBe(12)
    expect(goals[0]?.rule).toEqual({ kind: 'help_first_timer' })
  })

  it('rejects a goal without a title or with tier points out of range', () => {
    expect(() => normalizeWeeklyGoals([{ title: '  ', description: 'x', tierPoints: 1, rule: { kind: 'raid_mixed_clan' } }])).toThrow(
      SiteContentError
    )
    expect(() =>
      normalizeWeeklyGoals([
        { title: 'Too many', description: 'points', tierPoints: 500, rule: { kind: 'raid_mixed_clan' } },
      ])
    ).toThrow(/0 to 100/)
  })

  it('rejects an event whose watch link is not https', () => {
    expect(() =>
      normalizeEvents([
        {
          title: 'Raid night',
          hostName: 'Ada',
          startsAt: '2026-10-20T17:00:00.000Z',
          endsAt: '2026-10-20T20:00:00.000Z',
          twitchUrl: 'http://twitch.tv/ada',
        },
      ])
    ).toThrow(/https/)
  })

  it('keeps a valid event and drops blank optional fields', () => {
    const events = normalizeEvents([
      {
        id: 'raid-night',
        title: 'Raid night',
        hostName: 'Ada',
        startsAt: '2026-10-20T17:00:00.000Z',
        endsAt: '2026-10-20T20:00:00.000Z',
        activityName: '  ',
        twitchUrl: 'https://www.twitch.tv/ada',
      },
    ])
    expect(events[0]).toMatchObject({
      id: 'raid-night',
      title: 'Raid night',
      twitchUrl: 'https://www.twitch.tv/ada',
    })
    expect(events[0]?.activityName).toBeUndefined()
  })

  it('requires every prize name', () => {
    expect(() => normalizePrizeCopy({ physicalPrize: 'A print' })).toThrow(/Fill in/)
    const copy = normalizePrizeCopy({
      physicalPrize: 'Destiny 2 3D print',
      giftCardPrize: '$50 CAD Steam gift card',
      cardLabel: '3D print or Steam card',
      firstPlace: 'Destiny 2 3D print or Steam card',
    })
    expect(copy.cardLabel).toBe('3D print or Steam card')
  })
})
