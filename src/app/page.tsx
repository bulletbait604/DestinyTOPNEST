'use client'

import { LogIn, LogOut, Loader2 } from 'lucide-react'
import { BRAND_FULL, BRAND_TAGLINE } from '@/lib/destiny/branding'
import { TopNestLogoMark } from '@/app/components/destiny/TopNestBrandBanner'
import DestinyTopNestApp from '@/app/components/DestinyTopNestApp'
import { useAppSession } from '@/hooks/useAppSession'

export default function HomePage() {
  const { mounted, user, loading, login, logout, isAdmin } = useAppSession()

  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center d2-atmosphere tn-brand-scope">
        <div className="flex flex-col items-center gap-3 text-white/70">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--tn-arc)]" />
          <p className="text-sm">Loading {BRAND_FULL}â€¦</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center d2-atmosphere tn-brand-scope px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <TopNestLogoMark size={120} className="mx-auto" />
          <div>
            <h1 className="text-2xl font-black uppercase tracking-wide text-white">{BRAND_FULL}</h1>
            <p className="text-sm text-white/60 mt-2 leading-relaxed">{BRAND_TAGLINE}</p>
          </div>
          <button
            type="button"
            onClick={login}
            className="d2-btn d2-btn-primary inline-flex items-center justify-center gap-2 w-full py-3 text-sm font-bold uppercase tracking-wide"
          >
            <LogIn className="w-4 h-4" />
            Sign in with Kick
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen d2-atmosphere tn-brand-scope">
      <header className="flex items-center justify-end gap-2 px-4 py-2 border-b border-white/[0.06] bg-black/30">
        <span className="text-xs text-white/50 mr-auto truncate">{user.username}</span>
        <button
          type="button"
          onClick={() => void logout()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/70 ring-1 ring-white/10 hover:bg-white/[0.06]"
        >
          <LogOut className="w-3.5 h-3.5" />
          Log out
        </button>
      </header>
      <main className="container mx-auto max-w-6xl px-2 sm:px-4 py-4">
        <DestinyTopNestApp darkMode isAdmin={isAdmin} />
      </main>
    </div>
  )
}
