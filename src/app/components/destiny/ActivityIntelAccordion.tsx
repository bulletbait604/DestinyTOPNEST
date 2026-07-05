'use client'

import { ChevronDown, Sparkles, Shield } from 'lucide-react'
import type { FeaturedActivity } from '@/lib/destiny/types'
import type { ActivityLootDrop } from '@/lib/destiny/activityLoot'
import { activityIntel } from '@/lib/destiny/activityIntel'
import { ItemIcon } from '@/app/components/destiny/DestinyUi'
import { cn } from '@/lib/utils'

function lootChipClass(kind: ActivityLootDrop['kind']) {
  if (kind === 'exotic') return 'd2-loot-chip-exotic'
  if (kind === 'catalyst') return 'd2-loot-chip-catalyst'
  return 'd2-loot-chip-legendary'
}

function LootSection({ loot }: { loot: NonNullable<ReturnType<typeof activityIntel>['loot']> }) {
  const exotics = loot.drops.filter((d) => d.kind === 'exotic' || d.kind === 'catalyst')
  const legendaries = loot.drops.filter((d) => d.kind === 'legendary')

  return (
    <div className="d2-loot-panel mt-3 space-y-3">
      {loot.tagline ? <p className="d2-loot-tagline">{loot.tagline}</p> : null}

      <div className="d2-loot-armor-banner">
        <Shield className="w-4 h-4 shrink-0 text-[var(--tn-arc)]" aria-hidden />
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
              <div key={drop.name} className={cn('d2-loot-chip', lootChipClass(drop.kind))}>
                <span className="d2-loot-chip-kind">{drop.kind === 'catalyst' ? 'Catalyst' : 'Exotic'}</span>
                <span className="d2-loot-chip-name">{drop.name}</span>
                {drop.note ? <span className="d2-loot-chip-note">{drop.note}</span> : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {legendaries.length > 0 ? (
        <div>
          <p className="d2-loot-section-label d2-loot-section-label-muted">Featured weapons</p>
          <div className="d2-loot-grid d2-loot-grid-compact">
            {legendaries.map((drop) => (
              <div key={drop.name} className={cn('d2-loot-chip', lootChipClass(drop.kind))}>
                <span className="d2-loot-chip-name">{drop.name}</span>
                {drop.note ? <span className="d2-loot-chip-note">{drop.note}</span> : null}
              </div>
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

  return (
    <details className="d2-wiki-box group" open>
      <summary className="d2-wiki-box-summary list-none cursor-pointer">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {activity.iconUrl ? (
            <ItemIcon iconUrl={activity.iconUrl} name={activity.name} size={44} />
          ) : (
            <div className="d2-item-thumb d2-rarity-legendary w-11 h-11 rounded-sm shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <p className="d2-wiki-box-title truncate">{activity.name}</p>
            <p className="d2-wiki-box-meta">
              {kind === 'raid' ? 'Raid' : 'Dungeon'} Â· {intel.difficulty}
              {intel.resetsIn ? ` Â· ${intel.resetsIn}` : ''}
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
}: {
  raids: FeaturedActivity[]
  dungeons: FeaturedActivity[]
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div className="space-y-2">
        <p className="d2-panel-header-title text-[10px] mb-2">Featured raids</p>
        {raids.map((r) => (
          <IntelBox key={r.name} activity={r} kind="raid" />
        ))}
      </div>
      <div className="space-y-2">
        <p className="d2-panel-header-title text-[10px] mb-2">Featured dungeons</p>
        {dungeons.map((d) => (
          <IntelBox key={d.name} activity={d} kind="dungeon" />
        ))}
      </div>
    </div>
  )
}
