'use client'

import { Copy } from 'lucide-react'
import type { BuildSnapshot, DestinyIconRef } from '@/lib/destiny/types'
import ArmorStatMatrix from '@/app/components/destiny/ArmorStatMatrix'
import BuildSynergyRail from '@/app/components/destiny/BuildSynergyRail'
import { ItemExternalLink, ItemLink } from '@/app/components/destiny/ItemLink'
import { ItemIcon, SubclassBadge } from '@/app/components/destiny/DestinyUi'
import WeaponArmoryTable, { buildWeaponRows } from '@/app/components/destiny/WeaponArmoryTable'
import {
  abilityRows,
  buildArmorRows,
  loadoutCopyText,
} from '@/lib/destiny/loadoutDisplay'
import { destinySecondaryBtn, getDestinyTheme } from '@/app/components/destiny/destinyTheme'
import { cn } from '@/lib/utils'

export { loadoutCopyText }

function uniqueModRefs(pieces: BuildSnapshot['armorPieces']): DestinyIconRef[] {
  const seen = new Set<string>()
  const mods: DestinyIconRef[] = []
  for (const piece of pieces ?? []) {
    for (const mod of piece.mods ?? []) {
      const key = mod.hash ? String(mod.hash) : mod.name
      if (seen.has(key)) continue
      seen.add(key)
      mods.push(mod)
    }
  }
  return mods
}

export default function LoadoutCard({
  build,
  darkMode,
  title,
  showEquip = true,
}: {
  build: BuildSnapshot
  darkMode: boolean
  title: string
  showEquip?: boolean
}) {
  const t = getDestinyTheme(darkMode)
  const weaponRows = buildWeaponRows(build)
  const armorRows = buildArmorRows(build)
  const abilityTableRows = abilityRows(build)
  const armorModRefs = uniqueModRefs(build.armorPieces)

  return (
    <div className="d2-panel-inset p-4 rounded-lg space-y-4">
      <p className="d2-panel-header-title text-[10px]">{title}</p>

      <BuildSynergyRail build={build} />

      <SubclassBadge
        classRef={build.classRef}
        subclassRef={build.subclassRef}
        characterClass={build.characterClass}
        subclass={build.subclass}
        darkMode={darkMode}
      />

      {(build.aspectRefs?.length || build.fragmentRefs?.length) ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {build.aspectRefs?.length ? (
            <div>
              <p className={cn('text-[9px] font-bold uppercase tracking-wider mb-2', t.caption)}>Aspects</p>
              <div className="flex flex-wrap gap-2">
                {build.aspectRefs.map((aspect) => (
                  <div key={aspect.name} className="flex items-center gap-1.5 min-w-0">
                    <ItemExternalLink item={aspect}>
                      <ItemIcon item={aspect} size={28} />
                    </ItemExternalLink>
                    <ItemLink item={aspect} className="text-xs truncate" />
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          {build.fragmentRefs?.length ? (
            <div>
              <p className={cn('text-[9px] font-bold uppercase tracking-wider mb-2', t.caption)}>Fragments</p>
              <div className="flex flex-wrap gap-2">
                {build.fragmentRefs.map((fragment) => (
                  <div key={fragment.name} className="flex items-center gap-1.5 min-w-0">
                    <ItemExternalLink item={fragment}>
                      <ItemIcon item={fragment} size={24} />
                    </ItemExternalLink>
                    <ItemLink item={fragment} className="text-[11px] truncate" />
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {abilityTableRows.length > 0 ? (
        <WeaponArmoryTable rows={abilityTableRows} title="Abilities" />
      ) : null}

      {weaponRows.length > 0 ? <WeaponArmoryTable rows={weaponRows} title="Weapons" /> : null}

      {armorRows.length > 0 ? <WeaponArmoryTable rows={armorRows} title="Armor" /> : null}

      {armorModRefs.length > 0 ? (
        <div>
          <p className={cn('text-[9px] font-bold uppercase tracking-wider mb-2', t.caption)}>Armor mods</p>
          <div className="flex flex-wrap gap-2">
            {armorModRefs.map((mod) => (
              <div key={mod.hash ?? mod.name} className="flex items-center gap-1.5 max-w-[160px]">
                <ItemExternalLink item={mod}>
                  <ItemIcon item={mod} size={24} />
                </ItemExternalLink>
                <ItemLink item={mod} className="text-[11px] truncate" />
              </div>
            ))}
          </div>
        </div>
      ) : build.armorMods.length > 0 ? (
        <div>
          <p className={cn('text-[9px] font-bold uppercase tracking-wider mb-2', t.caption)}>Armor mods</p>
          <div className="flex flex-wrap gap-1.5">
            {build.armorMods.map((mod) => (
              <span key={mod} className="text-[11px] px-2 py-0.5 rounded-md bg-white/[0.06] text-white/75">
                {mod}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {Object.keys(build.stats).length > 0 ? (
        <div>
          <p className={cn('text-[9px] font-bold uppercase tracking-wider mb-2', t.caption)}>Total stats</p>
          <ArmorStatMatrix stats={build.stats} compact />
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2 pt-1 border-t border-white/[0.06]">
        <button
          type="button"
          className={destinySecondaryBtn(darkMode)}
          onClick={() => navigator.clipboard.writeText(loadoutCopyText(build))}
        >
          <Copy className="w-3.5 h-3.5" /> Copy full loadout
        </button>
        {showEquip && (
          <button
            type="button"
            disabled
            className={cn(destinySecondaryBtn(darkMode), 'opacity-40 cursor-not-allowed')}
            title="Equip via Bungie — coming soon"
          >
            Equip
          </button>
        )}
      </div>
    </div>
  )
}
