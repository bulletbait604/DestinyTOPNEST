'use client'

import type { DestinyIconRef } from '@/lib/destiny/types'
import { ItemExternalLink, ItemLink } from '@/app/components/destiny/ItemLink'
import { ItemIcon } from '@/app/components/destiny/DestinyUi'
import {
  D2_ELEMENTS,
  elementFromLabel,
  tierBorderClass,
} from '@/app/components/destiny/destinyTheme'
import { cn } from '@/lib/utils'
import type { ArmoryRow } from '@/app/components/destiny/WeaponArmoryTable'

function tierShort(tier?: string) {
  const t = (tier ?? '').toLowerCase()
  if (t.includes('exotic')) return 'Exotic'
  if (t.includes('legendary')) return 'Legendary'
  if (t.includes('rare')) return 'Rare'
  return tier ?? '—'
}

function ElementStripe({ label }: { label?: string }) {
  const el = elementFromLabel(label)
  if (!el) return <span className="d2-armory-element d2-armory-element-neutral" title="Kinetic" />
  return (
    <span
      className={cn('d2-armory-element', `d2-element-${el}`)}
      style={{ '--d2-el': D2_ELEMENTS[el] } as React.CSSProperties}
      title={el}
    />
  )
}

function PerkHoverList({ perks, kind }: { perks: DestinyIconRef[]; kind: 'Perks' | 'Mods' }) {
  if (!perks.length) return null
  return (
    <div className="space-y-1 py-1">
      <p className="d2-tooltip-slot">{kind}</p>
      {perks.map((perk) => (
        <div key={`${perk.hash ?? perk.name}`} className="flex items-center gap-1.5">
          <ItemIcon item={perk} name={perk.name} size={16} className="rounded-sm shrink-0" />
          <span className="d2-tooltip-name text-xs">{perk.name}</span>
        </div>
      ))}
    </div>
  )
}

function HoverArmoryRow({ row, iconSize = 40 }: { row: ArmoryRow; iconSize?: number }) {
  const name = row.item?.name ?? row.fallback
  if (!name) return null
  const perks = row.perks ?? []
  const isArmor = ['Helm', 'Arms', 'Chest', 'Legs', 'Class', 'Exo'].includes(row.slot)
  const hoverKind = isArmor ? 'Mods' : 'Perks'

  const tier = row.item?.tierLabel
  const rarityClass = tierBorderClass(tier).replace('d2-rarity-', '')

  const icon = (
    <ItemExternalLink item={row.item} name={row.fallback}>
      <ItemIcon item={row.item} name={row.fallback} size={iconSize} className="d2-armory-icon" />
    </ItemExternalLink>
  )

  return (
    <div className="d2-armory-row group">
      <span className="d2-armory-slot">{row.slot}</span>
      <ElementStripe label={name} />
      {perks.length ? (
        <div className="d2-tooltip-wrap">
          {icon}
          <div className="d2-tooltip" role="tooltip">
            <p className="d2-tooltip-name">{name}</p>
            <PerkHoverList perks={perks} kind={hoverKind as 'Perks' | 'Mods'} />
          </div>
        </div>
      ) : (
        icon
      )}
      <div className="d2-armory-name-wrap min-w-0">
        <ItemLink item={row.item} name={row.fallback} className="d2-armory-name truncate block" />
      </div>
      <span className={cn('d2-armory-tier', `d2-armory-tier-${rarityClass}`)}>{tierShort(tier)}</span>
    </div>
  )
}

/** Armory rows — perks/mods on hover only (FlierTeam member popup). */
export default function FlierTeamHoverArmoryTable({
  rows,
  title = 'Armory',
  iconSize = 40,
}: {
  rows: ArmoryRow[]
  title?: string
  iconSize?: number
}) {
  const visible = rows.filter((r) => r.item?.name || r.fallback)
  if (!visible.length) return null

  return (
    <div className="d2-armory-table">
      <div className="d2-armory-header">
        <span className="d2-armory-header-title">{title}</span>
      </div>
      <div className="d2-armory-body">
        {visible.map((row) => (
          <HoverArmoryRow
            key={`${row.slot}-${row.item?.name ?? row.fallback}`}
            row={row}
            iconSize={iconSize}
          />
        ))}
      </div>
    </div>
  )
}
