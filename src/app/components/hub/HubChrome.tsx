'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { BRAND_FULL, BRAND_LOGO_ALT, BRAND_LOGO_PATH, HUB_NAME } from '@/lib/destiny/branding'
import type { DestinyTopNestTab } from '@/lib/destiny/types'
import {
  DESTINY_PROFILE_NAV_EVENT,
  DESTINY_TAB_NAV_EVENT,
  isDestinyTopNestTab,
  navigateDestinyTab,
  navigateProfileSection,
  parseTabFromSearch,
} from '@/lib/routing/tabUrl'

const NAV: { id: DestinyTopNestTab; label: string }[] = [
  { id: 'overview', label: 'Home' },
  { id: 'history', label: 'History' },
  { id: 'fireteam', label: 'Find a Fireteam' },
  { id: 'contracts', label: 'Contracts' },
  { id: 'leaderboards', label: 'Leaderboards' },
  { id: 'clans', label: 'Clans' },
  { id: 'sherpas', label: 'Sherpas' },
  { id: 'events', label: 'Events' },
]

function visibleTab(tab: DestinyTopNestTab): DestinyTopNestTab {
  if (tab === 'season') return 'leaderboards'
  if (tab === 'builds') return 'loadouts'
  return tab
}

export default function HubChrome({
  children,
  signedIn,
  onLogin,
  loginPending,
  account,
}: {
  children: ReactNode
  signedIn: boolean
  onLogin: () => void
  loginPending?: boolean
  account?: ReactNode
}) {
  const [tab, setTab] = useState<DestinyTopNestTab>('overview')

  useEffect(() => {
    const read = () => setTab(visibleTab(parseTabFromSearch(window.location.search)))
    read()
    const onTab = (event: Event) => {
      const next = (event as CustomEvent<DestinyTopNestTab>).detail
      if (next && isDestinyTopNestTab(next)) setTab(visibleTab(next))
    }
    const onProfile = () => setTab('profile')
    window.addEventListener(DESTINY_TAB_NAV_EVENT, onTab)
    window.addEventListener(DESTINY_PROFILE_NAV_EVENT, onProfile)
    window.addEventListener('popstate', read)
    return () => {
      window.removeEventListener(DESTINY_TAB_NAV_EVENT, onTab)
      window.removeEventListener(DESTINY_PROFILE_NAV_EVENT, onProfile)
      window.removeEventListener('popstate', read)
    }
  }, [])

  return (
    <div className="gh-shell">
      <a className="gh-skip" href="#hub-main">
        Skip to content
      </a>
      <header className="gh-top">
        <button type="button" className="gh-brand" onClick={() => navigateDestinyTab('overview')}>
          <img src={BRAND_LOGO_PATH} alt={BRAND_LOGO_ALT} width={44} height={44} />
          <span>
            <strong>{HUB_NAME}</strong>
            <small>{BRAND_FULL}</small>
          </span>
        </button>
        <div className="gh-top-actions">
          {signedIn ? (
            account
          ) : (
            <button type="button" className="gh-btn gh-btn-primary" onClick={onLogin} disabled={loginPending}>
              {loginPending ? 'Connecting…' : 'Sign in with Bungie'}
            </button>
          )}
        </div>
      </header>
      <nav className="gh-nav" aria-label="Guardian Hub">
        {NAV.map((item) => (
          <button
            key={item.id}
            type="button"
            className="gh-nav-link"
            aria-current={tab === item.id ? 'page' : undefined}
            onClick={() => navigateDestinyTab(item.id)}
          >
            {item.label}
          </button>
        ))}
        <details className="gh-more">
          <summary>More</summary>
          <div className="gh-more-menu">
            <button type="button" onClick={() => navigateDestinyTab('profile')}>
              Your Guardian
            </button>
            <button type="button" onClick={() => navigateProfileSection('passport')}>
              Passport
            </button>
            <button type="button" onClick={() => navigateDestinyTab('loadouts')}>
              Builds
            </button>
          </div>
        </details>
      </nav>
      <main id="hub-main" className="gh-main">
        {children}
      </main>
      <footer className="gh-footer">Fan-made Guardian Hub for Destiny players. Not affiliated with Bungie.</footer>
    </div>
  )
}
