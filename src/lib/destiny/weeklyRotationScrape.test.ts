import { describe, expect, it } from 'vitest'
import { alignScrapedSelection, htmlToPlainText, parseWeeklyResetText, selectRedditResetPost } from '@/lib/destiny/weeklyRotationScrape'

const OCT_14 = new Date('2026-10-14T12:00:00.000Z')

const RESET_POST = `
# [D2] Weekly Reset Thread [2026-10-13]

# Vanguard Alert - Grandmaster: Warden of Nothing

## Featured PvE Activities

- Raid: **Vow of the Disciple, Last Wish**

- Dungeon: **Prophecy, Vesper's Host**
`

describe('weekly reset post parser', () => {
  it('pins the 13 Oct 2026 reset post to Vow, Last Wish, Prophecy, and Vesper\'s Host', () => {
    const parsed = parseWeeklyResetText(RESET_POST)
    expect(parsed?.raids).toEqual(['Vow of the Disciple', 'Last Wish'])
    expect(parsed?.dungeons).toEqual(['Prophecy', "Vesper's Host"])
    expect(parsed?.nightfall).toBe('Warden of Nothing')
  })

  it('reads a featured card and keeps Prophecy before Vesper\'s Host', () => {
    const text = htmlToPlainText(`
      <h2>Featured Raids and Dungeons</h2>
      <p>Raid Challenges</p>
      <span>Featured Pantheon</span><strong>Argos + Morgeth</strong>
      <span>Featured Raids</span><strong>Vow of the Disciple + Last Wish</strong>
      <span>Featured Dungeons</span><strong>Vesper&#8217;s Host + Prophecy</strong>
      <span>Grandmaster</span><strong>Warden of Nothing</strong>
    `)
    const parsed = parseWeeklyResetText(text)
    expect(parsed?.raids).toEqual(['Vow of the Disciple', 'Last Wish'])
    expect(parsed?.dungeons).toEqual(["Vesper's Host", 'Prophecy'])
    expect(parsed?.pantheon).toBe('Argos · Morgeth')
    expect(parsed?.nightfall).toBe('Warden of Nothing')
    expect(alignScrapedSelection(parsed!, OCT_14).dungeons).toEqual(['Prophecy', "Vesper's Host"])
  })

  it('keeps pantheon bosses that are not raids', () => {
    const parsed = parseWeeklyResetText(`${RESET_POST}\n- Pantheon: **Argos + Morgeth**`)
    expect(parsed?.pantheon).toBe('Argos · Morgeth')
    expect(parsed?.raids).toEqual(['Vow of the Disciple', 'Last Wish'])
  })

  it('selects the reddit thread whose title is this reset', () => {
    const text = selectRedditResetPost(
      {
        data: {
          children: [
            {
              data: {
                title: '[D2] Weekly Reset Thread [2026-10-06]',
                selftext: '- Raid: **Vault of Glass, Salvation\'s Edge**\n- Dungeon: **Warlord\'s Ruin, Pit of Heresy**',
                created_utc: Date.parse('2026-10-06T17:05:00.000Z') / 1000,
              },
            },
            {
              data: {
                title: '[D2] Weekly Reset Thread [2026-10-13]',
                selftext: RESET_POST,
                created_utc: Date.parse('2026-10-13T17:05:00.000Z') / 1000,
              },
            },
          ],
        },
      },
      OCT_14
    )
    expect(text).toContain('2026-10-13')
    expect(parseWeeklyResetText(text ?? '')?.raids).toEqual(['Vow of the Disciple', 'Last Wish'])
  })
})
