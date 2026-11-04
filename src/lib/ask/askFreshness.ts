import type { AskSource } from '@/lib/ask/askSources'
import { getLiveManifestVersion } from '@/lib/destiny/manifest'
import { refreshLiveWeeklyRotationBounded } from '@/lib/destiny/bungieWeekly'
import { getWeeklyResetState } from '@/lib/destiny/weeklyRotation'

/** Live sandbox as of November 2026. Bungie called 9.7.0 the final major patch. */
export const CURRENT_SEASON = 'Monument of Triumph'
export const CURRENT_PATCH = 'Update 9.7.0'
export const CURRENT_PATCH_DATE = '2026-06-09'

/** Answers about the live week should not sit for days. */
export const ASK_CACHE_MS = 6 * 60 * 60 * 1000

const MANIFEST_PROBE_MS = 6 * 60 * 60 * 1000
let manifestProbe: { at: number; version?: string } | null = null

export function askCacheIsFresh(createdAt: string, now = Date.now(), ttl = ASK_CACHE_MS): boolean {
  const parsed = Date.parse(createdAt)
  if (!Number.isFinite(parsed)) return false
  return now - parsed >= 0 && now - parsed <= ttl
}

export function formatSandboxBrief(input: {
  now: Date
  weekLabel: string
  resetsInLabel: string
  raids: string[]
  dungeons: string[]
  nightfall?: string
  rotationSource: string
  manifestVersion?: string
}): string {
  const today = input.now.toISOString().slice(0, 10)
  const raids = input.raids.length ? input.raids.join(', ') : 'not listed'
  const dungeons = input.dungeons.length ? input.dungeons.join(', ') : 'not listed'
  const nightfall = input.nightfall?.trim() || 'not named by the live feed. Do not guess a strike name.'
  const manifest = input.manifestVersion
    ? `Bungie manifest version checked just now: ${input.manifestVersion}.`
    : 'Bungie manifest version was not available on this request. Do not invent a version.'
  return [
    `Today is ${today}.`,
    `Current season and patch: ${CURRENT_SEASON} (${CURRENT_PATCH}), released ${CURRENT_PATCH_DATE}. That is still the live sandbox.`,
    `This week is ${input.weekLabel}. Featured raids: ${raids}. Featured dungeons: ${dungeons}. Nightfall: ${nightfall}.`,
    `Weekly reset is Tuesday at 17:00 UTC. Time until reset: ${input.resetsInLabel}. Rotation source: ${input.rotationSource}.`,
    manifest,
    'Update 9.7.0 added three aspects: Shieldburst for Sunbreaker, Crackshot for Gunslinger, and Soul Siphon for Voidwalker. Armor 3.0 Exotic armor is Tier 5. Hallowfire Heart was reworked around a charged Solar super and Sunfire Furnace stacks. If a page does not mention a change, say you are not sure instead of saying nothing changed.',
  ].join('\n')
}

/** Lower is better. Official Bungie pages and news posts come before build sites and Reddit. */
export function sourceRank(source: AskSource): number {
  let host = ''
  try {
    host = new URL(source.url).hostname.toLowerCase()
  } catch {
    return 80
  }
  let score = 40
  if (host === 'www.bungie.net' || host === 'bungie.net' || host === 'help.bungie.net') score = 0
  else if (host.endsWith('light.gg') || host.endsWith('blueberries.gg') || host.endsWith('d2foundry.gg')) score = 10
  else if (host.endsWith('fandom.com')) score = 20
  else if (host.endsWith('reddit.com')) score = 30
  if (source.url.includes('/News/')) score -= 2
  return score
}

export function rankAskSources(sources: AskSource[]): AskSource[] {
  return [...sources].sort((a, b) => {
    const rank = sourceRank(a) - sourceRank(b)
    if (rank !== 0) return rank
    const aTime = Date.parse(a.publishedAt ?? '') || 0
    const bTime = Date.parse(b.publishedAt ?? '') || 0
    return bTime - aTime
  })
}

export async function currentManifestVersion(now = Date.now()): Promise<string | undefined> {
  if (manifestProbe && now - manifestProbe.at < MANIFEST_PROBE_MS) return manifestProbe.version
  const version = await getLiveManifestVersion()
  manifestProbe = { at: now, version }
  return version
}

export function resetManifestProbe(): void {
  manifestProbe = null
}

/** Date, patch, this week's raid and dungeon, and the live manifest version. */
export async function loadAskSandbox(now = new Date()): Promise<string> {
  await refreshLiveWeeklyRotationBounded(now, 4000).catch(() => undefined)
  const week = getWeeklyResetState(now)
  const manifestVersion = await currentManifestVersion(now.getTime()).catch(() => undefined)
  return formatSandboxBrief({
    now,
    weekLabel: week.weekLabel,
    resetsInLabel: week.resetsInLabel,
    raids: week.featuredRaids.map((raid) => raid.name),
    dungeons: week.featuredDungeons.map((dungeon) => dungeon.name),
    nightfall: week.nightfall,
    rotationSource: week.rotationSource,
    manifestVersion,
  })
}
