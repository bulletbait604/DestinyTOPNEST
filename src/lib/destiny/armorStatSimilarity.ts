import type { ArmorStatKey } from '@/lib/destiny/armorStats'

const STAT_ALIASES: Record<string, ArmorStatKey> = {
  weapons: 'Weapons',
  mobility: 'Weapons',
  health: 'Health',
  resilience: 'Health',
  class: 'Class',
  recovery: 'Class',
  super: 'Super',
  intellect: 'Super',
  grenade: 'Grenade',
  discipline: 'Grenade',
  melee: 'Melee',
  strength: 'Melee',
}

export function normalizeStatPriority(label: string): ArmorStatKey | null {
  return STAT_ALIASES[label.trim().toLowerCase()] ?? null
}

/** Higher score = closer match to recommended stat priorities (and optional piece hash). */
export function scoreArmorStatSimilarity(
  stats: Partial<Record<ArmorStatKey, number>>,
  priorities: string[],
  opts?: { recommendedHash?: number; itemHash?: number }
): number {
  let score = 0
  const weights = [3, 2, 1]

  priorities.slice(0, 3).forEach((label, index) => {
    const key = normalizeStatPriority(label)
    if (!key) return
    score += (stats[key] ?? 0) * weights[index]
  })

  if (opts?.recommendedHash && opts.itemHash === opts.recommendedHash) {
    score += 1000
  }

  return score
}

export function statFocusPreviewFromPriorities(priorities?: string[]): Record<string, number> {
  if (!priorities?.length) return {}
  const preview: Record<string, number> = {}
  const values = [30, 25, 20]
  priorities.slice(0, 3).forEach((label, index) => {
    const key = normalizeStatPriority(label)
    if (key) preview[key] = values[index] ?? 15
  })
  return preview
}
