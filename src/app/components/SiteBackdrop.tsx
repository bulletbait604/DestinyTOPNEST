'use client'

import type { ReactNode } from 'react'
import { SITE_BACKGROUNDS, type SiteBackdropVariant } from '@/lib/destiny/siteArt'
import { cn } from '@/lib/utils'

interface Props {
  variant?: SiteBackdropVariant
  className?: string
  children: ReactNode
}

/** Full-viewport Destiny-style backdrop with element color washes over photography. */
export default function SiteBackdrop({ variant = 'hub', className, children }: Props) {
  return (
    <div
      className={cn('d2-site-shell tn-brand-scope min-h-screen', className)}
      style={{ ['--d2-bg-image' as string]: `url('${SITE_BACKGROUNDS[variant]}')` }}
    >
      <div className="d2-site-backdrop" aria-hidden />
      <div className="d2-site-element-wash" aria-hidden />
      <div className="d2-site-grain" aria-hidden />
      <div className="relative z-10 min-h-screen flex flex-col">{children}</div>
    </div>
  )
}
