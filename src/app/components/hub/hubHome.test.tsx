import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { HubHome, ScoreRuns } from '@/app/components/hub/HubPages'
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

    expect(html).toContain('Play with new friends. Score the clear.')
    expect(html).toContain('Score Your Runs')
    expect(html).toContain('Sign in with Bungie to Score Runs')
    expect(html).toContain('Rate and Vote MVP')
    expect(html).toContain('Rate a Guardian')
    expect(html).toContain('Ask Destiny AI')
    expect(html).toContain('gh-rotation')
    expect(html).toContain('Featured raids')
    expect(html).toContain('Live season leaderboards')
    expect(html).toContain('Featured builds')
    expect(html).toContain('3D print')
    expect(html).not.toContain('New Bonds')
    expect(html).not.toContain('This week\'s contracts')
    expect(html).not.toContain('Live fireteams')
    expect(html.toLowerCase()).not.toContain('cash prize')
    expect(html.toLowerCase()).not.toContain('pantheon')
  })

  it('explains scoring in three lines and keeps sync one click away', () => {
    const signedOut = renderToStaticMarkup(createElement(ScoreRuns, { signedIn: false, onLogin: () => undefined }))
    expect(signedOut).toContain('Clear raids or dungeons')
    expect(signedOut).toContain('have not run with before')
    expect(signedOut).toContain('Sync My Runs')
    expect(signedOut).toContain('Sign in with Bungie to Score Runs')

    const signedIn = renderToStaticMarkup(createElement(ScoreRuns, { signedIn: true, onLogin: () => undefined }))
    expect(signedIn).toContain('Sync My Recent Runs')
  })
})
