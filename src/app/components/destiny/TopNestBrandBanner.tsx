'use client'

import { BRAND_FULL, BRAND_LOGO_ALT, BRAND_LOGO_PATH } from '@/lib/destiny/branding'
import { cn } from '@/lib/utils'

interface Props {
  title?: string
  tagline?: string
  /** Compact height for nested panels */
  compact?: boolean
  /** Logged-in app shell — crest logo, title, and mission copy. */
  app?: boolean
  className?: string
}

/**
 * Brand banner — crest logo plus optional title and mission copy.
 */
export default function TopNestBrandBanner({ title, tagline, compact, app, className }: Props) {
  const showWordmark = !app
  const heroTitle = title ?? BRAND_FULL

  return (
    <header
      className={cn(
        'tn-brand-banner',
        compact && 'tn-brand-banner-compact',
        app && 'tn-brand-banner-app',
        className
      )}
    >
      <div className="tn-brand-banner-glow tn-brand-banner-glow-arc" aria-hidden />
      <div className="tn-brand-banner-glow tn-brand-banner-glow-solar" aria-hidden />
      <div className="tn-brand-banner-glow tn-brand-banner-glow-void" aria-hidden />
      <div className="tn-brand-banner-frame" aria-hidden />

      <div className="tn-brand-banner-inner">
        <div className="tn-brand-logo-wrap">
          <img
            src={BRAND_LOGO_PATH}
            alt={BRAND_LOGO_ALT}
            className="tn-brand-logo"
            width={app ? 120 : compact ? 96 : 128}
            height={app ? 120 : compact ? 96 : 128}
            decoding="async"
          />
        </div>

        {(showWordmark || app || tagline) && (
          <div className={cn('tn-brand-copy min-w-0', app ? 'flex-1' : 'flex-1')}>
            {showWordmark ? (
              <>
                <p className="tn-brand-eyebrow">{BRAND_FULL}</p>
                <h1 className="tn-brand-title truncate">{heroTitle}</h1>
              </>
            ) : null}
            {app ? <h1 className="tn-brand-app-title">{heroTitle}</h1> : null}
            {tagline ? (
              <p
                className={cn(
                  app ? 'tn-brand-app-mission' : 'tn-brand-tagline line-clamp-2',
                  !app && 'line-clamp-2'
                )}
              >
                {tagline}
              </p>
            ) : null}
          </div>
        )}
      </div>
    </header>
  )
}

/** Small logo mark for tabs, loading states, empty states. */
export function TopNestLogoMark({
  size = 40,
  className,
}: {
  size?: number
  className?: string
}) {
  return (
    <img
      src={BRAND_LOGO_PATH}
      alt=""
      aria-hidden
      className={cn('tn-brand-mark object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]', className)}
      width={size}
      height={size}
    />
  )
}
