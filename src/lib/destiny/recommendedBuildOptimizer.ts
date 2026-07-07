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
import {
  CORE_ABILITY_MODS,
  CORE_SURVIVAL_MODS,
  isPublishedAfterCutoff,
  META_BUILD_EARLIEST_PUBLISHED,
  suggestArmorSetStrategy,
  validateExoticRules,
} from '@/lib/destiny/destinyBuildKnowledge'
import {
  isValidMetaBuild,
  legendaryArmorForMetaBuild,
  validateMetaBuildIntegrity,
} from '@/lib/destiny/metaBuildClassRules'

export interface RankedRecommendedLoadout {
  id: string
  kind: 'optimized'
  title: string
  characterClass: DestinyCharacterClass
  subclass: string
  score: number
  scoreLabel: string
  summary?: string
  sourceLabel: string
  build: ExternalBuildSource
  optimizationNotes: string[]
}

const PLACEHOLDER_WEAPON =
  /^(kinetic|energy|power|arc|solar|void|strand|stasis|prismatic)\s+(primary|special|heavy|weapon)|^(pulse rifle|trace rifle|rocket launcher|linear fusion|sword|heavy gl|smg|auto rifle|hand cannon|bow|fusion rifle|sniper rifle|machine gun|grenade launcher)$/i

function isRecentMeta(build: ExternalBuildSource): boolean {
  if (!build.approved) return false
  return (
    isPublishedAfterCutoff(build.publishedAt, META_BUILD_EARLIEST_PUBLISHED) ||
    isPublishedAfterCutoff(build.lastChecked, META_BUILD_EARLIEST_PUBLISHED)
  )
}

function scoreVerified(build: BuildIntelligenceCard): number {
  if (build.usageRatePercent < 0.5 || build.successRatePercent < 55) return 0
  if (!build.exoticArmor || build.exoticArmor === 'Unknown exotic') return 0
  return Math.round(build.usageRatePercent * 2 + build.successRatePercent - build.deathRatePercent * 0.5)
}

function verifiedConsensusKey(build: BuildIntelligenceCard): string {
  const exoticArmor =
    build.exoticArmor && build.exoticArmor !== 'Unknown exotic' ? build.exoticArmor : 'none'
  return buildConsensusKey({
    class: build.characterClass,
    subclass: build.subclass === 'Unknown' ? 'unknown' : build.subclass,
    exoticArmor,
  })
}

function mergeWeapons(meta: ExternalBuildSource, verified?: BuildIntelligenceCard): string[] {
  const metaWeapons = (meta.weapons ?? []).filter((w) => w.trim() && !PLACEHOLDER_WEAPON.test(w.trim()))
  if (!verified?.weapons?.length) return metaWeapons

  const verifiedWeapons = verified.weapons.filter((w) => w.trim() && !PLACEHOLDER_WEAPON.test(w.trim()))
  const seen = new Set(metaWeapons.map((w) => w.toLowerCase()))
  const merged = [...metaWeapons]

  for (const weapon of verifiedWeapons) {
    if (seen.has(weapon.toLowerCase())) continue
    if (merged.length >= 3) break
    merged.push(weapon)
    seen.add(weapon.toLowerCase())
  }

  return merged.slice(0, 3)
}

function mergeMods(meta: ExternalBuildSource): string[] {
  const mods = new Set(meta.armorMods ?? [])
  for (const mod of CORE_SURVIVAL_MODS) {
    if (mods.size >= 6) break
    if (!Array.from(mods).some((m) => m.toLowerCase().includes(mod.toLowerCase()))) {
      mods.add(mod)
    }
  }
  for (const mod of CORE_ABILITY_MODS) {
    if (mods.size >= 6) break
    if (!Array.from(mods).some((m) => m.toLowerCase().includes(mod.toLowerCase()))) {
      mods.add(mod)
    }
  }
  return Array.from(mods)
}

function isCompleteMetaBuild(build: ExternalBuildSource): boolean {
  const weapons = (build.weapons ?? []).filter((w) => w.trim() && !PLACEHOLDER_WEAPON.test(w.trim()))
  return (
    weapons.length >= 3 &&
    Boolean(build.exoticArmor?.trim()) &&
    Boolean(build.subclass?.trim()) &&
    (build.aspects?.length ?? 0) >= 1 &&
    isValidMetaBuild(build)
  )
}

function findBestVerifiedMatch(
  meta: ExternalBuildSource,
  verifiedBuilds: BuildIntelligenceCard[]
): BuildIntelligenceCard | undefined {
  const key = buildConsensusKey(meta)
  let best: { build: BuildIntelligenceCard; score: number } | undefined

  for (const build of verifiedBuilds) {
    if (build.characterClass !== meta.class) continue
    const score = scoreVerified(build)
    if (score <= 0) continue

    const sameIdentity = verifiedConsensusKey(build) === key
    const sameSubclass =
      build.subclass !== 'Unknown' &&
      build.subclass.toLowerCase() === meta.subclass.toLowerCase()
    if (!sameIdentity && !sameSubclass) continue

    if (!best || score > best.score) best = { build, score }
  }

  return best?.build
}

function optimizeBuild(
  meta: ExternalBuildSource,
  verified: BuildIntelligenceCard | undefined,
  allMeta: ExternalBuildSource[]
): RankedRecommendedLoadout {
  const weapons = mergeWeapons(meta, verified)
  const armorMods = mergeMods(meta)
  const armorStrategy = suggestArmorSetStrategy(meta.activityFocus, meta.class)
  const exoticIssues = validateExoticRules(meta.exoticArmor, meta.exoticWeapon, weapons)
  const classIssues = validateMetaBuildIntegrity(meta)

  const optimizationNotes: string[] = [
    armorStrategy.note,
    `Armor 3.0 layout: ${armorStrategy.strategy} using ${armorStrategy.setHint}.`,
  ]

  if (verified) {
    optimizationNotes.push(
      `Cross-referenced with Top Nest verified clears on ${verified.activityName} (${verified.usageRatePercent}% usage, ${verified.successRatePercent}% success).`
    )
    if (verified.weapons?.length) {
      const added = weapons.filter((w) => !(meta.weapons ?? []).includes(w))
      if (added.length) {
        optimizationNotes.push(`Added verified fireteam weapons: ${added.join(', ')}.`)
      }
    }
  } else {
    optimizationNotes.push('No matching verified PGCR build yet — meta site layout kept as the base.')
  }

  if (exoticIssues.length) {
    optimizationNotes.push(...exoticIssues)
  }
  if (classIssues.length) {
    optimizationNotes.push(...classIssues)
  }

  const consensusScore = scoreBuildConsensus(meta, allMeta)
  const score = consensusScore + (verified ? Math.min(40, scoreVerified(verified) / 3) : 0)

  const optimized: ExternalBuildSource = {
    ...meta,
    id: `optimized-${meta.id}`,
    title: `${meta.title} (Optimized)`,
    weapons,
    armorMods,
    legendaryArmor: legendaryArmorForMetaBuild(meta),
    summary: [
      meta.summary,
      verified
        ? `Blends ${meta.sourceSite ?? 'meta site'} research with verified Top Nest ${verified.activityName} clears.`
        : `Optimized for Armor 3.0 using ${meta.sourceSite ?? 'meta site'} research.`,
    ]
      .filter(Boolean)
      .join(' '),
    aiScore: score,
    aiScoreLabel: verified ? 'Meta + verified hybrid' : 'Armor 3.0 optimized meta',
    optimized: true,
    optimizationNotes,
    verifiedCrossRef: verified
      ? {
          activityName: verified.activityName,
          usageRatePercent: verified.usageRatePercent,
          successRatePercent: verified.successRatePercent,
        }
      : undefined,
  }

  return {
    id: optimized.id,
    kind: 'optimized',
    title: optimized.title,
    characterClass: meta.class,
    subclass: meta.subclass,
    score,
    scoreLabel: optimized.aiScoreLabel ?? 'Recommended hybrid',
    summary: optimized.summary,
    sourceLabel: verified ? `${meta.sourceSite ?? meta.source} + Top Nest verified` : meta.sourceSite ?? meta.source,
    build: optimized,
    optimizationNotes,
  }
}

/**
 * Recommended loadouts ONLY — merges post–June 5 meta research with verified PGCR builds.
 * Top loadouts tab must NOT use this; it shows raw site + raw PGCR lists.
 */
export function rankRecommendedLoadoutsForClass(
  characterClass: DestinyCharacterClass,
  externalBuilds: ExternalBuildSource[],
  verifiedBuilds: BuildIntelligenceCard[],
  limit = 4
): RankedRecommendedLoadout[] {
  const recentMeta = externalBuilds.filter(
    (b) =>
      b.class === characterClass &&
      isRecentMeta(b) &&
      b.suggestionScope !== 'activity' &&
      b.suggestionScope !== 'specialist' &&
      b.exoticArmor?.trim() &&
      isCompleteMetaBuild(b)
  )

  const candidates = pickBestBuildPerConsensusKey(recentMeta)
    .sort((a, b) => scoreBuildConsensus(b, externalBuilds) - scoreBuildConsensus(a, externalBuilds))
    .slice(0, limit)

  const classVerified = verifiedBuilds.filter((b) => b.characterClass === characterClass)

  return candidates
    .map((meta) => optimizeBuild(meta, findBestVerifiedMatch(meta, classVerified), externalBuilds))
    .filter((pick) => isValidMetaBuild(pick.build))
}

export function recommendedLoadoutsSummary(
  characterClass: DestinyCharacterClass,
  picks: RankedRecommendedLoadout[]
): string {
  if (!picks.length) {
    return `No optimized ${characterClass} recommendations yet — sync verified runs and refresh meta research (published after June 5, 2026).`
  }
  return `${picks.length} Armor 3.0–aware hybrid${picks.length === 1 ? '' : 's'} for ${characterClass}: cross-referenced from build sites and Top Nest verified clears. Top builds tab still shows unmodified originals.`
}
