'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { Award, Home, Trophy, User, Users, type LucideIcon } from 'lucide-react'
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

/** The five primary tabs. Everything else lives under "More" or inside Profile. */
const NAV: { id: DestinyTopNestTab; label: string; icon: LucideIcon }[] = [
  { id: 'overview', label: 'Home', icon: Home },
  { id: 'fireteam', label: 'LFG', icon: Users },
  { id: 'leaderboards', label: 'Leaderboards', icon: Trophy },
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'season', label: 'Season', icon: Award },
]

function visibleTab(tab: DestinyTopNestTab): DestinyTopNestTab {
  if (tab === 'builds' || tab === 'loadouts') return 'profile'
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
            <item.icon aria-hidden />
            <span>{item.label}</span>
          </button>
        ))}
        <details className="gh-more">
          <summary>More</summary>
          <div className="gh-more-menu">
            <button type="button" onClick={() => navigateDestinyTab('contracts')}>
              Contracts
            </button>
            <button type="button" onClick={() => navigateDestinyTab('clans')}>
              Clans
            </button>
            <button type="button" onClick={() => navigateDestinyTab('sherpas')}>
              Sherpas
            </button>
            <button type="button" onClick={() => navigateDestinyTab('events')}>
              Events
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
      <footer className="gh-footer">Fan-made hub for Destiny 2 players — clear with new Guardians, climb the boards. Not affiliated with Bungie. <a href="/rules">Rules &amp; prizes</a></footer>
    </div>
  )
}
