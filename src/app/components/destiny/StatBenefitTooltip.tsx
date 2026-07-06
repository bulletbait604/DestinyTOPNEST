'use client'

import {
  ARMOR_STAT_BENEFITS,
  armorStatBenefitSummary,
  type ArmorStatKey,
} from '@/lib/destiny/armorStats'
import { cn } from '@/lib/utils'

function BenefitList({ items, active }: { items: readonly string[]; active: boolean }) {
  return (
    <ul className={cn('d2-stat-benefit-list', active && 'd2-stat-benefit-list-active')}>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  )
}

/** Hover tooltip explaining Armor 3.0 stat tier benefits. */
export default function StatBenefitTooltip({
  statKey,
  label,
  value,
  children,
}: {
  statKey: ArmorStatKey
  label: string
  value: number
  children: React.ReactNode
}) {
  const { base, bonus } = ARMOR_STAT_BENEFITS[statKey]
  const inBonusTier = value > 100

  return (
    <div
      className="d2-stat-row-tooltip-wrap"
      title={armorStatBenefitSummary(statKey, value)}
      tabIndex={0}
    >
      {children}
      <div className="d2-stat-row-tooltip" role="tooltip">
        <p className="d2-stat-row-tooltip-heading">
          <span>{label}</span>
          <span className="d2-stat-row-tooltip-value">{value}</span>
        </p>
        <div className="d2-stat-row-tooltip-tiers">
          <div className={cn('d2-stat-benefit-tier', !inBonusTier && 'd2-stat-benefit-tier-active')}>
            <p className="d2-stat-benefit-tier-label">1–100</p>
            <BenefitList items={base} active={!inBonusTier} />
          </div>
          <div className={cn('d2-stat-benefit-tier', inBonusTier && 'd2-stat-benefit-tier-active')}>
            <p className="d2-stat-benefit-tier-label">101–200</p>
            <BenefitList items={bonus} active={inBonusTier} />
          </div>
        </div>
      </div>
    </div>
  )
}
