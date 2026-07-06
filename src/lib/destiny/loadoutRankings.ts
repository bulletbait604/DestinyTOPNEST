import type { BuildIntelligenceCard, DestinyCharacterClass } from '@/lib/destiny/types'

const CLASSES: DestinyCharacterClass[] = ['titan', 'hunter', 'warlock']

export type TopLoadoutsByClass = Record<DestinyCharacterClass, BuildIntelligenceCard[]>

function scoreBuild(b: BuildIntelligenceCard): number {
  return b.usageRatePercent * 2 + b.successRatePercent - b.deathRatePercent
}

function isRankableVerifiedBuild(b: BuildIntelligenceCard): boolean {
  if (b.usageRatePercent < 1 || b.successRatePercent < 50) return false
  if (b.subclass === 'Unknown') return false
  const hasIdentity =
    (b.exoticArmor && b.exoticArmor !== 'Unknown exotic') || Boolean(b.exoticWeapon)
  return hasIdentity
}

/** Top N community loadouts per class, ranked by usage and success from verified runs. */
export function rankTopLoadoutsByClass(
  builds: BuildIntelligenceCard[],
  perClass = 2
): TopLoadoutsByClass {
  const result = {} as TopLoadoutsByClass
  for (const cls of CLASSES) {
    result[cls] = builds
      .filter((b) => b.characterClass === cls && isRankableVerifiedBuild(b))
      .sort((a, b) => scoreBuild(b) - scoreBuild(a))
      .slice(0, perClass)
  }
  return result
}
