'use client'

import { Loader2 } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { HUB_NAME } from '@/lib/destiny/branding'
import { bungieOAuthErrorMessage } from '@/lib/destiny/bungieOAuthMessages'
import { TopNestLogoMark } from '@/app/components/destiny/TopNestBrandBanner'
import DestinyTopNestApp from '@/app/components/DestinyTopNestApp'
import HubChrome from '@/app/components/hub/HubChrome'
import HubErrorBoundary from '@/app/components/hub/HubErrorBoundary'
import AskGuide from '@/app/components/hub/AskGuide'
import { RatePage } from '@/app/components/hub/QuickRate'
import BoardsHub from '@/app/components/hub/BoardsHub'
import { ConnectedHome, ScoreRuns } from '@/app/components/hub/HubPages'
import { BuildsHub, CommunityHub, ProfileHub, WeeklyHub } from '@/app/components/hub/SimplePages'
import PublicHub from '@/app/components/hub/PublicHub'
import { routeForTab, type BuildsSection, type CommunitySection, type ProfileSection } from '@/lib/destiny/pageCatalog'
import SignedInHubFrame from '@/app/components/hub/SignedInHubFrame'
import SiteBackdrop from '@/app/components/SiteBackdrop'
import { useAppSession } from '@/hooks/useAppSession'
import { stripUrlParams, navigateDestinyTab, parseTabFromSearch, DESTINY_TAB_NAV_EVENT, isDestinyTopNestTab } from '@/lib/routing/tabUrl'
import type { DestinyTopNestTab } from '@/lib/destiny/types'

function SignedHome({
  onLogin,
  fallback,
}: {
  onLogin: () => void
  fallback: ReactNode
}) {
  const [tab, setTab] = useState<DestinyTopNestTab>('overview')
  useEffect(() => {
    if (window.location.pathname !== '/') return
    const target = routeForTab(parseTabFromSearch(window.location.search))
    if (target && target !== '/') window.location.replace(target)
  }, [])

  useEffect(() => {
    const read = () => setTab(parseTabFromSearch(window.location.search))
    read()
    const onTab = (event: Event) => {
      const next = (event as CustomEvent<DestinyTopNestTab>).detail
      if (next && isDestinyTopNestTab(next)) setTab(next)
    }
    window.addEventListener(DESTINY_TAB_NAV_EVENT, onTab)
    window.addEventListener('popstate', read)
    return () => {
      window.removeEventListener(DESTINY_TAB_NAV_EVENT, onTab)
      window.removeEventListener('popstate', read)
    }
  }, [])
  if (tab === 'overview') return <ConnectedHome onLogin={onLogin} signedIn />
  return fallback
}

type HubView = 'home' | 'ask' | 'rate' | 'score' | 'boards' | 'people' | 'builds' | 'community' | 'weekly' | 'profile'

function HubViewBody({
  view,
  section,
  signedIn,
  onLogin,
  isAdmin,
  isOwner,
  userId,
}: {
  view: HubView
  section?: string
  signedIn: boolean
  onLogin: () => void
  isAdmin: boolean
  isOwner: boolean
  userId?: string
}) {
  if (view === 'rate') return <RatePage />
  if (view === 'score') return <ScoreRuns signedIn={signedIn} onLogin={onLogin} />
  if (view === 'boards') return <BoardsHub onLogin={onLogin} />
  if (view === 'ask') return <AskGuide />
  if (view === 'builds') {
    const initial: BuildsSection = section === 'mine' || section === 'compare' ? section : 'shared'
    return <BuildsHub initial={initial} signedIn={signedIn} onLogin={onLogin} />
  }
  if (view === 'community' || view === 'people') {
    const community: CommunitySection = section === 'teachers' || section === 'clans' ? section : 'players'
    return <CommunityHub section={community} onLogin={onLogin} />
  }
  if (view === 'weekly') return <WeeklyHub onLogin={onLogin} />
  if (view === 'profile') {
    const profile: ProfileSection = section === 'passport' || section === 'prizes' ? section : 'guardian'
    return <ProfileHub section={profile} signedIn={signedIn} onLogin={onLogin} />
  }
  if (signedIn) {
    return (
      <SignedHome
        onLogin={onLogin}
        fallback={<DestinyTopNestApp embedded darkMode isAdmin={isAdmin} isOwner={isOwner} userId={userId} />}
      />
    )
  }
  return <PublicHub onLogin={onLogin} />
}

export default function HubScreen({
  view,
  section,
}: {
  view: HubView
  section?: string
}) {
  const { mounted, user, loading, login, logout, refresh, isAdmin, isOwner } = useAppSession()
  const [loginError, setLoginError] = useState<string | null>(null)
  const [loginPending, setLoginPending] = useState(false)

  useEffect(() => {
    if (!mounted || user) return

    const params = new URLSearchParams(window.location.search)
    const bungie = params.get('bungie')

    if (bungie === 'linked') {
      stripUrlParams(['bungie', 'message'])
      void (async () => {
        setLoginPending(true)
        setLoginError(null)
        const signedIn = await refresh()
        setLoginPending(false)
        if (!signedIn) {
          setLoginError(
            'Bungie sign-in succeeded but your session could not be saved. Allow cookies for this site and try again.'
          )
        }
      })()
      return
    }

    if (bungie === 'error') {
      const msg = params.get('message') || ''
      void (async () => {
        let text = msg ? bungieOAuthErrorMessage(msg) : 'Bungie sign-in failed. Try again.'
        const needsRedirectHint =
          msg === 'exchange_failed' ||
          msg === 'redirect_uri_mismatch' ||
          msg === 'invalid_client' ||
          msg === 'api_key_mismatch'
        if (needsRedirectHint) {
          try {
            const res = await fetch('/api/destiny/auth/bungie/config', { cache: 'no-store' })
            if (res.ok) {
              const data = (await res.json()) as { redirectUri?: string }
              if (data.redirectUri) {
                text += ` Expected redirect URL: ${data.redirectUri}`
              }
            }
          } catch {
            /* ignore */
          }
        }
        setLoginError(text)
        setLoginPending(false)
      })()
      stripUrlParams(['bungie', 'message'])
    }
  }, [mounted, user, refresh])

  const handleLogin = () => {
    setLoginError(null)
    setLoginPending(true)
    login()
  }

  if (!mounted || loading) {
    return (
      <SiteBackdrop variant="hub">
        <div className="flex flex-1 items-center justify-center px-4">
          <div className="flex flex-col items-center gap-3 text-white/70">
            <TopNestLogoMark size={56} />
            <Loader2 className="w-8 h-8 animate-spin text-d2-arc" />
            <p className="text-sm">Loading {HUB_NAME}…</p>
          </div>
        </div>
      </SiteBackdrop>
    )
  }

  if (user) {
    return (
      <SiteBackdrop variant="hub">
        <SignedInHubFrame
          displayName={user.displayName}
          onLogout={() => void logout()}
          showAdmin={isAdmin}
          onOpenAdmin={() => navigateDestinyTab('admin')}
          onLogin={handleLogin}
          loginPending={loginPending}
        >
          {loginError ? (
            <p className="gh-alert" role="alert">
              {loginError}
            </p>
          ) : null}
          <HubViewBody
            view={view}
            section={section}
            signedIn
            onLogin={handleLogin}
            isAdmin={isAdmin}
            isOwner={isOwner}
            userId={user.id}
          />
        </SignedInHubFrame>
      </SiteBackdrop>
    )
  }

  return (
    <SiteBackdrop variant="hub">
      <HubChrome signedIn={false} onLogin={handleLogin} loginPending={loginPending}>
        {loginError ? (
          <p className="gh-alert" role="alert">
            {loginError}
          </p>
        ) : null}
        <HubErrorBoundary label="public hub">
          <HubViewBody
            view={view}
            section={section}
            signedIn={false}
            onLogin={handleLogin}
            isAdmin={false}
            isOwner={false}
          />
        </HubErrorBoundary>
      </HubChrome>
    </SiteBackdrop>
  )
}
