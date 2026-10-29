'use client'

import { FormEvent, useState, type ReactNode } from 'react'
import { MORE_NAV } from '@/app/components/hub/clarity'
import { isBuildsPath, isMorePath } from '@/lib/destiny/pageCatalog'
import { QuickRateHost } from '@/app/components/hub/QuickRate'
import { DirectorIcon } from '@/app/components/hub/directorIcons'
import { SeasonPointsBar } from '@/app/components/hub/PageHeader'
import { BRAND_LOGO_ALT, BRAND_LOGO_PATH, HUB_NAME } from '@/lib/destiny/branding'
import { usePathname } from 'next/navigation'
import { navigateDestinyTab, navigateGuardianSearch } from '@/lib/routing/tabUrl'

const TAB_BAR: {
  href: string
  label: string
  short: string
  icon: 'home' | 'play' | 'boards' | 'gear'
}[] = [
  { href: '/', label: 'Home', short: 'Home', icon: 'home' },
  { href: '/score', label: 'Score', short: 'Score', icon: 'play' },
  { href: '/boards', label: 'Boards', short: 'Boards', icon: 'boards' },
  { href: '/builds', label: 'Builds', short: 'Builds', icon: 'gear' },
]

const MORE_ITEMS = [
  { href: '/rate', label: 'Vote' },
  { href: '/ask', label: 'Ask AI' },
  ...MORE_NAV.map((item) => ({ href: item.href, label: item.label })),
]

function tabCurrent(href: string, pathname: string) {
  if (href === '/') return pathname === '/'
  if (href === '/builds') return isBuildsPath(pathname)
  return pathname === href
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
  const pathname = usePathname() || '/'
  const [query, setQuery] = useState('')
  const [moreOpen, setMoreOpen] = useState(false)
  const moreCurrent = isMorePath(pathname) || pathname === '/rate' || pathname === '/ask'

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
          <img src={BRAND_LOGO_PATH} alt={BRAND_LOGO_ALT} width={32} height={32} />
          <span>
            <strong>{HUB_NAME}</strong>
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
            placeholder="Search"
            autoComplete="off"
          />
          <button type="submit">Search</button>
        </form>
        <div className="gh-top-actions">
          {signedIn ? (
            account
          ) : (
            <button type="button" className="gh-btn gh-btn-primary" onClick={onLogin} disabled={loginPending}>
              {loginPending ? 'Connecting…' : 'Sign in'}
            </button>
          )}
        </div>
      </header>
      <nav className="gh-nav" aria-label="TopNest">
        {TAB_BAR.map((item) => {
          const current = tabCurrent(item.href, pathname)
          return (
            <a key={item.href} className="gh-nav-link" href={item.href} aria-current={current ? 'page' : undefined}>
              <span>{item.label}</span>
            </a>
          )
        })}
        <details className="gh-nav-group">
          <summary className="gh-nav-link" aria-current={moreCurrent ? 'page' : undefined}>
            <span>More</span>
          </summary>
          <div className="gh-nav-menu">
            {MORE_ITEMS.map((item) => (
              <a key={item.href} href={item.href} aria-current={pathname === item.href ? 'page' : undefined}>
                {item.label}
              </a>
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
        {TAB_BAR.map((item) => {
          const current = tabCurrent(item.href, pathname)
          return (
            <a key={item.href} href={item.href} aria-current={current ? 'page' : undefined}>
              <DirectorIcon name={item.icon} />
              <span>{item.short}</span>
            </a>
          )
        })}
        <button type="button" aria-current={moreCurrent ? 'page' : undefined} aria-expanded={moreOpen} onClick={() => setMoreOpen(true)}>
          <DirectorIcon name="more" />
          <span>More</span>
        </button>
      </nav>
      {moreOpen ? (
        <div className="ios-sheet-backdrop" onClick={() => setMoreOpen(false)}>
          <div className="ios-sheet" role="dialog" aria-label="More" onClick={(event) => event.stopPropagation()}>
            <div className="ios-sheet-grab" />
            {MORE_ITEMS.map((item) => (
              <a key={item.href} href={item.href} aria-current={pathname === item.href ? 'page' : undefined}>
                {item.label}
              </a>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
