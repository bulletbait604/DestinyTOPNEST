'use client'

import { ChevronDown, Sparkles, Shield } from 'lucide-react'
import type { FeaturedActivity } from '@/lib/destiny/types'
import type { ActivityLootDrop, ActivityLootIntel } from '@/lib/destiny/activityLoot'
import { activityIntel } from '@/lib/destiny/activityIntel'
import { lootArmorSetIconRef, lootDropIconRef } from '@/lib/destiny/activityLoot'
import { activityWalkthroughLinkTitle, activityWalkthroughUrl } from '@/lib/destiny/activityWalkthroughLinks'
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
        <span className="d2-loot-chip-kind">{drop.kind === 'catalyst' ? 'Catalyst' : drop.kind === 'exotic' ? 'Exotic' : 'Legendary'}</span>
        <ItemLink item={iconRef} className="d2-loot-chip-name block truncate" />
        {drop.note ? <span className="d2-loot-chip-note">{drop.note}</span> : null}
      </div>
    </div>
  )
}

function LootSection({ loot }: { loot: ActivityLootIntel }) {
  const exotics = loot.drops.filter((d) => d.kind === 'exotic' || d.kind === 'catalyst')
  const legendaries = loot.drops.filter((d) => d.kind === 'legendary')
  const setIcon = lootArmorSetIconRef(loot)

  return (
    <div className="d2-loot-panel mt-3 space-y-3">
      {loot.tagline ? <p className="d2-loot-tagline">{loot.tagline}</p> : null}

      <div className="d2-loot-armor-banner">
        {setIcon ? (
          <ItemExternalLink item={setIcon} className="shrink-0">
            <ItemIcon item={setIcon} name={setIcon.name} size={44} className="d2-loot-item-thumb" />
          </ItemExternalLink>
        ) : (
          <Shield className="w-9 h-9 shrink-0 text-[var(--tn-arc)]" aria-hidden />
        )}
        <div className="min-w-0">
          <p className="d2-loot-armor-label">Armor set</p>
          <p className="d2-loot-armor-name">{loot.armorSet.name}</p>
          {loot.armorSet.note ? <p className="d2-loot-armor-note">{loot.armorSet.note}</p> : null}
        </div>
      </div>

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

function IntelBox({
  activity,
  kind,
}: {
  activity: FeaturedActivity
  kind: 'raid' | 'dungeon'
}) {
  const intel = activityIntel(activity)
  const walkthrough = activityWalkthroughUrl(activity.name)

  return (
    <details className="d2-wiki-box group" open>
      <summary className="d2-wiki-box-summary list-none cursor-pointer">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <a
            href={walkthrough.url}
            target="_blank"
            rel="noopener noreferrer"
            title={activityWalkthroughLinkTitle(activity.name)}
            className="shrink-0 rounded-lg transition-transform hover:scale-105"
            onClick={(e) => e.stopPropagation()}
          >
            <ItemIcon
              item={{
                name: activity.name,
                hash: activity.hash,
                iconUrl: activity.iconUrl,
                entityType: 'DestinyActivityDefinition',
              }}
              name={activity.name}
              size={44}
            />
          </a>
          <div className="min-w-0 flex-1">
            <p className="d2-wiki-box-title truncate">{activity.name}</p>
            <p className="d2-wiki-box-meta">
              {kind === 'raid' ? 'Raid' : 'Dungeon'} · {intel.difficulty}
              {intel.resetsIn ? ` · ${intel.resetsIn}` : ''}
            </p>
          </div>
        </div>
        <ChevronDown className="d2-wiki-box-chevron w-4 h-4 shrink-0 text-white/40 group-open:rotate-180 transition-transform" />
      </summary>
      <div className="d2-wiki-box-body">
        <p className="d2-wiki-box-summary-text">{intel.summary}</p>
        {intel.loot ? <LootSection loot={intel.loot} /> : null}
        <ul className="d2-wiki-box-tips">
          {intel.tips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </div>
    </details>
  )
}

/** Destinypedia-style collapsible activity intel panels with loot highlights. */
export default function ActivityIntelAccordion({
  raids,
  dungeons,
  embedded,
}: {
  raids: FeaturedActivity[]
  dungeons: FeaturedActivity[]
  /** When true, omit outer column headers (parent panel already titled). */
  embedded?: boolean
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div className="space-y-2">
        {!embedded ? <p className="d2-panel-header-title text-[10px] mb-2">Featured raids</p> : null}
        {raids.map((r) => (
          <IntelBox key={r.name} activity={r} kind="raid" />
        ))}
      </div>
      <div className="space-y-2">
        {!embedded ? <p className="d2-panel-header-title text-[10px] mb-2">Featured dungeons</p> : null}
        {dungeons.map((d) => (
          <IntelBox key={d.name} activity={d} kind="dungeon" />
        ))}
      </div>
    </div>
  )
}
