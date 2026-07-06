'use client'

import type { ArmorSetBonusGroup } from '@/lib/destiny/types'
import { ItemIcon } from '@/app/components/destiny/DestinyUi'
import { getDestinyTheme } from '@/app/components/destiny/destinyTheme'
import { cn } from '@/lib/utils'

export default function ArmorSetBonusSection({
  groups,
  darkMode,
}: {
  groups: ArmorSetBonusGroup[]
  darkMode: boolean
}) {
  const t = getDestinyTheme(darkMode)

  if (!groups.length) return null

  return (
    <div className="space-y-3">
      <p className={cn('d2-build-section-heading', t.caption)}>Armor set bonuses</p>
      <div className="space-y-2.5">
        {groups.map((group) => (
          <div key={group.setName} className="rounded-lg border border-white/[0.08] bg-black/20 p-3">
            <div className="flex items-center gap-2 mb-2">
              {group.setRef?.iconUrl ? (
                <ItemIcon item={group.setRef} size={32} />
              ) : (
                <div className="w-8 h-8 rounded-sm bg-white/[0.06] ring-1 ring-white/10 shrink-0" />
              )}
              <div className="min-w-0">
                <p className={cn('font-semibold text-sm truncate', t.heading)}>{group.setName}</p>
                <p className={cn('text-[11px]', t.muted)}>
                  {group.pieceCount} legendary {group.pieceCount === 1 ? 'piece' : 'pieces'} equipped
                </p>
              </div>
            </div>
            <ul className="space-y-1.5">
              {group.bonuses.map((bonus) => (
                <li
                  key={`${group.setName}-${bonus.requiredCount}`}
                  className={cn(
                    'flex items-start gap-2 text-[13px] leading-snug',
                    bonus.active ? 'text-white/90' : 'text-white/45'
                  )}
                >
                  {bonus.perkRef?.iconUrl ? (
                    <ItemIcon item={bonus.perkRef} size={22} className="mt-0.5 shrink-0" />
                  ) : (
                    <span
                      className={cn(
                        'mt-1 w-2 h-2 rounded-full shrink-0',
                        bonus.active ? 'bg-d2-gold shadow-[0_0_8px_rgba(245,220,86,0.45)]' : 'bg-white/20'
                      )}
                      aria-hidden
                    />
                  )}
                  <span>
                    <span className="font-semibold">{bonus.requiredCount}-piece:</span>{' '}
                    {bonus.description ?? bonus.name}
                    {!bonus.active ? (
                      <span className={cn('ml-1 text-[11px] uppercase tracking-wide', t.muted)}>
                        (need {bonus.requiredCount - group.pieceCount} more)
                      </span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
