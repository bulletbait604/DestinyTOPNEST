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

function metaSignature(build: ExternalBuildSource): string {
  return `${build.class}:${build.subclass.toLowerCase()}:${(build.exoticArmor ?? '').toLowerCase()}`
}

function consensusBoost(build: ExternalBuildSource, all: ExternalBuildSource[]): number {
  const sig = metaSignature(build)
  const matches = all.filter((b) => b.class === build.class && metaSignature(b) === sig).length
  return Math.min(20, (matches - 1) * 8)
}

function scoreExternalBuild(build: ExternalBuildSource, all: ExternalBuildSource[], now = Date.now()): number {
  let score = 55
  score += consensusBoost(build, all)

  const sites = new Set(all.filter((b) => b.class === build.class).map((b) => b.sourceSite ?? b.source))
  if (sites.size >= 3) score += 8

  if (build.publishedAt) {
    const ageDays = (now - Date.parse(build.publishedAt)) / (24 * 60 * 60 * 1000)
    if (ageDays <= 14) score += 12
    else if (ageDays <= 28) score += 6
  }

  if (build.exoticArmor && build.weapons?.length) score += 10
  if (build.aspects?.length) score += 4
  if (build.legendaryArmor && Object.keys(build.legendaryArmor).length >= 2) score += 6
  if (build.activityFocus) score += 3

  return score
}

function scoreVerifiedBuild(build: BuildIntelligenceCard): number {
  return Math.round(build.usageRatePercent * 2 + build.successRatePercent - build.deathRatePercent * 0.5)
}

function scoreLabel(score: number, kind: 'meta' | 'community'): string {
  if (kind === 'community') {
    if (score >= 120) return 'Top Nest verified · high usage'
    if (score >= 90) return 'Strong verified clears'
    return 'Verified community pick'
  }
  if (score >= 90) return 'Multi-site meta consensus'
  if (score >= 75) return 'Recommended endgame pick'
  return 'Researched meta option'
}

/** Rank suggested loadouts for one class — meta research + verified PGCR builds. */
export function rankSuggestedLoadoutsForClass(
  characterClass: DestinyCharacterClass,
  externalBuilds: ExternalBuildSource[],
  verifiedBuilds: BuildIntelligenceCard[],
  limit = 6
): RankedSuggestedLoadout[] {
  const classExternal = externalBuilds.filter((b) => b.class === characterClass && b.approved)
  const classVerified = verifiedBuilds.filter((b) => b.characterClass === characterClass)

  const ranked: RankedSuggestedLoadout[] = [
    ...classExternal.map((build) => {
      const score = scoreExternalBuild(build, classExternal)
      return {
        id: build.id,
        kind: 'meta' as const,
        title: build.title,
        characterClass: build.class,
        subclass: build.subclass,
        score,
        scoreLabel: scoreLabel(score, 'meta'),
        summary: build.summary,
        sourceLabel: build.source,
        external: build,
      }
    }),
    ...classVerified.map((build) => {
      const score = scoreVerifiedBuild(build)
      return {
        id: build.id,
        kind: 'community' as const,
        title: `${build.subclass} · ${build.exoticArmor || build.activityName}`,
        characterClass: build.characterClass,
        subclass: build.subclass,
        score,
        scoreLabel: scoreLabel(score, 'community'),
        summary: `${build.usageRatePercent}% usage · ${build.successRatePercent}% success on ${build.activityName}`,
        sourceLabel: 'Top Nest verified clears',
        verified: build,
      }
    }),
  ]

  return ranked.sort((a, b) => b.score - a.score).slice(0, limit)
}

export function suggestedLoadoutsSummary(
  characterClass: DestinyCharacterClass,
  picks: RankedSuggestedLoadout[]
): string {
  if (!picks.length) {
    return `No suggested builds for ${characterClass} yet — sync runs or check back after the next meta research pass.`
  }
  const metaCount = picks.filter((p) => p.kind === 'meta').length
  const verifiedCount = picks.filter((p) => p.kind === 'community').length
  return `Top ${picks.length} picks for ${characterClass}: ${metaCount} from amalgamated build sites (Blueberries, light.gg, togame.io, builders.gg, D2Foundry) and ${verifiedCount} from verified Top Nest clears.`
}
