'use client'

import type { ReactNode } from 'react'
import type { DestinyTopNestTab } from '@/lib/destiny/types'
import { BRAND_LOGO_ALT, BRAND_LOGO_PATH } from '@/lib/destiny/branding'
import { navTabArtUrl, homeSectionArtUrl } from '@/lib/destiny/navArt'
import { HERO_PRIZE_POOL_STICKER } from '@/lib/destiny/seasonConfig'
import { tabHeroArtKey, tabPageCopy } from '@/lib/destiny/tabPageCopy'
import { navigateProfileSection } from '@/lib/routing/tabUrl'
import { cn } from '@/lib/utils'

interface Props {
  tab: DestinyTopNestTab
  aside?: ReactNode
}

const PRIZE_STICKER_TABS: DestinyTopNestTab[] = [
  'overview',
  'leaderboards',
  'season',
  'fireteam',
  'clans',
  'loadouts',
  'builds',
]

const PRIZE_UNDER_TITLE_TABS: DestinyTopNestTab[] = ['leaderboards', 'season']

/** Main nav tabs — larger hero title, description, and prize sticker than admin/compact default. */
const ENLARGED_TAB_HERO_TABS: DestinyTopNestTab[] = [
  'leaderboards',
  'season',
  'profile',
  'fireteam',
  'clans',
  'loadouts',
  'builds',
]

function HeroLogo({ compact }: { compact?: boolean }) {
  return (
    <div className={cn('tn-home-logo-wrap tn-home-logo-wrap-panel', compact && 'tn-home-logo-wrap-compact')}>
      <img
        src={BRAND_LOGO_PATH}
        alt={BRAND_LOGO_ALT}
        className={cn('tn-home-logo tn-home-logo-panel', compact && 'tn-home-logo-panel-compact')}
        width={compact ? 88 : 148}
        height={compact ? 88 : 148}
        decoding="async"
      />
    </div>
  )
}

function PrizeSticker({ className }: { className?: string }) {
  return (
    <div
      className={cn('tn-hero-prize-sticker tn-hero-prize-sticker-inline', className)}
      aria-label={HERO_PRIZE_POOL_STICKER}
    >
      {HERO_PRIZE_POOL_STICKER}
    </div>
  )
}

function HeroMvpCallout({ compact }: { compact?: boolean }) {
  return (
    <button
      type="button"
      className={cn('tn-home-hero-mvp-callout', compact && 'tn-home-hero-mvp-callout-compact')}
      onClick={() => navigateProfileSection('activities')}
    >
      <span className="tn-home-hero-mvp-callout-text">
        Vote run MVP&apos;s and rank your fireteam members in Unranked Runs in the Profile Tab.
      </span>
    </button>
  )
}

/** PGCR-backed tab hero — logo left, title center (same layout on every tab). */
export default function TabPageHero({ tab, aside }: Props) {
  const copy = tabPageCopy(tab)
  const artKey = tabHeroArtKey(tab)
  const heroArt = navTabArtUrl(artKey) ?? homeSectionArtUrl('hero')
  const isHomeHero = artKey === 'overview'
  const compact = !isHomeHero
  const enlargedTabHero = ENLARGED_TAB_HERO_TABS.includes(tab)
  const showPrizeSticker = PRIZE_STICKER_TABS.includes(tab)
  const prizeUnderTitle = showPrizeSticker && PRIZE_UNDER_TITLE_TABS.includes(tab)
  const prizeInRightStack = showPrizeSticker && !prizeUnderTitle
  const hasRightStack = prizeInRightStack || Boolean(aside)
  const showMvpCallout = tab !== 'admin'

  return (
    <section
      className={cn(
        'tn-home-hero tn-home-hero-brand',
        isHomeHero && 'tn-home-hero-tower',
        compact && 'tn-home-hero-compact',
        enlargedTabHero && 'tn-home-hero-tab',
        hasRightStack && 'tn-home-hero-has-right-stack',
        showMvpCallout && 'tn-home-hero-has-mvp-callout'
      )}
      style={{ ['--tn-home-hero-art' as string]: `url('${heroArt}')` }}
    >
      <div className="tn-home-hero-overlay" aria-hidden />

      {hasRightStack ? (
        <div className="tn-home-hero-right-stack">
          {prizeInRightStack ? <PrizeSticker /> : null}
          {aside}
        </div>
      ) : null}

      <div className="tn-home-hero-grid tn-home-hero-grid-brand">
        <div className="tn-home-hero-side-panel tn-home-hero-logo-panel">
          <HeroLogo compact={compact} />
        </div>
        {showMvpCallout ? <HeroMvpCallout compact={compact} /> : null}
        <div className="tn-home-hero-center tn-home-hero-center-brand">
          <h2 className="tn-home-title">{copy.title}</h2>
          {prizeUnderTitle ? <PrizeSticker className="tn-hero-prize-sticker-below-title" /> : null}
          {copy.description ? (
            <p className="tn-home-mission tn-home-mission-brand">{copy.description}</p>
          ) : null}
        </div>
      </div>
    </section>
  )
}
