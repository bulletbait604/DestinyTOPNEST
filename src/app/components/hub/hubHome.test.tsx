import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { HubHome } from '@/app/components/hub/HubPages'
import { assemblePublicHub } from '@/lib/destiny/publicHub'

describe('guardian hub home', () => {
  it('keeps a short home with sign-in, boards, builds, and the weekly rotation', () => {
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
    expect(html).toContain('Find your fireteam')
    expect(html).toContain('Sign in with Bungie')
    expect(html).toContain('Rate a Guardian')
    expect(html).toContain('gh-rotation')
    expect(html).toContain('Featured raids')
    expect(html).toContain('Top guardians')
    expect(html).toContain('Featured builds')
    expect(html).toContain('Ask TopNest')
    expect(html).toContain('This season')
    expect(html).toContain('More about TopNest')
    expect(html).toContain('What is TopNest?')
    expect(html).toContain('Play with new friends')
    expect(html).toContain('Earn points')
    expect(html).toContain('3D print')
    expect(html).toContain('A sherpa is')
    expect(html).not.toContain('This week\'s contracts')
    expect(html).not.toContain('Live fireteams')
    expect(html.toLowerCase()).not.toContain('cash prize')
    expect(html.toLowerCase()).not.toContain('pantheon')
  })
})
