'use client'

import type { ProfileFlexStat } from '@/lib/destiny/types'
import { StatCard } from '@/app/components/destiny/DestinyUi'
import { cn } from '@/lib/utils'

interface Props {
  stats: ProfileFlexStat[]
  darkMode: boolean
}

/** Live preview of the Guardian stat card selection. */
export default function StatCardPreview({ stats, darkMode }: Props) {
  if (!stats.length) return null

  return (
    <div className="d2-stat-card-preview">
      <p className="d2-stat-card-preview-label">Card preview</p>
      <div className="d2-stat-card-preview-grid">
        {stats.map((stat) => (
          <StatCard
            key={stat.id}
            label={stat.label}
            value={stat.value}
            sub={stat.detail}
            darkMode={darkMode}
          />
        ))}
      </div>
      <p className={cn('d2-stat-card-preview-note')}>
        These stats appear on your public Guardian card.
      </p>
    </div>
  )
}
