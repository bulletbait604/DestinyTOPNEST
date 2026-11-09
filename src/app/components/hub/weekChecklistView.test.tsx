import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { WeekChecklistView, weekViewFromSnapshot } from '@/app/components/hub/WeekChecklist'
import { assemblePublicHub } from '@/lib/destiny/publicHub'
import { WEEK_CLEAR_NOTE } from '@/lib/destiny/weekChecklist'

describe('week checklist view', () => {
  const snapshot = assemblePublicHub({
    now: new Date('2026-11-09T12:00:00.000Z'),
    runs: [],
    lobbies: [],
  })

  it('shows the four featured activities and does not invent clears while signed out', () => {
    const model = weekViewFromSnapshot(snapshot, false)
    const html = renderToStaticMarkup(createElement(WeekChecklistView, { model, onLogin: () => undefined }))
    expect(html).toContain('This week')
    expect(html).toContain(WEEK_CLEAR_NOTE)
    expect(html).toContain('Sign in to check your clears')
    expect(html).toContain('Not checked')
    expect(html).not.toContain('>Cleared<')
    for (const name of [...snapshot.featuredRaids, ...snapshot.featuredDungeons]) {
      expect(html).toContain(name.replace(/'/g, '&#x27;'))
    }
    expect(html).toContain('href="/passport"')
    expect(html).toContain('Raid')
    expect(html).toContain('Dungeon')
  })

  it('shows a real clear and an honest gap once history has been checked', () => {
    const base = weekViewFromSnapshot(snapshot, true)
    const first = base.activities[0]
    const second = base.activities[1]
    expect(first && second).toBeTruthy()
    const html = renderToStaticMarkup(
      createElement(WeekChecklistView, {
        model: {
          ...base,
          sourceLabel: 'From Bungie milestones.',
          personal: {
            status: 'ready',
            displayName: 'Ada',
            message: 'Checked raid and dungeon history since this week’s reset.',
            clears: {
              [first!.key]: { state: 'cleared', completedAt: '2026-11-08T20:00:00.000Z' },
              [second!.key]: { state: 'not_cleared' },
            },
          },
        },
      })
    )
    expect(html).toContain('Cleared')
    expect(html).toContain('Not yet')
    expect(html).toContain('From Bungie milestones.')
    expect(html).toContain('Checked raid and dungeon history')
    expect(html).not.toContain('Sign in to check your clears')
  })

  it('keeps the activity names visible when the personal check fails', () => {
    const base = weekViewFromSnapshot(snapshot, true)
    const html = renderToStaticMarkup(
      createElement(WeekChecklistView, {
        model: {
          ...base,
          error: 'Your clears could not be checked just now.',
          personal: { status: 'unavailable', message: 'Your clears could not be checked just now.' },
        },
        onRetry: () => undefined,
      })
    )
    expect(html).toContain('Your clears could not be checked just now.')
    expect(html).toContain('Try again')
    expect(html).toContain(snapshot.featuredRaids[0]!)
    expect(html).toContain('Not checked')
  })
})
