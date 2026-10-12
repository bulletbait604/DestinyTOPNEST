import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import ActivityHistoryPanel from '@/app/components/hub/ActivityHistoryPanel'
import { BungieLinkProvider } from '@/contexts/BungieLinkContext'

describe('activity history panel provider', () => {
  it('renders inside BungieLinkProvider', () => {
    const html = renderToStaticMarkup(
      createElement(BungieLinkProvider, null, createElement(ActivityHistoryPanel))
    )
    expect(html).toContain('Activity history')
    expect(html).toContain('Checking your Bungie link')
  })

  it('throws outside BungieLinkProvider', () => {
    expect(() => renderToStaticMarkup(createElement(ActivityHistoryPanel))).toThrow(/BungieLinkProvider/)
  })
})
