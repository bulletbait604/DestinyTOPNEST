import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import SeasonHall from '@/app/components/destiny/SeasonHall'

describe('Season Hall of Fame', () => {
  it('says what the hall is, who is listed, and why, including an empty board', () => {
    const html = renderToStaticMarkup(
      createElement(SeasonHall, {
        season: {
          name: 'Season of New Bonds',
          seasonNumber: 1,
          startDate: '2026-10-01T07:00:00.000Z',
          endDate: '2027-01-01T08:00:00.000Z',
        },
        winners: [
          {
            category: 'raid',
            rank: 1,
            displayName: 'Ada',
            clanTag: 'NEST',
            prize: 'Destiny 2 3D print',
            seasonId: 's1',
          },
        ],
      })
    )
    expect(html).toContain('Season Hall of Fame')
    expect(html).toContain('top three')
    expect(html).toContain('not the teachers list')
    expect(html).toContain('Raid board')
    expect(html).toContain('New friends board')
    expect(html).toContain('Ada')
    expect(html).toContain('Prize leader')
    expect(html).toContain('No verified clears on this board yet')
    expect(html.toLowerCase()).not.toContain('pantheon')
  })
})
