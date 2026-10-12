import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import AppUserHeader from '@/app/components/AppUserHeader'
import HubErrorBoundary, { HubSectionFallback } from '@/app/components/hub/HubErrorBoundary'
import SignedInHubFrame from '@/app/components/hub/SignedInHubFrame'
import { normalizePublicHub } from '@/app/components/hub/hubTypes'

describe('guardian hub crash guards', () => {
  it('renders the signed-in header inside the Bungie provider', () => {
    const html = renderToStaticMarkup(
      <SignedInHubFrame displayName="Ada" onLogout={() => undefined} onLogin={() => undefined}>
        <p>Your week</p>
      </SignedInHubFrame>
    )

    expect(html).toContain('Ada')
    expect(html).toContain('Your week')
    expect(html).toContain('Log out')
  })

  it('throws if the account header is rendered without the provider', () => {
    expect(() =>
      renderToStaticMarkup(
        createElement(AppUserHeader, {
          displayName: 'Ada',
          onLogout: () => undefined,
        })
      )
    ).toThrow(/BungieLinkProvider/)
  })

  it('keeps a broken widget from replacing the page', () => {
    expect(HubErrorBoundary.getDerivedStateFromError()).toEqual({ failed: true })
    const html = renderToStaticMarkup(
      <div>
        <HubSectionFallback />
        <p>Nav still here</p>
      </div>
    )

    expect(html).toContain('This section hit a snag')
    expect(html).toContain('Nav still here')
  })

  it('rejects a hub payload that is missing the lists the page maps', () => {
    expect(normalizePublicHub(null)).toBeNull()
    expect(normalizePublicHub({})).toBeNull()
    expect(normalizePublicHub({ contracts: [], scoring: [], sherpas: null })).toMatchObject({
      contracts: [],
      sherpas: [],
      clans: [],
      events: [],
    })
  })
})
