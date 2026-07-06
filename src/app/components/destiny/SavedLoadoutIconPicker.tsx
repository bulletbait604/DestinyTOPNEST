'use client'

import {
  buildLoadoutPickerEntries,
  loadoutArchetypeIcon,
  type LoadoutPickerEntry,
} from '@/lib/destiny/loadoutArchetype'
import { ItemIcon } from '@/app/components/destiny/DestinyUi'
import { getDestinyTheme } from '@/app/components/destiny/destinyTheme'
import type { BuildSnapshot } from '@/lib/destiny/types'
import { cn } from '@/lib/utils'

export default function SavedLoadoutIconPicker({
  current,
  saved,
  selectedId,
  onSelect,
  darkMode,
}: {
  current?: BuildSnapshot | null
  saved?: BuildSnapshot[]
  selectedId: string | null
  onSelect: (entry: LoadoutPickerEntry) => void
  darkMode: boolean
}) {
  const t = getDestinyTheme(darkMode)
  const entries = buildLoadoutPickerEntries(current, saved)

  if (!entries.length) return null

  return (
    <div className="flex flex-wrap gap-2">
      {entries.map((entry) => {
        const { iconUrl, label, ref } = loadoutArchetypeIcon(entry.build)
        const selected = selectedId === entry.id

        return (
          <button
            key={entry.id}
            type="button"
            onClick={() => onSelect(entry)}
            title={entry.title}
            className={cn(
              'group relative flex flex-col items-center gap-1.5 rounded-xl p-2 min-w-[72px] transition-all',
              'border bg-white/[0.03] hover:bg-white/[0.08]',
              selected
                ? 'border-amber-400/60 ring-2 ring-amber-400/30 bg-amber-500/10'
                : 'border-white/10 hover:border-amber-500/30'
            )}
          >
            <div className="relative">
              <ItemIcon
                item={ref}
                name={label}
                iconUrl={iconUrl}
                size={52}
                square={false}
                className={cn(
                  'rounded-lg border border-white/10 shadow-md',
                  entry.build.loadoutIncomplete && 'opacity-75'
                )}
              />
              {entry.kind === 'equipped' ? (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-black/40" />
              ) : null}
            </div>
            <span
              className={cn(
                'text-[10px] leading-tight text-center max-w-[68px] truncate',
                selected ? t.gold : t.muted
              )}
            >
              {entry.kind === 'equipped' ? 'Equipped' : entry.title}
            </span>
          </button>
        )
      })}
    </div>
  )
}
