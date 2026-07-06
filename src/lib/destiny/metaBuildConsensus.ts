import type { DestinyCharacterClass, ExternalBuildSource } from '@/lib/destiny/types'

const CLASSES: DestinyCharacterClass[] = ['titan', 'hunter', 'warlock']

const SITE_WEIGHT: Record<string, number> = {
  'blueberries.gg': 22,
  'light.gg': 16,
  'togame.io': 14,
  'd2foundry': 12,
  'builders.gg': 10,
  'top-nest': 8,
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

/** Stable identity for cross-site deduplication (class + subclass + exotic armor). */
export function buildConsensusKey(build: Pick<ExternalBuildSource, 'consensusKey' | 'class' | 'subclass' | 'exoticArmor'>): string {
  if (build.consensusKey?.trim()) return build.consensusKey.trim()
  const exotic = slug(build.exoticArmor ?? 'none')
  return `${build.class}:${slug(build.subclass)}:${exotic}`
}

function groupByConsensusKey(builds: ExternalBuildSource[]): Map<string, ExternalBuildSource[]> {
  const groups = new Map<string, ExternalBuildSource[]>()
  for (const build of builds) {
    const key = buildConsensusKey(build)
    const list = groups.get(key) ?? []
    list.push(build)
    groups.set(key, list)
  }
  return groups
}

function siteSetForGroup(group: ExternalBuildSource[]): Set<string> {
  return new Set(group.map((b) => b.sourceSite ?? b.source).filter(Boolean))
}

function bestSourceRank(group: ExternalBuildSource[]): number {
  return Math.min(...group.map((b) => b.sourceRank ?? b.suggestionRank ?? 99))
}

function namedWeaponCount(build: ExternalBuildSource): number {
  return (build.weapons ?? []).filter((w) => w.trim().length > 0).length
}

function buildCompleteness(build: ExternalBuildSource): number {
  let score = namedWeaponCount(build) * 4
  if (build.exoticWeapon) score += 4
  if (build.aspects?.length) score += build.aspects.length * 2
  if (build.fragments?.length) score += build.fragments.length
  if (build.armorMods?.length) score += Math.min(build.armorMods.length, 4)
  if (build.summary) score += 3
  score += SITE_WEIGHT[build.sourceSite ?? ''] ?? 0
  return score
}

function consensusScoreLabel(siteCount: number, score: number, bestRank: number): string {
  if (siteCount >= 3) return `Cross-site consensus · ${siteCount} sources`
  if (siteCount === 2) return 'Confirmed on 2 build sites'
  if (bestRank === 1) return '#1 pick on a major build site'
  if (score >= 130) return 'Top community meta pick'
  if (score >= 100) return 'Highly recommended meta build'
  return 'Researched meta build'
}

/** Score one build using how many external sites list the same loadout identity. */
export function scoreBuildConsensus(
  build: ExternalBuildSource,
  allBuilds: ExternalBuildSource[],
  now = Date.now()
): number {
  const group = allBuilds.filter((b) => buildConsensusKey(b) === buildConsensusKey(build))
  const sites = siteSetForGroup(group)
  const bestRank = bestSourceRank(group)
  let score = 0

  score += Math.max(0, sites.size - 1) * 38
  score += Math.min(sites.size, 5) * 14
  score += Math.max(0, 110 - (bestRank - 1) * 18)
  score += SITE_WEIGHT[build.sourceSite ?? ''] ?? 5
  score += build.sourceRank != null ? Math.max(0, 40 - (build.sourceRank - 1) * 8) : 0
  score += namedWeaponCount(build) * 5
  if (build.exoticWeapon) score += 4
  if (build.excelsIn?.toLowerCase().includes('endgame')) score += 8

  if (!build.suggestionScope || build.suggestionScope === 'general') score += 18
  else if (build.suggestionScope === 'specialist') score += 6
  else score -= 25

  if (build.publishedAt) {
    const ageDays = (now - Date.parse(build.publishedAt)) / (24 * 60 * 60 * 1000)
    if (ageDays <= 14) score += 12
    else if (ageDays <= 28) score += 5
  }

  const checkedAgeDays = (now - Date.parse(build.lastChecked)) / (24 * 60 * 60 * 1000)
  if (checkedAgeDays <= 7) score += 8

  return Math.round(score)
}

export function applyConsensusScores(builds: ExternalBuildSource[], now = Date.now()): ExternalBuildSource[] {
  const groups = groupByConsensusKey(builds)
  return builds.map((build) => {
    const group = groups.get(buildConsensusKey(build)) ?? [build]
    const sites = siteSetForGroup(group)
    const bestRank = bestSourceRank(group)
    const score = scoreBuildConsensus(build, builds, now)
    return {
      ...build,
      aiScore: score,
      aiScoreLabel: consensusScoreLabel(sites.size, score, bestRank),
      consensusSiteCount: sites.size,
    }
  })
}

/** Keep the most complete listing per cross-site build identity. */
export function pickBestBuildPerConsensusKey(builds: ExternalBuildSource[]): ExternalBuildSource[] {
  const scored = applyConsensusScores(builds)
  const best = new Map<string, ExternalBuildSource>()
  for (const build of scored) {
    const key = buildConsensusKey(build)
    const existing = best.get(key)
    if (!existing) {
      best.set(key, build)
      continue
    }
    const buildScore = build.aiScore ?? 0
    const existingScore = existing.aiScore ?? 0
    if (buildScore > existingScore) {
      best.set(key, build)
      continue
    }
    if (buildScore === existingScore && buildCompleteness(build) > buildCompleteness(existing)) {
      best.set(key, build)
    }
  }
  return Array.from(best.values())
}

export type TopMetaLoadoutsByClass = Record<DestinyCharacterClass, ExternalBuildSource[]>

function eligibleTopMetaBuild(build: ExternalBuildSource): boolean {
  if (!build.approved) return false
  if (build.suggestionScope === 'activity') return false
  if (!build.exoticArmor?.trim()) return false
  return namedWeaponCount(build) >= 2
}

/** Top N cross-referenced meta loadouts per class for home / profile highlights. */
export function rankTopMetaLoadoutsByClass(
  builds: ExternalBuildSource[],
  perClass = 2
): TopMetaLoadoutsByClass {
  const pool = pickBestBuildPerConsensusKey(builds.filter(eligibleTopMetaBuild))
  const scored = applyConsensusScores(pool)
  const result = {} as TopMetaLoadoutsByClass
  for (const cls of CLASSES) {
    result[cls] = scored
      .filter((b) => b.class === cls)
      .sort((a, b) => (b.aiScore ?? 0) - (a.aiScore ?? 0))
      .slice(0, perClass)
  }
  return result
}

export function rankTrendingMetaBuilds(builds: ExternalBuildSource[], limit = 3): ExternalBuildSource[] {
  const pool = pickBestBuildPerConsensusKey(builds.filter(eligibleTopMetaBuild))
  return applyConsensusScores(pool)
    .sort((a, b) => (b.aiScore ?? 0) - (a.aiScore ?? 0))
    .slice(0, limit)
}

export function sortExternalBuildsByConsensus(builds: ExternalBuildSource[]): ExternalBuildSource[] {
  const deduped = pickBestBuildPerConsensusKey(builds.filter((b) => b.approved))
  return applyConsensusScores(deduped).sort((a, b) => (b.aiScore ?? 0) - (a.aiScore ?? 0))
}

export function consensusResearchSummary(builds: ExternalBuildSource[]): string {
  if (!builds.length) {
    return 'No external meta builds yet. Builds are checked each week with the Destiny reset.'
  }
  const deduped = pickBestBuildPerConsensusKey(builds)
  const multiSite = deduped.filter((b) => (b.consensusSiteCount ?? 0) >= 2).length
  const sites = Array.from(new Set(builds.map((b) => b.sourceSite ?? b.source))).slice(0, 5)
  const consensusNote =
    multiSite > 0
      ? `${multiSite} loadout${multiSite === 1 ? '' : 's'} confirmed across multiple sites. `
      : ''
  return `${deduped.length} unique meta loadout${deduped.length === 1 ? '' : 's'} cross-referenced from ${sites.join(', ')}. ${consensusNote}Verified PGCR builds are shown separately.`
}
