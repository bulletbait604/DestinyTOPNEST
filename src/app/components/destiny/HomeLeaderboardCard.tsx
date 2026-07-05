'use client'

import type { LeaderboardEntry } from '@/lib/destiny/types'
import { GlassCard, ItemIcon, LeaderboardTable } from '@/app/components/destiny/DestinyUi'
import { cn } from '@/lib/utils'

interface Props {
  title: string
  subtitle?: string
  artUrl: string
  iconUrl?: string
  entries: LeaderboardEntry[]
  darkMode: boolean
}

/** Three-column home leaderboard tile with Bungie PGCR header art. */
export default function HomeLeaderboardCard({
  title,
  subtitle,
  artUrl,
  iconUrl,
  entries,
  darkMode,
}: Props) {
  return (
    <GlassCard darkMode={darkMode} padding="none" className="tn-home-lb-card overflow-hidden">
      <div
        className="tn-home-lb-header"
        style={{ ['--tn-home-lb-art' as string]: `url('${artUrl}')` }}
      >
        <div className="tn-home-lb-header-inner">
          {iconUrl ? <ItemIcon iconUrl={iconUrl} name={title} size={40} /> : null}
          <div className="min-w-0">
            <h3 className="tn-home-lb-title">{title}</h3>
            {subtitle ? <p className={cn('tn-home-lb-sub')}>{subtitle}</p> : null}
          </div>
        </div>
      </div>
      <div className="p-3 sm:p-4">
        <LeaderboardTable entries={entries} darkMode={darkMode} compact />
      </div>
    </GlassCard>
  )
}
