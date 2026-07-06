import type {
  BuildIntelligenceCard,
  DestinyCharacterClass,
  ExternalBuildSource,
} from '@/lib/destiny/types'

export interface RankedSuggestedLoadout {
  id: string
  kind: 'meta' | 'community'
  title: string
  characterClass: DestinyCharacterClass
  subclass: string
  score: number
  scoreLabel: string
  summary?: string
  sourceLabel: string
  external?: ExternalBuildSource
  verified?: BuildIntelligenceCard
}

const PLACEHOLDER_WEAPON =
  /^(kinetic|energy|power|arc|solar|void|strand|stasis|prismatic)\s+(primary|special|heavy|weapon)|^(pulse rifle|trace rifle|rocket launcher|linear fusion|sword|heavy gl|smg|auto rifle|hand cannon|bow|fusion rifle|sniper rifle|machine gun|grenade launcher)$/i

const PLACEHOLDER_ARMOR = /^lucent\s/i

function buildKey(build: Pick<ExternalBuildSource, 'class' | 'subclass' | 'exoticArmor'>): string {
  return `${build.class}:${build.subclass.toLowerCase()}:${(build.exoticArmor ?? '').toLowerCase()}`
}

function hasPlaceholderWeapons(build: ExternalBuildSource): boolean {
  return (build.weapons ?? []).some((weapon) => PLACEHOLDER_WEAPON.test(weapon.trim()))
}

function hasPlaceholderArmor(build: ExternalBuildSource): boolean {
  return Object.values(build.legendaryArmor ?? {}).some((piece) => PLACEHOLDER_ARMOR.test(piece.trim()))
}

function namedWeaponCount(build: ExternalBuildSource): number {
  return (build.weapons ?? []).filter((weapon) => weapon.trim() && !PLACEHOLDER_WEAPON.test(weapon.trim())).length
}

function isEligibleMetaSuggestion(build: ExternalBuildSource): boolean {
  if (!build.approved) return false
  if (build.suggestionScope === 'activity' || build.suggestionScope === 'specialist') return false
  if (!build.exoticArmor?.trim()) return false
  if (namedWeaponCount(build) < 2) return false
  if (hasPlaceholderWeapons(build)) return false
  if (hasPlaceholderArmor(build)) return false
  return true
}

function scoreExternalBuild(build: ExternalBuildSource, now = Date.now()): number {
  let score = 0

  if (build.suggestionRank != null) {
    score += Math.max(0, 120 - (build.suggestionRank - 1) * 25)
  }

  if (build.sourceSite === 'blueberries.gg') score += 18
  else if (build.sourceSite === 'togame.io') score += 14
  else if (build.sourceSite === 'light.gg') score += 12
  else if (build.sourceSite === 'builders.gg') score += 8

  if (build.publishedAt) {
    const ageDays = (now - Date.parse(build.publishedAt)) / (24 * 60 * 60 * 1000)
    if (ageDays <= 14) score += 10
    else if (ageDays <= 28) score += 4
  }

  score += namedWeaponCount(build) * 6
  if (build.aspects?.length) score += Math.min(build.aspects.length, 2) * 4
  if (build.fragments?.length) score += Math.min(build.fragments.length, 3) * 2
  if (build.exoticWeapon) score += 4
  if (build.excelsIn?.toLowerCase().includes('endgame')) score += 6

  return score
}

function scoreVerifiedBuild(build: BuildIntelligenceCard): number {
  if (build.usageRatePercent < 0.5) return 0
  if (build.successRatePercent < 55) return 0
  if (!build.exoticArmor || build.exoticArmor === 'Unknown exotic') return 0
  if ((build.weapons ?? []).filter(Boolean).length < 2) return 0
  return Math.round(build.usageRatePercent * 2 + build.successRatePercent - build.deathRatePercent * 0.5)
}

function scoreLabel(score: number, kind: 'meta' | 'community', rank?: number): string {
  if (kind === 'community') {
    if (score >= 120) return 'Top Nest verified · high usage'
    if (score >= 90) return 'Strong verified clears'
    return 'Verified community pick'
  }
  if (rank === 1) return 'Top general PvE pick'
  if (score >= 110) return 'Highly recommended'
  if (score >= 85) return 'Strong endgame option'
  return 'Solid meta option'
}

function dedupeMetaBuilds(builds: ExternalBuildSource[]): ExternalBuildSource[] {
  const bestByKey = new Map<string, ExternalBuildSource>()
  for (const build of builds) {
    const key = buildKey(build)
    const existing = bestByKey.get(key)
    if (!existing || scoreExternalBuild(build) > scoreExternalBuild(existing)) {
      bestByKey.set(key, build)
    }
  }
  return Array.from(bestByKey.values())
}

/** Rank suggested loadouts for one class — curated meta research + verified PGCR builds. */
export function rankSuggestedLoadoutsForClass(
  characterClass: DestinyCharacterClass,
  externalBuilds: ExternalBuildSource[],
  verifiedBuilds: BuildIntelligenceCard[],
  limit = 4
): RankedSuggestedLoadout[] {
  const metaCandidates = dedupeMetaBuilds(
    externalBuilds.filter((b) => b.class === characterClass && isEligibleMetaSuggestion(b))
  ).sort((a, b) => {
    const rankA = a.suggestionRank ?? 99
    const rankB = b.suggestionRank ?? 99
    if (rankA !== rankB) return rankA - rankB
    return scoreExternalBuild(b) - scoreExternalBuild(a)
  })

  const metaPicks: RankedSuggestedLoadout[] = metaCandidates.slice(0, 3).map((build) => {
    const score = scoreExternalBuild(build)
    return {
      id: build.id,
      kind: 'meta' as const,
      title: build.title,
      characterClass: build.class,
      subclass: build.subclass,
      score,
      scoreLabel: scoreLabel(score, 'meta', build.suggestionRank),
      summary: build.summary,
      sourceLabel: build.sourceSite ?? build.source,
      external: build,
    }
  })

  const metaKeys = new Set(metaCandidates.map(buildKey))
  const verifiedCandidates = verifiedBuilds
    .filter((b) => b.characterClass === characterClass)
    .map((build) => ({ build, score: scoreVerifiedBuild(build) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)

  const verifiedPicks: RankedSuggestedLoadout[] = []
  for (const { build, score } of verifiedCandidates) {
    if (verifiedPicks.length >= Math.max(1, limit - metaPicks.length)) break
    const key = `${build.characterClass}:${build.subclass.toLowerCase()}:${(build.exoticArmor ?? '').toLowerCase()}`
    if (metaKeys.has(key)) continue
    verifiedPicks.push({
      id: build.id,
      kind: 'community',
      title: build.buildName,
      characterClass: build.characterClass,
      subclass: build.subclass,
      score,
      scoreLabel: scoreLabel(score, 'community'),
      summary: `${build.usageRatePercent}% usage · ${build.successRatePercent}% success on ${build.activityName}`,
      sourceLabel: 'Top Nest verified clears',
      verified: build,
    })
  }

  return [...metaPicks, ...verifiedPicks].slice(0, limit)
}

export function suggestedLoadoutsSummary(
  characterClass: DestinyCharacterClass,
  picks: RankedSuggestedLoadout[]
): string {
  if (!picks.length) {
    return `No curated ${characterClass} suggestions yet — check the Top builds tab for the full meta research library.`
  }
  const metaCount = picks.filter((p) => p.kind === 'meta').length
  const verifiedCount = picks.filter((p) => p.kind === 'community').length
  const parts = [`${metaCount} curated general PvE pick${metaCount === 1 ? '' : 's'}`]
  if (verifiedCount) {
    parts.push(`${verifiedCount} from verified Top Nest clears`)
  }
  return `Hand-picked ${characterClass} loadouts: ${parts.join(' and ')}. Activity-specific and incomplete builds are kept in Top builds.`
}
