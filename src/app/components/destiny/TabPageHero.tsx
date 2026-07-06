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

function HeroLogo() {
  return (
    <div className="tn-home-logo-wrap tn-home-logo-wrap-panel">
      <img
        src={BRAND_LOGO_PATH}
        alt={BRAND_LOGO_ALT}
        className="tn-home-logo tn-home-logo-panel"
        width={148}
        height={148}
        decoding="async"
      />
    </div>
  )
}

function PrizeSticker() {
  return (
    <div className="tn-hero-prize-sticker tn-hero-prize-sticker-inline" aria-label={HERO_PRIZE_POOL_STICKER}>
      {HERO_PRIZE_POOL_STICKER}
    </div>
  )
}

/** PGCR-backed tab hero — logo left, title center (same layout on every tab). */
export default function TabPageHero({ tab, aside }: Props) {
  const copy = tabPageCopy(tab)
  const artKey = tabHeroArtKey(tab)
  const heroArt = navTabArtUrl(artKey) ?? homeSectionArtUrl('hero')
  const showPrizeSticker = PRIZE_STICKER_TABS.includes(tab)
  const isHomeHero = artKey === 'overview'
  const hasRightStack = showPrizeSticker || Boolean(aside)

  return (
    <section
      className={cn(
        'tn-home-hero tn-home-hero-brand',
        isHomeHero && 'tn-home-hero-tower',
        hasRightStack && 'tn-home-hero-has-right-stack'
      )}
      style={{ ['--tn-home-hero-art' as string]: `url('${heroArt}')` }}
    >
      <div className="tn-home-hero-overlay" aria-hidden />

      {hasRightStack ? (
        <div className="tn-home-hero-right-stack">
          {showPrizeSticker ? <PrizeSticker /> : null}
          {aside}
        </div>
      ) : null}

      <div className="tn-home-hero-grid tn-home-hero-grid-brand">
        <div className="tn-home-hero-side-panel tn-home-hero-logo-panel">
          <HeroLogo />
        </div>
        <div className="tn-home-hero-center tn-home-hero-center-brand">
          <h2 className="tn-home-title">{copy.title}</h2>
          {copy.description ? (
            <p className="tn-home-mission tn-home-mission-brand">{copy.description}</p>
          ) : null}
        </div>
      </div>
    </section>
  )
}
