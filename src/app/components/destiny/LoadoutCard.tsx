'use client'

import { Copy } from 'lucide-react'
import type { BuildSnapshot, DestinyIconRef } from '@/lib/destiny/types'
import ArmorSetBonusSection from '@/app/components/destiny/ArmorSetBonusSection'
import ProfileBuildInspectorBody from '@/app/components/destiny/ProfileBuildInspectorBody'
import { SubclassBadge, ItemIcon } from '@/app/components/destiny/DestinyUi'
import { ItemExternalLink, ItemLink } from '@/app/components/destiny/ItemLink'
import { loadoutCopyText } from '@/lib/destiny/loadoutDisplay'
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
  const armorModRefs = uniqueModRefs(build.armorPieces)

  return (
    <div className="d2-panel-inset p-0 rounded-lg overflow-hidden d2-profile-build-card">
      <div className="px-4 pt-4 pb-2 space-y-3">
        <p className="d2-panel-header-title text-[14px]">{title}</p>
        <SubclassBadge
          classRef={build.classRef}
          subclassRef={build.subclassRef}
          characterClass={build.characterClass}
          subclass={build.subclass}
          darkMode={darkMode}
        />
      </div>

      <ProfileBuildInspectorBody build={build} />

      {build.armorSetBonuses?.length ? (
        <div className="px-4 pb-2">
          <ArmorSetBonusSection groups={build.armorSetBonuses} darkMode={darkMode} />
        </div>
      ) : null}

      {armorModRefs.length > 0 ? (
        <div className="px-4 pb-3">
          <p className={cn('d2-build-section-heading', t.caption)}>Armor mods</p>
          <div className="flex flex-wrap gap-2">
            {armorModRefs.map((mod) => (
              <div key={mod.hash ?? mod.name} className="flex items-center gap-1.5 max-w-[160px]">
                <ItemExternalLink item={mod}>
                  <ItemIcon item={mod} size={24} />
                </ItemExternalLink>
                <ItemLink item={mod} className="d2-build-item-name truncate" />
              </div>
            ))}
          </div>
        </div>
      ) : build.armorMods.length > 0 ? (
        <div className="px-4 pb-3">
          <p className={cn('d2-build-section-heading', t.caption)}>Armor mods</p>
          <div className="flex flex-wrap gap-1.5">
            {build.armorMods.map((mod) => (
              <span key={mod} className="d2-build-item-name px-2 py-0.5 rounded-md bg-white/[0.06] text-white/75">
                {mod}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2 px-4 py-3 border-t border-white/[0.06]">
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
