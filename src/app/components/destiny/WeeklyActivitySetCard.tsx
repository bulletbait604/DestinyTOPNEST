'use client'

import { ChevronDown } from 'lucide-react'
import type { FeaturedActivity } from '@/lib/destiny/types'
import { activityArmorSet } from '@/lib/destiny/activityArmorSets'
import { activityIntel } from '@/lib/destiny/activityIntel'
import { ActivityIntelSections } from '@/app/components/destiny/ActivityIntelSections'
import ActivityArmorSetPanel from '@/app/components/destiny/ActivityArmorSetPanel'
import { activityWalkthroughLinkTitle, activityWalkthroughUrl } from '@/lib/destiny/activityWalkthroughLinks'
import { ItemIcon } from '@/app/components/destiny/DestinyUi'
import { getDestinyTheme } from '@/app/components/destiny/destinyTheme'
import { cn } from '@/lib/utils'

interface Props {
  label: string
  activity: FeaturedActivity
  kind: 'raid' | 'dungeon' | 'pantheon'
  resetsIn?: string
  darkMode: boolean
}

/** Home rotation tile — activity header, armor set, and expandable loot intel. */
export default function WeeklyActivitySetCard({ label, activity, kind, resetsIn, darkMode }: Props) {
  const t = getDestinyTheme(darkMode)
  const armorSet = activityArmorSet(activity.name) ?? (kind === 'pantheon' ? activityArmorSet('Pantheon') : null)
  const walkthrough = activityWalkthroughUrl(activity.name)
  const kindLabel = kind === 'raid' ? 'Raid' : kind === 'dungeon' ? 'Dungeon' : 'Pantheon'
  const showIntel = kind === 'raid' || kind === 'dungeon'
  const intel = showIntel ? activityIntel({ ...activity, resetsIn: activity.resetsIn ?? resetsIn }) : null

  const showIntelDetails = showIntel || Boolean(armorSet)

  return (
    <article className="tn-weekly-activity-card">
      <div className="tn-weekly-activity-head">
        <a
          href={walkthrough.url}
          target="_blank"
          rel="noopener noreferrer"
          title={activityWalkthroughLinkTitle(activity.name)}
          className="tn-weekly-activity-icon shrink-0"
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
          <p className="tn-weekly-activity-label">{label}</p>
          <p className={cn('tn-weekly-activity-name truncate', t.heading)}>{activity.name}</p>
          <p className={cn('tn-weekly-activity-meta', t.muted)}>
            {kindLabel}
            {intel ? ` · ${intel.difficulty}` : ''}
            {resetsIn ? ` · Resets ${resetsIn}` : ''}
          </p>
        </div>
      </div>

      {showIntelDetails ? (
        <details className="tn-weekly-activity-intel group">
          <summary className="tn-weekly-activity-intel-summary list-none cursor-pointer">
            <span>Chase Loot & Tips</span>
            <ChevronDown className="tn-weekly-activity-intel-chevron w-4 h-4 shrink-0" aria-hidden />
          </summary>
          {showIntel ? (
            <ActivityIntelSections
              activity={activity}
              resetsIn={resetsIn}
              armorSet={armorSet}
              darkMode={darkMode}
            />
          ) : armorSet ? (
            <div className="tn-weekly-activity-intel-body">
              <ActivityArmorSetPanel set={armorSet} darkMode={darkMode} compact />
            </div>
          ) : (
            <div className="tn-weekly-activity-intel-body">
              <p className={cn('text-[11px] px-1 py-2', t.muted)}>Armor set data coming soon.</p>
            </div>
          )}
        </details>
      ) : null}
    </article>
  )
}
