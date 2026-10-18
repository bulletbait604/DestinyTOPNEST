'use client'

import { FormEvent, useEffect, useState, type ReactNode } from 'react'
import { Columns2, Crosshair, Home, ScrollText, Search, Shield, Swords, Trophy, Users, type LucideIcon } from 'lucide-react'
import { SeasonPointsBar } from '@/app/components/hub/PageHeader'
import { BRAND_FULL, BRAND_LOGO_ALT, BRAND_LOGO_PATH, HUB_NAME } from '@/lib/destiny/branding'
import type { DestinyTopNestTab } from '@/lib/destiny/types'
import {
  DESTINY_PROFILE_NAV_EVENT,
  DESTINY_TAB_NAV_EVENT,
  isDestinyTopNestTab,
  navigateDestinyTab,
  navigateGuardianSearch,
  navigateProfileSection,
  navigateSharedBuilds,
  parseTabFromSearch,
} from '@/lib/routing/tabUrl'

const NAV: { id: DestinyTopNestTab; label: string; icon: LucideIcon }[] = [
  { id: 'overview', label: 'Home', icon: Home },
  { id: 'guardians', label: 'Guardians', icon: Shield },
  { id: 'leaderboards', label: 'Boards', icon: Trophy },
  { id: 'loadouts', label: 'Builds', icon: Swords },
  { id: 'compare', label: 'Compare', icon: Columns2 },
  { id: 'lookup', label: 'Lookup', icon: Crosshair },
  { id: 'quests', label: 'Quests', icon: ScrollText },
  { id: 'fireteam', label: 'LFG', icon: Users },
]

/** Phone dock stays five items. Compare, Lookup, and LFG stay in More. */
const MOBILE_NAV = NAV.filter((item) =>
  ['overview', 'guardians', 'leaderboards', 'loadouts', 'quests'].includes(item.id)
)

function visibleTab(tab: DestinyTopNestTab): DestinyTopNestTab {
  if (tab === 'builds' || tab === 'loadouts') return 'loadouts'
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
  const [query, setQuery] = useState('')

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

  const submitSearch = (event: FormEvent) => {
    event.preventDefault()
    navigateGuardianSearch(query)
  }

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
        <form className="gh-search" role="search" onSubmit={submitSearch}>
          <label className="gh-sr" htmlFor="hub-global-search">
            Search guardians
          </label>
          <Search aria-hidden className="gh-search-icon" />
          <input
            id="hub-global-search"
            name="q"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search a Bungie name"
            autoComplete="off"
          />
          <button type="submit">Search</button>
        </form>
        <div className="gh-top-actions">
          <details className="gh-more">
            <summary>More</summary>
            <div className="gh-more-menu">
              <button type="button" onClick={() => navigateDestinyTab('season')}>
                Season prizes
              </button>
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
                Night Ops
              </button>
              <button type="button" onClick={() => navigateDestinyTab('compare')}>
                Compare
              </button>
              <button type="button" onClick={() => navigateDestinyTab('lookup')}>
                Lookup
              </button>
              <button type="button" onClick={() => navigateDestinyTab('fireteam')}>
                LFG
              </button>
              {signedIn ? (
                <button type="button" onClick={() => navigateProfileSection('passport')}>
                  Passport
                </button>
              ) : null}
              <button type="button" onClick={() => navigateSharedBuilds()}>
                Shared builds
              </button>
            </div>
          </details>
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
      </nav>
      <SeasonPointsBar />
      <main id="hub-main" className="gh-main">
        {children}
      </main>
      <footer className="gh-footer">
        Fan-made Destiny 2 hub for finding Guardians and rating them. Not affiliated with Bungie. USA and Canada: a
        Destiny 2 3D print per leaderboard. UK: a $50 CAD Steam gift card. Other countries are not prize-eligible.{' '}
        <a href="/rules">Rules &amp; prizes</a>
      </footer>
      <nav className="gh-bottom-nav" aria-label="Guardian Hub mobile">
        {MOBILE_NAV.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-current={tab === item.id ? 'page' : undefined}
            onClick={() => navigateDestinyTab(item.id)}
          >
            <item.icon aria-hidden />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
