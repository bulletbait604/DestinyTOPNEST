'use client'

import type { LeaderboardEntry } from '@/lib/destiny/types'
import { BRAND_FULL, BRAND_LOGO_ALT, BRAND_LOGO_PATH, BRAND_MISSION } from '@/lib/destiny/branding'
import { homeSectionArtUrl } from '@/lib/destiny/navArt'
import { LeaderboardTable } from '@/app/components/destiny/DestinyUi'

interface Props {
  darkMode: boolean
  soloPreview: LeaderboardEntry[]
}

/** Wireframe-style home hero — crest, mission copy, and solo leaderboard preview. */
export default function HomeHero({ darkMode, soloPreview }: Props) {
  const heroArt = homeSectionArtUrl('hero')

  return (
    <section
      className="tn-home-hero"
      style={{ ['--tn-home-hero-art' as string]: `url('${heroArt}')` }}
    >
      <div className="tn-home-hero-overlay" aria-hidden />
      <div className="tn-home-hero-grid">
        <aside className="tn-home-solo-preview">
          <p className="tn-home-solo-label">Solo Leaderboard</p>
          <LeaderboardTable entries={soloPreview.slice(0, 3)} darkMode={darkMode} compact />
        </aside>

        <div className="tn-home-hero-center">
          <div className="tn-home-logo-wrap">
            <img
              src={BRAND_LOGO_PATH}
              alt={BRAND_LOGO_ALT}
              className="tn-home-logo"
              width={148}
              height={148}
              decoding="async"
            />
          </div>
          <h2 className="tn-home-title">{BRAND_FULL}</h2>
          <p className="tn-home-mission">{BRAND_MISSION}</p>
        </div>
      </div>
    </section>
  )
}
