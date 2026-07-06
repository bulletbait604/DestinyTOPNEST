'use client'

import {
  ARMOR_STAT_ORDER,
  D2_ARMOR_STAT_COLORS,
  armorStatValue,
  type ArmorStatKey,
} from '@/lib/destiny/armorStats'
import StatBenefitTooltip from '@/app/components/destiny/StatBenefitTooltip'
import { cn } from '@/lib/utils'

/** Armor 3.0 horizontal stat bars (0–200 per stat). */
export default function ArmorStatMatrix({
  stats,
  tier = 200,
  compact,
  ingame,
  loadout,
}: {
  stats: Record<string, number>
  tier?: number
  compact?: boolean
  ingame?: boolean
  /** Large stats panel for profile loadout cards — matches weapons column height. */
  loadout?: boolean
}) {
  return (
    <div
      className={cn(
        'd2-stat-matrix',
        compact && 'd2-stat-matrix-compact',
        ingame && 'd2-stat-matrix-ingame',
        loadout && 'd2-stat-matrix-loadout'
      )}
    >
      {ARMOR_STAT_ORDER.map(({ key, legacyKey, label }) => {
        const value = armorStatValue(stats, key, legacyKey)
        const pct = Math.min(100, Math.max(0, (value / tier) * 100))
        const color = D2_ARMOR_STAT_COLORS[key as ArmorStatKey]

        return (
          <StatBenefitTooltip key={key} statKey={key as ArmorStatKey} label={label} value={value}>
            <div className="d2-stat-matrix-row">
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
          </StatBenefitTooltip>
        )
      })}
    </div>
  )
}
