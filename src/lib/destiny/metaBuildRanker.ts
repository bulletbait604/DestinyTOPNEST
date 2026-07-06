import type {
  BuildIntelligenceCard,
  DestinyCharacterClass,
  ExternalBuildSource,
} from '@/lib/destiny/types'
import {
  buildConsensusKey,
  pickBestBuildPerConsensusKey,
  scoreBuildConsensus,
} from '@/lib/destiny/metaBuildConsensus'

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

function scoreVerifiedBuild(build: BuildIntelligenceCard): number {
  if (build.usageRatePercent < 0.5) return 0
  if (build.successRatePercent < 55) return 0
  if (!build.exoticArmor || build.exoticArmor === 'Unknown exotic') return 0
  if ((build.weapons ?? []).filter(Boolean).length < 2) return 0
  return Math.round(build.usageRatePercent * 2 + build.successRatePercent - build.deathRatePercent * 0.5)
}

function scoreLabel(score: number, kind: 'meta' | 'community', build?: ExternalBuildSource, rank?: number): string {
  if (kind === 'community') {
    if (score >= 120) return 'Top Nest verified · high usage'
    if (score >= 90) return 'Strong verified clears'
    return 'Verified community pick'
  }
  if (build?.aiScoreLabel) return build.aiScoreLabel
  if (rank === 1) return 'Top general PvE pick'
  if (score >= 110) return 'Highly recommended'
  if (score >= 85) return 'Strong endgame option'
  return 'Solid meta option'
}

function verifiedBuildKey(build: BuildIntelligenceCard): string {
  return `${build.characterClass}:${build.subclass.toLowerCase()}:${(build.exoticArmor ?? '').toLowerCase()}`
}

/** Rank suggested loadouts for one class — cross-site meta consensus + verified PGCR builds. */
export function rankSuggestedLoadoutsForClass(
  characterClass: DestinyCharacterClass,
  externalBuilds: ExternalBuildSource[],
  verifiedBuilds: BuildIntelligenceCard[],
  limit = 4
): RankedSuggestedLoadout[] {
  const eligible = externalBuilds.filter((b) => b.class === characterClass && isEligibleMetaSuggestion(b))
  const metaCandidates = pickBestBuildPerConsensusKey(eligible).sort((a, b) => {
    const scoreA = scoreBuildConsensus(a, externalBuilds)
    const scoreB = scoreBuildConsensus(b, externalBuilds)
    if (scoreB !== scoreA) return scoreB - scoreA
    const rankA = a.sourceRank ?? a.suggestionRank ?? 99
    const rankB = b.sourceRank ?? b.suggestionRank ?? 99
    return rankA - rankB
  })

  const metaPicks: RankedSuggestedLoadout[] = metaCandidates.slice(0, 3).map((build) => {
    const score = scoreBuildConsensus(build, externalBuilds)
    return {
      id: build.id,
      kind: 'meta' as const,
      title: build.title,
      characterClass: build.class,
      subclass: build.subclass,
      score,
      scoreLabel: scoreLabel(score, 'meta', build, build.sourceRank ?? build.suggestionRank),
      summary: build.summary,
      sourceLabel: build.sourceSite ?? build.source,
      external: build,
    }
  })

  const metaKeys = new Set(metaCandidates.map((b) => buildConsensusKey(b)))
  const verifiedCandidates = verifiedBuilds
    .filter((b) => b.characterClass === characterClass)
    .map((build) => ({ build, score: scoreVerifiedBuild(build) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)

  const verifiedPicks: RankedSuggestedLoadout[] = []
  for (const { build, score } of verifiedCandidates) {
    if (verifiedPicks.length >= Math.max(1, limit - metaPicks.length)) break
    const key = verifiedBuildKey(build)
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
  const parts = [`${metaCount} cross-site meta pick${metaCount === 1 ? '' : 's'}`]
  if (verifiedCount) {
    parts.push(`${verifiedCount} from verified Top Nest clears`)
  }
  return `Hand-picked ${characterClass} loadouts: ${parts.join(' and ')}. Activity-specific builds stay in Top builds.`
}
