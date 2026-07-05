'use client'

import { LogIn, LogOut, Loader2 } from 'lucide-react'
import { BRAND_FULL, BRAND_TAGLINE } from '@/lib/destiny/branding'
import { TopNestLogoMark } from '@/app/components/destiny/TopNestBrandBanner'
import DestinyTopNestApp from '@/app/components/DestinyTopNestApp'
import SiteBackdrop from '@/app/components/SiteBackdrop'
import { useAppSession } from '@/hooks/useAppSession'

const ELEMENT_PILLS = [
  { label: 'Arc', className: 'd2-element-pill-arc' },
  { label: 'Solar', className: 'd2-element-pill-solar' },
  { label: 'Void', className: 'd2-element-pill-void' },
  { label: 'Strand', className: 'd2-element-pill-strand' },
] as const

export default function HomePage() {
  const { mounted, user, loading, login, logout, isAdmin } = useAppSession()

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
      <SiteBackdrop variant="login">
        <div className="flex flex-1 flex-col items-center justify-center px-4 py-8 sm:py-12">
          <div className="relative z-[1] flex flex-col items-center w-full max-w-3xl">
            <div className="relative mb-6 sm:mb-10 flex justify-center w-full">
              <div
                className="pointer-events-none absolute inset-0 -z-10 scale-110 blur-3xl opacity-40"
                aria-hidden
                style={{
                  background:
                    'radial-gradient(circle at 50% 45%, color-mix(in srgb, var(--d2-arc) 35%, transparent) 0%, transparent 55%), radial-gradient(circle at 35% 55%, color-mix(in srgb, var(--d2-solar) 25%, transparent) 0%, transparent 50%)',
                }}
              />
              <TopNestLogoMark
                size={600}
                className="mx-auto w-[min(92vw,36rem)] h-auto aspect-square drop-shadow-[0_0_80px_rgba(115,210,255,0.28)]"
              />
            </div>

            <div className="d2-login-card w-full max-w-md p-8 sm:p-10 text-center space-y-6 relative">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-d2-bronze-light mb-2">
                  Community Guardian Hub
                </p>
                <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-wide text-white">{BRAND_FULL}</h1>
                <p className="text-sm text-white/65 mt-3 leading-relaxed">{BRAND_TAGLINE}</p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {ELEMENT_PILLS.map((pill) => (
                  <span key={pill.label} className={`d2-element-pill ${pill.className}`}>
                    {pill.label}
                  </span>
                ))}
              </div>
              <button
                type="button"
                onClick={login}
                className="d2-btn d2-btn-primary inline-flex items-center justify-center gap-2 w-full py-3.5 text-sm font-bold uppercase tracking-wide relative z-[1]"
              >
                <LogIn className="w-4 h-4" />
                Sign in with Bungie
              </button>
              <p className="text-[11px] text-white/40 leading-relaxed">
                Use your Bungie.net account to sync verified runs, loadouts, and season prizes.
              </p>
            </div>
          </div>
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
