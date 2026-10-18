'use client'

import { FormEvent, useEffect, useState, type ReactNode } from 'react'
import { Home, Search, Shield, Swords, Trophy, Users, type LucideIcon } from 'lucide-react'
import { FirstTimeGuide, GEAR_NAV, isGearTab, MORE_NAV, navHint, PRIMARY_NAV } from '@/app/components/hub/clarity'
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

const ICONS: Partial<Record<DestinyTopNestTab, LucideIcon>> = {
  overview: Home,
  guardians: Shield,
  fireteam: Users,
  leaderboards: Trophy,
  loadouts: Swords,
}

const MOBILE_NAV: { id: DestinyTopNestTab; label: string }[] = [
  { id: 'overview', label: 'Home' },
  { id: 'guardians', label: 'People' },
  { id: 'fireteam', label: 'Play' },
  { id: 'leaderboards', label: 'Boards' },
  { id: 'loadouts', label: 'Gear' },
]

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
              {GEAR_NAV.map((item) => (
                <button key={item.id} type="button" onClick={() => navigateDestinyTab(item.id)}>
                  {item.label}
                  <small>{item.hint}</small>
                </button>
              ))}
              {MORE_NAV.map((item) => (
                <button key={item.id} type="button" onClick={() => navigateDestinyTab(item.id)}>
                  {item.label}
                  <small>{item.hint}</small>
                </button>
              ))}
              {signedIn ? (
                <button type="button" onClick={() => navigateProfileSection('passport')}>
                  Your record
                  <small>Stamps from verified clears.</small>
                </button>
              ) : null}
              <button type="button" onClick={() => navigateSharedBuilds()}>
                Shared builds
                <small>The same list as Gear.</small>
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
      <nav className="gh-nav" aria-label="TopNest">
        {PRIMARY_NAV.map((item) => {
          const Icon = ICONS[item.id] ?? Home
          return (
            <button
              key={item.id}
              type="button"
              className="gh-nav-link"
              aria-current={tab === item.id ? 'page' : undefined}
              onClick={() => navigateDestinyTab(item.id)}
            >
              <Icon aria-hidden />
              <span>{item.label}</span>
            </button>
          )
        })}
        <details className="gh-nav-group">
          <summary className="gh-nav-link" aria-current={isGearTab(tab) ? 'page' : undefined}>
            <Swords aria-hidden />
            <span>Gear</span>
          </summary>
          <div className="gh-nav-menu">
            {GEAR_NAV.map((item) => (
              <button key={item.id} type="button" onClick={() => navigateDestinyTab(item.id)}>
                {item.label}
                <small>{item.hint}</small>
              </button>
            ))}
          </div>
        </details>
      </nav>
      <p className="gh-nav-hint">{navHint(tab)}</p>
      <SeasonPointsBar />
      <FirstTimeGuide />
      <main id="hub-main" className="gh-main">
        {children}
      </main>
      <footer className="gh-footer">
        Fan-made Destiny 2 site for playing with new friends. Not affiliated with Bungie. US and Canada: a Destiny 2 3D
        print for each season board. UK: a $50 CAD Steam gift card. Other countries can play and are not
        prize-eligible. <a href="/rules">Prize rules</a>
      </footer>
      <nav className="gh-bottom-nav" aria-label="TopNest mobile">
        {MOBILE_NAV.map((item) => {
          const Icon = ICONS[item.id] ?? Swords
          const current = item.id === 'loadouts' ? isGearTab(tab) : tab === item.id
          return (
            <button
              key={item.id}
              type="button"
              aria-current={current ? 'page' : undefined}
              onClick={() => navigateDestinyTab(item.id)}
            >
              <Icon aria-hidden />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
