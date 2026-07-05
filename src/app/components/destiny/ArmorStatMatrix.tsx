'use client'

import { D2_STAT_COLORS } from '@/app/components/destiny/destinyTheme'
import { cn } from '@/lib/utils'

/** In-game character screen order: Mobility → Strength. */
const STAT_ORDER = [
  { key: 'Mobility' as const, label: 'Mobility' },
  { key: 'Resilience' as const, label: 'Resilience' },
  { key: 'Recovery' as const, label: 'Recovery' },
  { key: 'Discipline' as const, label: 'Discipline' },
  { key: 'Intellect' as const, label: 'Intellect' },
  { key: 'Strength' as const, label: 'Strength' },
] as const

function statValue(stats: Record<string, number>, key: string): number {
  const direct = stats[key]
  if (typeof direct === 'number') return direct
  const lower = stats[key.toLowerCase()]
  return typeof lower === 'number' ? lower : 0
}

/** light.gg / DIM-style horizontal stat bars (0–100). */
export default function ArmorStatMatrix({
  stats,
  tier = 100,
  compact,
}: {
  stats: Record<string, number>
  tier?: number
  compact?: boolean
}) {
  return (
    <div className={cn('d2-stat-matrix', compact && 'd2-stat-matrix-compact')}>
      {STAT_ORDER.map(({ key, label }) => {
        const value = statValue(stats, key)
        const pct = Math.min(100, Math.max(0, (value / tier) * 100))
        const color = D2_STAT_COLORS[key]

        return (
          <div key={key} className="d2-stat-matrix-row" title={`${label}: ${value}`}>
            <span className="d2-stat-matrix-label">{label}</span>
            <div className="d2-stat-matrix-track">
              <div
                className="d2-stat-matrix-fill"
                style={
                  {
                    width: `${pct}%`,
                    '--stat-color': color,
                  } as React.CSSProperties
                }
              />
            </div>
            <span className="d2-stat-matrix-value">{value}</span>
          </div>
        )
      })}
    </div>
  )
}
