'use client'

import { FormEvent, useEffect, useState, type ReactNode } from 'react'
import { GEAR_NAV, isGearTab, MORE_NAV, PRIMARY_NAV } from '@/app/components/hub/clarity'
import { QuickRateHost } from '@/app/components/hub/QuickRate'
import { DirectorIcon } from '@/app/components/hub/directorIcons'
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
  parseTabFromSearch,
} from '@/lib/routing/tabUrl'

const ICONS: Partial<Record<DestinyTopNestTab, 'home' | 'people' | 'play' | 'boards' | 'gear' | 'ask'>> = {
  overview: 'home',
  guardians: 'people',
  fireteam: 'play',
  leaderboards: 'boards',
  loadouts: 'gear',
  ask: 'ask',
}

const MOBILE_NAV: { id: DestinyTopNestTab; label: string }[] = [
  { id: 'overview', label: 'Home' },
  { id: 'fireteam', label: 'Play' },
  { id: 'leaderboards', label: 'Boards' },
  { id: 'ask', label: 'Ask' },
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
  const [onRate, setOnRate] = useState(false)
  const [query, setQuery] = useState('')

  useEffect(() => {
    const read = () => {
      setOnRate(window.location.pathname === '/rate')
      if (window.location.pathname === '/ask') {
        setTab('ask')
        return
      }
      setTab(visibleTab(parseTabFromSearch(window.location.search)))
    }
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

  const go = (tabId: DestinyTopNestTab) => {
    document.querySelectorAll('details.gh-more, details.gh-nav-group').forEach((node) => {
      if (node instanceof HTMLDetailsElement) node.open = false
    })
    navigateDestinyTab(tabId)
  }

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
          <DirectorIcon name="search" />
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
          <a className="gh-btn gh-btn-ghost" href="/rate" aria-current={onRate ? 'page' : undefined}>
            Rate
          </a>
          <details className="gh-more">
            <summary>More</summary>
            <div className="gh-more-menu">
              {GEAR_NAV.map((item) => (
                <button key={item.id} type="button" onClick={() => go(item.id)}>
                  {item.label}
                  <small>{item.hint}</small>
                </button>
              ))}
              {MORE_NAV.map((item) => (
                <button key={item.id} type="button" onClick={() => go(item.id)}>
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
          return (
            <button
              key={item.id}
              type="button"
              className="gh-nav-link"
              aria-current={tab === item.id ? 'page' : undefined}
              onClick={() => go(item.id)}
            >
              <DirectorIcon name={ICONS[item.id] ?? 'home'} />
              <span>{item.label}</span>
            </button>
          )
        })}
        <details className="gh-nav-group">
          <summary className="gh-nav-link" aria-current={isGearTab(tab) || MORE_NAV.some((item) => item.id === tab) ? 'page' : undefined}>
            <span>More</span>
          </summary>
          <div className="gh-nav-menu">
            {GEAR_NAV.map((item) => (
              <button key={item.id} type="button" onClick={() => go(item.id)}>
                {item.label}
                <small>{item.hint}</small>
              </button>
            ))}
            {MORE_NAV.map((item) => (
              <button key={item.id} type="button" onClick={() => go(item.id)}>
                {item.label}
                <small>{item.hint}</small>
              </button>
            ))}
          </div>
        </details>
      </nav>
      <details className="gh-disclosure">
        <summary>Scoring</summary>
        <SeasonPointsBar />
      </details>
      <main id="hub-main" className="gh-main">
        {children}
      </main>
      <QuickRateHost />
      <footer className="gh-footer">
        Fan-made. Not affiliated with Bungie. <a href="/rules">Prize rules</a>
      </footer>
      <nav className="gh-bottom-nav" aria-label="TopNest mobile">
        {MOBILE_NAV.map((item) => {
          const current = tab === item.id
          return (
            <button
              key={item.id}
              type="button"
              aria-current={current ? 'page' : undefined}
              onClick={() => go(item.id)}
            >
              <DirectorIcon name={ICONS[item.id] ?? 'gear'} />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
