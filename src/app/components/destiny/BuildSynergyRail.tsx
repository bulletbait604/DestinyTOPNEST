'use client'

import type { BuildSnapshot } from '@/lib/destiny/types'
import { ItemLink } from '@/app/components/destiny/ItemLink'
import { ItemIcon } from '@/app/components/destiny/DestinyUi'
import { elementFromLabel, subclassGlow } from '@/app/components/destiny/destinyTheme'
import { cn } from '@/lib/utils'

const GLOW_CLASS = {
  arc: 'd2-synergy-arc',
  void: 'd2-synergy-void',
  solar: 'd2-synergy-solar',
  strand: 'd2-synergy-strand',
  stasis: 'd2-synergy-stasis',
  gold: 'd2-synergy-gold',
} as const

function weaponElements(build: BuildSnapshot): (string | null)[] {
  return [
    elementFromLabel(build.kineticWeaponRef?.name ?? build.kineticWeapon),
    elementFromLabel(build.energyWeaponRef?.name ?? build.energyWeapon),
    elementFromLabel(build.powerWeaponRef?.name ?? build.powerWeapon),
  ]
}

function synergyLabel(build: BuildSnapshot): string {
  const subclass = (build.subclass ?? '').toLowerCase()
  const isPrismatic = subclass.includes('prismatic')
  const subElement = elementFromLabel(build.subclass)
  const weapons = weaponElements(build)
  const matches = weapons.filter((w) => w && subElement && w === subElement).length
  const score = subElement && !isPrismatic ? matches : 0

  if (isPrismatic) return 'PRISMATIC'
  if (score >= 2) return 'High synergy'
  if (score === 1) return 'Partial synergy'
  if (subElement) return 'Mixed elements'
  return 'Build overview'
}

/** Subclass element synergy indicator. */
export default function BuildSynergyRail({ build }: { build: BuildSnapshot }) {
  const glow = subclassGlow(build.subclass)
  const label = synergyLabel(build)

  return (
    <div className={cn('d2-synergy-rail', GLOW_CLASS[glow])}>
      <div className="d2-synergy-subclass">
        <ItemIcon item={build.subclassRef} name={build.subclass} size={32} />
        <div>
          <p className="d2-synergy-label">{label}</p>
          <p className="d2-synergy-sub">
            <ItemLink item={build.subclassRef} name={build.subclass} /> · {build.characterClass}
          </p>
        </div>
      </div>
      {build.exoticArmor ? (
        <p className="d2-synergy-exotic truncate">
          <ItemLink item={build.exoticArmorRef} name={build.exoticArmor} className="truncate inline-block max-w-full" />
        </p>
      ) : null}
    </div>
  )
}
