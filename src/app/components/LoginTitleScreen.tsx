'use client'

import { LogIn } from 'lucide-react'
import { BRAND_LOGO_ALT, BRAND_LOGO_PATH } from '@/lib/destiny/branding'

interface Props {
  onLogin: () => void
  errorMessage?: string | null
  loading?: boolean
}

/** Video-game title screen — logo crest dominates; login dock attached below. */
export default function LoginTitleScreen({ onLogin, errorMessage, loading }: Props) {
  return (
    <div className="d2-login-screen">
      <div className="d2-login-screen-vignette" aria-hidden />
      <div className="d2-login-screen-ambient" aria-hidden />

      <div className="d2-login-screen-frame">
        <div className="d2-login-screen-corners" aria-hidden />

        <div className="d2-login-screen-crest">
          <div className="d2-login-screen-logo-halo" aria-hidden />
          <img
            src={BRAND_LOGO_PATH}
            alt={BRAND_LOGO_ALT}
            className="d2-login-screen-logo"
            width={640}
            height={640}
            decoding="async"
            fetchPriority="high"
          />
        </div>

        <div className="d2-login-screen-dock">
          <div className="d2-login-screen-bridge" aria-hidden>
            <span className="d2-login-screen-bridge-gem" />
          </div>

          {errorMessage ? (
            <div className="d2-login-screen-error" role="alert">
              {errorMessage}
            </div>
          ) : null}

          <button
            type="button"
            onClick={onLogin}
            disabled={loading}
            className="d2-login-screen-enter d2-btn d2-btn-primary"
          >
            <LogIn className="w-5 h-5 shrink-0" />
            <span>{loading ? 'Connecting…' : 'Sign in with Bungie'}</span>
          </button>

          <p className="d2-login-screen-footnote">
            Bungie.net login · verified runs, loadouts, and season prizes
          </p>
        </div>
      </div>
    </div>
  )
}
