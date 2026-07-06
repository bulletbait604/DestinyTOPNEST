'use client'

import { Copy, ExternalLink } from 'lucide-react'
import type { ExternalBuildSource } from '@/lib/destiny/types'
import { ItemExternalLink, ItemLink } from '@/app/components/destiny/ItemLink'
import { ActivityBadge, ItemIcon, StatusPill, SubclassBadge } from '@/app/components/destiny/DestinyUi'
import WeaponArmoryTable from '@/app/components/destiny/WeaponArmoryTable'
import { buildExternalArmorRows } from '@/lib/destiny/loadoutDisplay'
import { getDestinyTheme } from '@/app/components/destiny/destinyTheme'
import { cn } from '@/lib/utils'

function weaponRows(build: ExternalBuildSource) {
  const rows = (build.weapons ?? []).map((name, index) => ({
    slot: index === 0 ? 'Kin' : index === 1 ? 'Eng' : 'Pow',
    item: build.weaponRefs?.[index],
    fallback: name,
  }))
  if (build.exoticWeaponRef || build.exoticWeapon) {
    rows.push({
      slot: 'Exo W',
      item: build.exoticWeaponRef,
      fallback: build.exoticWeapon ?? 'Exotic weapon',
    })
  }
  return rows
}

export default function ExternalMetaBuildCard({
  build,
  darkMode,
  compact = false,
}: {
  build: ExternalBuildSource
  darkMode: boolean
  compact?: boolean
}) {
  const t = getDestinyTheme(darkMode)
  const armor = buildExternalArmorRows(build)
  const weapons = weaponRows(build)

  const copyText = [
    build.title,
    `${build.subclass} ${build.class}`,
    build.exoticArmor ? `Exotic armor: ${build.exoticArmor}` : '',
    build.exoticWeapon ? `Exotic weapon: ${build.exoticWeapon}` : '',
    build.weapons?.length ? `Weapons: ${build.weapons.join(' / ')}` : '',
    build.aspects?.length ? `Aspects: ${build.aspects.join(', ')}` : '',
    build.fragments?.length ? `Fragments: ${build.fragments.join(', ')}` : '',
    build.armorMods?.length ? `Mods: ${build.armorMods.join(', ')}` : '',
    build.summary ?? '',
    build.sourceUrl,
  ]
    .filter(Boolean)
    .join('\n')

  return (
    <div className={cn(compact ? 'space-y-3' : 'rounded-2xl p-4', !compact && t.glassInset)}>
      {!compact && (
        <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
          <div className="min-w-0">
            <p className={cn('font-semibold text-sm tracking-tight', t.heading)}>{build.title}</p>
            <p className={cn('text-xs mt-0.5', t.muted)}>
              {build.source}
              {build.publishedAt && <> · {new Date(build.publishedAt).toLocaleDateString()}</>}
            </p>
          </div>
          {build.excelsIn ? <StatusPill label={build.excelsIn} tone="purple" /> : null}
          {build.aiScoreLabel ? <StatusPill label={build.aiScoreLabel} tone="gold" /> : null}
        </div>
      )}

      <SubclassBadge
        classRef={build.classRef}
        subclassRef={build.subclassRef}
        characterClass={build.class}
        subclass={build.subclass}
        darkMode={darkMode}
      />

      {compact && build.aiScoreLabel ? (
        <StatusPill label={build.aiScoreLabel} tone="gold" />
      ) : null}

      {build.aspectRefs?.length ? (
        <div>
          <p className={cn('text-[9px] font-bold uppercase tracking-wider mb-2', t.caption)}>Aspects</p>
          <div className="flex flex-wrap gap-2">
            {build.aspectRefs.map((aspect) => (
              <div key={aspect.name} className="flex items-center gap-1.5">
                <ItemExternalLink item={aspect}>
                  <ItemIcon item={aspect} size={24} />
                </ItemExternalLink>
                <ItemLink item={aspect} className="text-xs" />
              </div>
            ))}
          </div>
        </div>
      ) : build.aspects?.length ? (
        <div>
          <p className={cn('text-[9px] font-bold uppercase tracking-wider mb-2', t.caption)}>Aspects</p>
          <div className="flex flex-wrap gap-1.5">
            {build.aspects.map((aspect) => (
              <span key={aspect} className="text-[11px] px-2 py-0.5 rounded-md bg-white/[0.06] text-white/75">
                {aspect}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {build.fragmentRefs?.length ? (
        <div>
          <p className={cn('text-[9px] font-bold uppercase tracking-wider mb-2', t.caption)}>Fragments</p>
          <div className="flex flex-wrap gap-2">
            {build.fragmentRefs.map((fragment) => (
              <div key={fragment.name} className="flex items-center gap-1.5">
                <ItemExternalLink item={fragment}>
                  <ItemIcon item={fragment} size={22} />
                </ItemExternalLink>
                <ItemLink item={fragment} className="text-[11px]" />
              </div>
            ))}
          </div>
        </div>
      ) : build.fragments?.length ? (
        <div>
          <p className={cn('text-[9px] font-bold uppercase tracking-wider mb-2', t.caption)}>Fragments</p>
          <div className="flex flex-wrap gap-1.5">
            {build.fragments.map((fragment) => (
              <span key={fragment} className="text-[11px] px-2 py-0.5 rounded-md bg-white/[0.06] text-white/75">
                {fragment}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {weapons.length > 0 ? <WeaponArmoryTable rows={weapons} title="Weapons" showHeader={!compact} /> : null}
      {armor.length > 0 ? <WeaponArmoryTable rows={armor} title="Armor" showHeader={!compact} /> : null}

      {(build.armorModRefs?.length || build.armorMods?.length) ? (
        <div>
          <p className={cn('text-[9px] font-bold uppercase tracking-wider mb-2', t.caption)}>Armor mods</p>
          <div className="flex flex-wrap gap-2">
            {build.armorModRefs?.map((mod) => (
              <div key={mod.hash ?? mod.name} className="flex items-center gap-1.5 max-w-[150px]">
                <ItemExternalLink item={mod}>
                  <ItemIcon item={mod} size={22} />
                </ItemExternalLink>
                <span className="text-[11px] text-white/75 truncate">{mod.name}</span>
              </div>
            ))}
            {!build.armorModRefs?.length &&
              build.armorMods?.map((name) => (
                <div key={name} className="flex items-center gap-1.5 max-w-[150px]">
                  <ItemIcon name={name} size={22} />
                  <span className="text-[11px] text-white/75 truncate">{name}</span>
                </div>
              ))}
          </div>
        </div>
      ) : null}

      {!compact && build.summary ? (
        <p className={cn('text-xs leading-relaxed', t.muted)}>{build.summary}</p>
      ) : null}

      {!compact && build.activityFocus ? (
        build.activityRef ? (
          <ActivityBadge activityRef={build.activityRef} name={build.activityFocus} darkMode={darkMode} size={32} />
        ) : (
          <p className={cn('text-xs', t.gold)}>{build.activityFocus}</p>
        )
      ) : null}

      {!compact && (
        <div className="flex flex-wrap gap-2 mt-2">
          <a
            href={build.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-sky-500/15 text-sky-200 border border-sky-500/25"
          >
            View source <ExternalLink className="w-3 h-3" />
          </a>
          <button
            type="button"
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-white/5 text-white/80 border border-white/10"
            onClick={() => navigator.clipboard.writeText(copyText)}
          >
            <Copy className="w-3 h-3" /> Copy
          </button>
        </div>
      )}
    </div>
  )
}
