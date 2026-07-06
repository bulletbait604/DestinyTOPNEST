'use client'

import type { ActivityArmorSet } from '@/lib/destiny/activityArmorSets'
import {
  armorSetBonusTierIconRef,
  armorSetIconRef,
  lightGgArmorSetLinkTitle,
  lightGgArmorSetUrl,
} from '@/lib/destiny/activityArmorSets'
import { ItemIcon } from '@/app/components/destiny/DestinyUi'
import { getDestinyTheme } from '@/app/components/destiny/destinyTheme'
import { cn } from '@/lib/utils'

interface Props {
  set: ActivityArmorSet
  darkMode?: boolean
  compact?: boolean
}

function BonusTierLink({
  set,
  tier,
  compact,
}: {
  set: ActivityArmorSet
  tier: ActivityArmorSet['twoPiece']
  compact?: boolean
}) {
  const iconRef = armorSetBonusTierIconRef(set, tier)
  const url = lightGgArmorSetUrl(set)
  const title = `${tier.perkName} (${tier.requiredCount}-piece) — ${lightGgArmorSetLinkTitle(set)}`

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title={title}
      className={cn('tn-armor-set-tier group', compact && 'tn-armor-set-tier-compact')}
    >
      <ItemIcon item={iconRef} name={tier.perkName} size={compact ? 32 : 36} className="d2-loot-item-thumb shrink-0" />
      <span className="min-w-0">
        <span className="tn-armor-set-tier-label">
          {tier.requiredCount}-piece · {tier.perkName}
        </span>
        <span className="tn-armor-set-tier-desc">{tier.description}</span>
      </span>
    </a>
  )
}

/** Armor 3.0 set bonus panel — links to light.gg set bonus page. */
export default function ActivityArmorSetPanel({ set, darkMode = true, compact }: Props) {
  const t = getDestinyTheme(darkMode)
  const setIcon = armorSetIconRef(set)
  const url = lightGgArmorSetUrl(set)

  return (
    <div className={cn('tn-armor-set-panel', compact && 'tn-armor-set-panel-compact')}>
      <div className="tn-armor-set-header">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          title={lightGgArmorSetLinkTitle(set)}
          className="tn-armor-set-icon-link shrink-0"
        >
          <ItemIcon item={setIcon} name={set.setName} size={compact ? 40 : 44} className="d2-loot-item-thumb" />
        </a>
        <div className="min-w-0">
          <p className={cn('tn-armor-set-eyebrow', t.caption)}>Armor set bonus</p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            title={lightGgArmorSetLinkTitle(set)}
            className="tn-armor-set-name"
          >
            {set.setName}
          </a>
        </div>
      </div>
      <div className="tn-armor-set-tiers">
        <BonusTierLink set={set} tier={set.twoPiece} compact={compact} />
        <BonusTierLink set={set} tier={set.fourPiece} compact={compact} />
      </div>
    </div>
  )
}
