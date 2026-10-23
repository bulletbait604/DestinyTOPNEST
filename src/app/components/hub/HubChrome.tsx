'use client'

import { FormEvent, useState, type ReactNode } from 'react'
import { MAIN_NAV, MORE_NAV } from '@/app/components/hub/clarity'
import { isBuildsPath, isMorePath } from '@/lib/destiny/pageCatalog'
import { QuickRateHost } from '@/app/components/hub/QuickRate'
import { DirectorIcon } from '@/app/components/hub/directorIcons'
import { SeasonPointsBar } from '@/app/components/hub/PageHeader'
import { BRAND_FULL, BRAND_LOGO_ALT, BRAND_LOGO_PATH, HUB_NAME } from '@/lib/destiny/branding'
import { usePathname } from 'next/navigation'
import { navigateDestinyTab, navigateGuardianSearch } from '@/lib/routing/tabUrl'

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
          <details className="gh-more">
            <summary>More</summary>
            <div className="gh-more-menu">
              {MORE_NAV.map((item) => (
                <a key={item.href} href={item.href}>
                  {item.label}
                  <small>{item.hint}</small>
                </a>
              ))}
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
        {MAIN_NAV.map((item) => {
          const current = item.href === '/' ? pathname === '/' : item.href === '/builds' ? isBuildsPath(pathname) : pathname === item.href
          return (
            <a key={item.href} className="gh-nav-link" href={item.href} aria-current={current ? 'page' : undefined}>
              <DirectorIcon name={item.icon} />
              <span>{item.label}</span>
            </a>
          )
        })}
        <details className="gh-nav-group">
          <summary className="gh-nav-link" aria-current={isMorePath(pathname) ? 'page' : undefined}>
            <span>More</span>
          </summary>
          <div className="gh-nav-menu">
            {MORE_NAV.map((item) => (
              <a key={item.href} href={item.href} aria-current={pathname === item.href ? 'page' : undefined}>
                {item.label}
                <small>{item.hint}</small>
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
        {MAIN_NAV.map((item) => {
          const current = item.href === '/' ? pathname === '/' : item.href === '/builds' ? isBuildsPath(pathname) : pathname === item.href
          return (
            <a key={item.href} href={item.href} aria-current={current ? 'page' : undefined}>
              <DirectorIcon name={item.icon} />
              <span>{item.short}</span>
            </a>
          )
        })}
      </nav>
    </div>
  )
}
