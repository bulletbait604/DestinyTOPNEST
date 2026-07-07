'use client'

import { X } from 'lucide-react'
import type { ArmorSlotLabel } from '@/lib/destiny/types'
import { armorSlotLabel } from '@/lib/destiny/loadoutDisplay'
import ArmorStatMatrix from '@/app/components/destiny/ArmorStatMatrix'
import { ItemIcon } from '@/app/components/destiny/DestinyUi'
import { getDestinyTheme } from '@/app/components/destiny/destinyTheme'
import { cn } from '@/lib/utils'

export type ArmorPickerOption = {
  name: string
  hash: number
  itemInstanceId: string
  location: 'character' | 'vault' | 'other_character'
  stats: Record<string, number>
  iconUrl?: string
  tierLabel?: string
  similarityScore: number
  matchesRecommended: boolean
}

interface Props {
  darkMode: boolean
  slot: ArmorSlotLabel
  recommendedName?: string
  statPriorities?: string[]
  options: ArmorPickerOption[]
  selectedName?: string
  onSelect: (option: ArmorPickerOption) => void
  onClose: () => void
}

function locationLabel(location: ArmorPickerOption['location']): string {
  if (location === 'vault') return 'Vault'
  if (location === 'other_character') return 'Alt character'
  return 'On guardian'
}

export default function MetaBuildArmorPickerModal({
  darkMode,
  slot,
  recommendedName,
  statPriorities,
  options,
  selectedName,
  onSelect,
  onClose,
}: Props) {
  const t = getDestinyTheme(darkMode)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div
        className="relative w-full max-w-lg max-h-[85vh] overflow-hidden rounded-2xl ring-1 ring-white/10 bg-gradient-to-b from-[#1a1f2e] to-[#12151d] shadow-2xl flex flex-col"
        role="dialog"
        aria-labelledby="armor-picker-title"
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-white/[0.08]">
          <div>
            <h3 id="armor-picker-title" className={cn('text-lg font-bold', t.heading)}>
              Choose {armorSlotLabel(slot)}
            </h3>
            <p className={cn('text-xs mt-1', t.muted)}>
              {recommendedName ? `Recommended: ${recommendedName}` : 'Pick from your inventory'}
              {statPriorities?.length ? ` · Focus: ${statPriorities.join(', ')}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={cn('p-1.5 rounded-lg', t.muted)}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-3 space-y-2">
          {!options.length ? (
            <p className={cn('text-sm text-center py-8', t.muted)}>
              No legendary {armorSlotLabel(slot).toLowerCase()} pieces found on this guardian or in your vault.
            </p>
          ) : (
            options.map((option) => {
              const selected = selectedName === option.name
              return (
                <button
                  key={option.itemInstanceId}
                  type="button"
                  onClick={() => {
                    onSelect(option)
                    onClose()
                  }}
                  className={cn(
                    'w-full flex items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors',
                    'border bg-black/30 hover:bg-white/[0.06]',
                    selected ? 'border-amber-400/50 ring-1 ring-amber-400/30' : 'border-white/[0.08]'
                  )}
                >
                  <ItemIcon
                    iconUrl={option.iconUrl}
                    name={option.name}
                    size={48}
                    className="rounded-lg shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className={cn('text-sm font-semibold truncate', t.body)}>{option.name}</p>
                      {option.matchesRecommended ? (
                        <span className="text-[10px] uppercase tracking-wide text-emerald-300/90">Recommended piece</span>
                      ) : null}
                    </div>
                    <p className={cn('text-[11px] mt-0.5', t.muted)}>
                      {locationLabel(option.location)}
                      {option.tierLabel ? ` · ${option.tierLabel}` : ''}
                      {option.similarityScore > 0 ? ` · match ${Math.round(option.similarityScore)}` : ''}
                    </p>
                    {Object.keys(option.stats).length ? (
                      <div className="mt-2 scale-[0.92] origin-left">
                        <ArmorStatMatrix stats={option.stats} compact tier={200} />
                      </div>
                    ) : null}
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
