'use client'

import { LogOut, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { BRAND_FULL } from '@/lib/destiny/branding'
import { bungieOAuthErrorMessage } from '@/lib/destiny/bungieOAuthMessages'
import { TopNestLogoMark } from '@/app/components/destiny/TopNestBrandBanner'
import LoginTitleScreen from '@/app/components/LoginTitleScreen'
import DestinyTopNestApp from '@/app/components/DestinyTopNestApp'
import SiteBackdrop from '@/app/components/SiteBackdrop'
import { useAppSession } from '@/hooks/useAppSession'
import { stripUrlParams } from '@/lib/routing/tabUrl'

export default function HomePage() {
  const { mounted, user, loading, login, logout, refresh, isAdmin } = useAppSession()
  const [loginError, setLoginError] = useState<string | null>(null)
  const [loginPending, setLoginPending] = useState(false)

  useEffect(() => {
    if (!mounted || user) return

    const params = new URLSearchParams(window.location.search)
    const bungie = params.get('bungie')

    if (bungie === 'linked') {
      stripUrlParams(['bungie', 'message'])
      void refresh()
      return
    }

    if (bungie === 'error') {
      const msg = params.get('message') || ''
      setLoginError(
        msg ? bungieOAuthErrorMessage(msg) : 'Bungie sign-in failed. Try again.'
      )
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
            <p className="text-sm">Loading {BRAND_FULL}…</p>
          </div>
        </div>
      </SiteBackdrop>
    )
  }

  if (!user) {
    return (
      <SiteBackdrop variant="login" className="d2-login-backdrop">
        <div className="d2-login-stage">
          <LoginTitleScreen
            onLogin={handleLogin}
            errorMessage={loginError}
            loading={loginPending}
          />
        </div>
      </SiteBackdrop>
    )
  }

  return (
    <SiteBackdrop variant="hub">
      <header className="d2-app-header flex items-center justify-end gap-2 px-4 py-2.5">
        <TopNestLogoMark size={28} className="mr-auto" />
        <span className="text-xs text-white/55 truncate max-w-[40vw] sm:max-w-none">
          {user.displayName}
        </span>
        <button
          type="button"
          onClick={() => void logout()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/75 ring-1 ring-d2-arc/25 hover:bg-d2-arc/10 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Log out
        </button>
      </header>
      <main className="container mx-auto max-w-6xl px-2 sm:px-4 py-4 flex-1">
        <DestinyTopNestApp darkMode isAdmin={isAdmin} />
      </main>
      <footer className="px-4 py-3 text-center text-[10px] uppercase tracking-[0.18em] text-white/30 border-t border-white/[0.06] bg-black/20">
        Fan community hub · Not affiliated with Bungie
      </footer>
    </SiteBackdrop>
  )
}
