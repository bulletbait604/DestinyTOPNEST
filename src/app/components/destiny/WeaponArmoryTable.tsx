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

export interface ArmoryRow {
  slot: string
  item?: DestinyIconRef
  fallback?: string
  perks?: DestinyIconRef[]
}

function tierShort(tier?: string) {
  const t = (tier ?? '').toLowerCase()
  if (t.includes('exotic')) return 'Exotic'
  if (t.includes('legendary')) return 'Legendary'
  if (t.includes('rare')) return 'Rare'
  if (t.includes('uncommon')) return 'Uncommon'
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

function WeaponPerkRow({ perks }: { perks: DestinyIconRef[] }) {
  if (!perks.length) return null

  return (
    <div className="d2-armory-perks">
      {perks.map((perk) => (
        <span key={`${perk.hash ?? perk.name}`} className="d2-armory-perk">
          <ItemExternalLink item={perk}>
            <ItemIcon item={perk} name={perk.name} size={18} className="shrink-0 rounded-sm" />
          </ItemExternalLink>
          <ItemLink item={perk} className="truncate" />
        </span>
      ))}
    </div>
  )
}

function ArmoryRowView({ row, iconSize = 40 }: { row: ArmoryRow; iconSize?: number }) {
  const name = row.item?.name ?? row.fallback
  if (!name) return null

  const tier = row.item?.tierLabel
  const rarityClass = tierBorderClass(tier).replace('d2-rarity-', '')

  return (
    <div className="d2-armory-row group">
      <span className="d2-armory-slot">{row.slot}</span>
      <ElementStripe label={name} />
      <ItemExternalLink item={row.item} name={row.fallback}>
        <ItemIcon item={row.item} name={row.fallback} size={iconSize} className="d2-armory-icon" />
      </ItemExternalLink>
      <div className="d2-armory-name-wrap min-w-0">
        <ItemLink item={row.item} name={row.fallback} className="d2-armory-name truncate block" />
        <WeaponPerkRow perks={row.perks ?? []} />
      </div>
      <span className={cn('d2-armory-tier', `d2-armory-tier-${rarityClass}`)}>{tierShort(tier)}</span>
    </div>
  )
}

/** light.gg–style weapon / gear table rows. */
export default function WeaponArmoryTable({
  rows,
  title = 'Armory',
  showHeader = true,
  iconSize = 40,
}: {
  rows: ArmoryRow[]
  title?: string
  showHeader?: boolean
  iconSize?: number
}) {
  const visible = rows.filter((r) => r.item?.name || r.fallback)
  if (!visible.length) return null

  return (
    <div className="d2-armory-table">
      {showHeader ? (
        <div className="d2-armory-header">
          <span className="d2-armory-header-title">{title}</span>
          <span className="d2-armory-header-cols">
            <span>Slot</span>
            <span>Item</span>
            <span>Tier</span>
          </span>
        </div>
      ) : null}
      <div className="d2-armory-body">
        {visible.map((row) => (
          <ArmoryRowView key={`${row.slot}-${row.item?.name ?? row.fallback}`} row={row} iconSize={iconSize} />
        ))}
      </div>
    </div>
  )
}

export function buildWeaponRows(build: {
  kineticWeaponRef?: DestinyIconRef
  kineticWeapon?: string
  kineticWeaponPerks?: DestinyIconRef[]
  energyWeaponRef?: DestinyIconRef
  energyWeapon?: string
  energyWeaponPerks?: DestinyIconRef[]
  powerWeaponRef?: DestinyIconRef
  powerWeapon?: string
  powerWeaponPerks?: DestinyIconRef[]
  exoticWeaponRef?: DestinyIconRef
  exoticWeapon?: string
  exoticArmorRef?: DestinyIconRef
  exoticArmor?: string
}): ArmoryRow[] {
  const rows: ArmoryRow[] = [
    {
      slot: 'Kin',
      item: build.kineticWeaponRef,
      fallback: build.kineticWeapon,
      perks: build.kineticWeaponPerks,
    },
    {
      slot: 'Eng',
      item: build.energyWeaponRef,
      fallback: build.energyWeapon,
      perks: build.energyWeaponPerks,
    },
    {
      slot: 'Pow',
      item: build.powerWeaponRef,
      fallback: build.powerWeapon,
      perks: build.powerWeaponPerks,
    },
  ]

  if (build.exoticWeaponRef || build.exoticWeapon) {
    const duplicate = rows.some(
      (row) =>
        (build.exoticWeaponRef?.hash &&
          row.item?.hash &&
          build.exoticWeaponRef.hash === row.item.hash) ||
        (build.exoticWeapon &&
          row.fallback &&
          build.exoticWeapon.toLowerCase() === row.fallback.toLowerCase())
    )
    if (!duplicate) {
      rows.push({
        slot: 'Exo W',
        item: build.exoticWeaponRef,
        fallback: build.exoticWeapon ?? 'Exotic weapon',
      })
    }
  }

  return rows.filter((row) => (row.fallback && row.fallback !== '—') || row.item?.name)
}
