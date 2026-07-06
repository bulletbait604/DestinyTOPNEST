'use client'

import type { FeaturedActivity } from '@/lib/destiny/types'
import { activityArmorSet } from '@/lib/destiny/activityArmorSets'
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

/** Home rotation tile — activity name + droppable armor set bonuses. */
export default function WeeklyActivitySetCard({ label, activity, kind, resetsIn, darkMode }: Props) {
  const t = getDestinyTheme(darkMode)
  const armorSet = activityArmorSet(activity.name) ?? (kind === 'pantheon' ? activityArmorSet('Pantheon') : null)
  const walkthrough = activityWalkthroughUrl(activity.name)
  const kindLabel = kind === 'raid' ? 'Raid' : kind === 'dungeon' ? 'Dungeon' : 'Pantheon'

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
            size={36}
          />
        </a>
        <div className="min-w-0 flex-1">
          <p className="tn-weekly-activity-label">{label}</p>
          <p className={cn('tn-weekly-activity-name truncate', t.heading)}>{activity.name}</p>
          <p className={cn('tn-weekly-activity-meta', t.muted)}>
            {kindLabel}
            {resetsIn ? ` · Resets ${resetsIn}` : ''}
          </p>
        </div>
      </div>

      {armorSet ? (
        <ActivityArmorSetPanel set={armorSet} darkMode={darkMode} compact />
      ) : (
        <p className={cn('text-[11px] px-1 py-2', t.muted)}>Armor set data coming soon.</p>
      )}
    </article>
  )
}
