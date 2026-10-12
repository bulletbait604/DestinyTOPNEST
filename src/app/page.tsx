'use client'

import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { HUB_NAME } from '@/lib/destiny/branding'
import { bungieOAuthErrorMessage } from '@/lib/destiny/bungieOAuthMessages'
import { TopNestLogoMark } from '@/app/components/destiny/TopNestBrandBanner'
import AppUserHeader from '@/app/components/AppUserHeader'
import DestinyTopNestApp from '@/app/components/DestinyTopNestApp'
import HubChrome from '@/app/components/hub/HubChrome'
import PublicHub from '@/app/components/hub/PublicHub'
import SiteBackdrop from '@/app/components/SiteBackdrop'
import { BungieLinkProvider } from '@/contexts/BungieLinkContext'
import { useAppSession } from '@/hooks/useAppSession'
import { stripUrlParams, navigateDestinyTab } from '@/lib/routing/tabUrl'

export default function HomePage() {
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

  return (
    <SiteBackdrop variant="hub">
      <HubChrome
        signedIn={Boolean(user)}
        onLogin={handleLogin}
        loginPending={loginPending}
        account={
          user ? (
            <AppUserHeader
              displayName={user.displayName}
              onLogout={() => void logout()}
              showAdminSettings={isAdmin}
              onOpenAdmin={() => navigateDestinyTab('admin')}
            />
          ) : null
        }
      >
        {loginError ? (
          <p className="gh-alert" role="alert">
            {loginError}
          </p>
        ) : null}
        {user ? (
          <BungieLinkProvider>
            <DestinyTopNestApp embedded darkMode isAdmin={isAdmin} isOwner={isOwner} userId={user.id} />
          </BungieLinkProvider>
        ) : (
          <PublicHub onLogin={handleLogin} />
        )}
      </HubChrome>
    </SiteBackdrop>
  )
}
