import type { ArmorSetBonusGroup } from '@/lib/destiny/types'

export function formatArmorSetBonusesForCopy(groups: ArmorSetBonusGroup[] | undefined): string[] {
  if (!groups?.length) return []

  return groups.map((group) => {
    const tiers = group.bonuses
      .map((bonus) => {
        const state = bonus.active ? 'active' : 'inactive'
        const detail = bonus.description ?? bonus.name
        return `${bonus.requiredCount}pc: ${detail} (${state})`
      })
      .join('; ')
    return `${group.setName} (${group.pieceCount} pieces) — ${tiers}`
  })
}
