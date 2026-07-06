'use client'

import type { ReactNode } from 'react'
import type { DestinyTopNestTab } from '@/lib/destiny/types'
import { BRAND_LOGO_ALT, BRAND_LOGO_PATH } from '@/lib/destiny/branding'
import { navTabArtUrl, homeSectionArtUrl } from '@/lib/destiny/navArt'
import { HERO_PRIZE_POOL_STICKER } from '@/lib/destiny/seasonConfig'
import { tabHeroArtKey, tabPageCopy } from '@/lib/destiny/tabPageCopy'
import { cn } from '@/lib/utils'

interface Props {
  tab: DestinyTopNestTab
  aside?: ReactNode
}

const PRIZE_STICKER_TABS: DestinyTopNestTab[] = ['overview', 'leaderboards', 'season']

function HeroLogo({ panel, tabLogo }: { panel?: boolean; tabLogo?: boolean }) {
  return (
    <div className={cn('tn-home-logo-wrap', panel && 'tn-home-logo-wrap-panel')}>
      <img
        src={BRAND_LOGO_PATH}
        alt={BRAND_LOGO_ALT}
        className={cn('tn-home-logo', panel && 'tn-home-logo-panel', tabLogo && 'tn-tab-hero-logo')}
        width={148}
        height={148}
        decoding="async"
      />
    </div>
  )
}

function PrizeSticker({ inline }: { inline?: boolean }) {
  return (
    <div
      className={cn('tn-hero-prize-sticker', inline && 'tn-hero-prize-sticker-inline')}
      aria-label={HERO_PRIZE_POOL_STICKER}
    >
      {HERO_PRIZE_POOL_STICKER}
    </div>
  )
}

/** PGCR-backed tab hero — logo, title, and mission copy (shared across all tabs). */
export default function TabPageHero({ tab, aside }: Props) {
  const copy = tabPageCopy(tab)
  const artKey = tabHeroArtKey(tab)
  const heroArt = navTabArtUrl(artKey) ?? homeSectionArtUrl('hero')
  const isBrand = copy.brand === true
  const showPrizeSticker = PRIZE_STICKER_TABS.includes(tab)
  const isHomeHero = artKey === 'overview'
  const isBrandHome = isBrand && Boolean(aside)

  return (
    <section
      className={cn(
        'tn-home-hero',
        isHomeHero && 'tn-home-hero-tower',
        isBrandHome && 'tn-home-hero-brand',
        !aside && 'tn-tab-hero-single'
      )}
      style={{ ['--tn-home-hero-art' as string]: `url('${heroArt}')` }}
    >
      <div className="tn-home-hero-overlay" aria-hidden />

      {isBrandHome ? (
        <>
          <div className="tn-home-hero-right-stack">
            {showPrizeSticker ? <PrizeSticker inline /> : null}
            {aside}
          </div>
          <div className="tn-home-hero-grid tn-home-hero-grid-brand">
            <div className="tn-home-hero-side-panel tn-home-hero-logo-panel">
              <HeroLogo panel />
            </div>
            <div className="tn-home-hero-center tn-home-hero-center-brand">
              <h2 className="tn-home-title">{copy.title}</h2>
              <p className="tn-home-mission tn-home-mission-brand">{copy.description}</p>
            </div>
          </div>
        </>
      ) : (
        <>
          {showPrizeSticker ? <PrizeSticker /> : null}
          <div className={cn('tn-home-hero-grid', !aside && 'tn-home-hero-grid-single')}>
            {aside}
            <div className="tn-home-hero-center">
              <HeroLogo tabLogo={!isBrand} />
              <h2 className={cn('tn-home-title', !isBrand && 'tn-tab-hero-title')}>{copy.title}</h2>
              <p className="tn-home-mission">{copy.description}</p>
            </div>
          </div>
        </>
      )}
    </section>
  )
}
