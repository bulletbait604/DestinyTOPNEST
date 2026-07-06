'use client'

import { Copy } from 'lucide-react'
import type { BuildSnapshot } from '@/lib/destiny/types'
import ArmorSetBonusSection from '@/app/components/destiny/ArmorSetBonusSection'
import ProfileBuildInspectorBody from '@/app/components/destiny/ProfileBuildInspectorBody'
import { SubclassBadge } from '@/app/components/destiny/DestinyUi'
import { loadoutCopyText } from '@/lib/destiny/loadoutDisplay'
import { destinySecondaryBtn } from '@/app/components/destiny/destinyTheme'
import { cn } from '@/lib/utils'

export { loadoutCopyText }

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
  return (
    <div className="d2-panel-inset p-0 rounded-lg overflow-visible d2-profile-build-card">
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
