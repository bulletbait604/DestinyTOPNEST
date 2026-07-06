'use client'

import { Sparkles } from 'lucide-react'
import type { FeaturedActivity } from '@/lib/destiny/types'
import type { ActivityLootDrop, ActivityLootIntel } from '@/lib/destiny/activityLoot'
import type { ActivityArmorSet } from '@/lib/destiny/activityArmorSets'
import { activityIntel } from '@/lib/destiny/activityIntel'
import ActivityArmorSetPanel from '@/app/components/destiny/ActivityArmorSetPanel'
import { lootDropIconRef } from '@/lib/destiny/activityLoot'
import { ItemExternalLink, ItemLink } from '@/app/components/destiny/ItemLink'
import { ItemIcon } from '@/app/components/destiny/DestinyUi'
import { cn } from '@/lib/utils'

function lootChipClass(kind: ActivityLootDrop['kind']) {
  if (kind === 'exotic') return 'd2-loot-chip-exotic'
  if (kind === 'catalyst') return 'd2-loot-chip-catalyst'
  return 'd2-loot-chip-legendary'
}

function LootDropChip({ drop }: { drop: ActivityLootDrop }) {
  const iconRef = lootDropIconRef(drop)

  return (
    <div className={cn('d2-loot-chip', lootChipClass(drop.kind))}>
      <ItemExternalLink item={iconRef} className="d2-loot-chip-icon shrink-0">
        <ItemIcon item={iconRef} name={drop.name} size={44} className="d2-loot-item-thumb" />
      </ItemExternalLink>
      <div className="d2-loot-chip-body min-w-0">
        <span className="d2-loot-chip-kind">
          {drop.kind === 'catalyst' ? 'Catalyst' : drop.kind === 'exotic' ? 'Exotic' : 'Legendary'}
        </span>
        <ItemLink item={iconRef} className="d2-loot-chip-name block truncate" />
        {drop.note ? <span className="d2-loot-chip-note">{drop.note}</span> : null}
      </div>
    </div>
  )
}

export function ActivityLootSection({ loot }: { loot: ActivityLootIntel }) {
  const exotics = loot.drops.filter((d) => d.kind === 'exotic' || d.kind === 'catalyst')
  const legendaries = loot.drops.filter((d) => d.kind === 'legendary')

  return (
    <div className="d2-loot-panel space-y-3">
      {loot.tagline ? <p className="d2-loot-tagline">{loot.tagline}</p> : null}

      {exotics.length > 0 ? (
        <div>
          <p className="d2-loot-section-label">
            <Sparkles className="w-3.5 h-3.5" aria-hidden />
            Most wanted drops
          </p>
          <div className="d2-loot-grid">
            {exotics.map((drop) => (
              <LootDropChip key={drop.name} drop={drop} />
            ))}
          </div>
        </div>
      ) : null}

      {legendaries.length > 0 ? (
        <div>
          <p className="d2-loot-section-label d2-loot-section-label-muted">Featured weapons</p>
          <div className="d2-loot-grid d2-loot-grid-compact">
            {legendaries.map((drop) => (
              <LootDropChip key={drop.name} drop={drop} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

/** Lore, armor set, exotic loot, and tips — nested under weekly activity cards. */
export function ActivityIntelSections({
  activity,
  resetsIn,
  armorSet,
  darkMode = true,
}: {
  activity: FeaturedActivity
  resetsIn?: string
  armorSet?: ActivityArmorSet | null
  darkMode?: boolean
}) {
  const intel = activityIntel({ ...activity, resetsIn: activity.resetsIn ?? resetsIn })

  return (
    <div className="tn-weekly-activity-intel-body">
      {armorSet ? (
        <div className="tn-weekly-activity-intel-armor">
          <ActivityArmorSetPanel set={armorSet} darkMode={darkMode} compact />
        </div>
      ) : null}
      <p className="d2-wiki-box-summary-text">{intel.summary}</p>
      {intel.loot ? <ActivityLootSection loot={intel.loot} /> : null}
      <ul className="d2-wiki-box-tips">
        {intel.tips.map((tip) => (
          <li key={tip}>{tip}</li>
        ))}
      </ul>
    </div>
  )
}
