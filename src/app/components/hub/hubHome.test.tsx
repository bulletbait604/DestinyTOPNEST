import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { HubHome } from '@/app/components/hub/HubPages'
import { assemblePublicHub } from '@/lib/destiny/publicHub'

describe('guardian hub home', () => {
  it('explains the hub, lists contracts, and offers Bungie sign-in', () => {
    const snapshot = assemblePublicHub({
      now: new Date('2026-10-11T18:00:00.000Z'),
      runs: [],
      lobbies: [],
    })
    const html = renderToStaticMarkup(
      createElement(HubHome, {
        snapshot,
        loading: false,
        error: null,
        onLogin: () => undefined,
      })
    )

    expect(html).toContain('Guardian Hub')
    expect(html).toContain('Sign in with Bungie')
    expect(html).toContain('gh-rotation')
    expect(html).toContain('Featured raids')
    expect(html).toContain('Top guardians')
    expect(html).toContain('Featured builds')
    expect(html).toContain('Search guardians')
    expect(html).toContain('Featured dungeon, new faces')
    expect(html).toContain('No sherpas on the board yet')
    expect(html).toContain('How scoring works')
    expect(html.toLowerCase()).not.toContain('cash prize')
    expect(html.toLowerCase()).not.toContain('pantheon')
  })
})
