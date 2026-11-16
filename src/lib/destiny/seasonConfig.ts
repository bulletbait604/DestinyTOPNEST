import type { Season } from '@/lib/destiny/types'
import { NEST_SEASON_CATALOG, SEASON_TIME_ZONE, resolveActiveSeasonByDate } from '@/lib/destiny/seasonCatalog'

export { DEFAULT_SEASON_PRIZE_RULES, NEST_SEASON_CATALOG, PRESEASON_NAME, SEASON_LENGTH_MONTHS, SEASON_TIME_ZONE } from '@/lib/destiny/seasonCatalog'
export { resolveActiveSeasonByDate, getNextSeasonDefinition } from '@/lib/destiny/seasonCatalog'

/** Current operational season — resolves from the Nest catalog by date. */
export function getConfiguredActiveSeason(now = new Date()): Season {
  return resolveActiveSeasonByDate(now)
}

export function competitiveSeasonOne(): (typeof NEST_SEASON_CATALOG)[number] {
  const season = NEST_SEASON_CATALOG.find((def) => def.kind === 'season' && def.seasonNumber === 1)
  if (!season) throw new Error('Season 1 is missing from the catalog')
  return season
}

function pacificDay(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    timeZone: SEASON_TIME_ZONE,
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Before Jan 1 2027 the label is "Season 1 starts Jan 1".
 * Once that midnight passes, the live competitive season is "Season 1", then "Season 2", and so on.
 */
export function seasonBannerLabel(now = new Date()): string {
  const seasonOne = competitiveSeasonOne()
  if (now.getTime() < Date.parse(seasonOne.startDate)) {
    return `Season 1 starts ${pacificDay(seasonOne.startDate)}`
  }
  const active = resolveActiveSeasonByDate(now)
  if (active.kind === 'preseason' || !active.seasonNumber) return `Season 1 starts ${pacificDay(seasonOne.startDate)}`
  return `Season ${active.seasonNumber}`
}

export function getSeasonCountdown(season: Season = getConfiguredActiveSeason(), now = new Date()): {
  days: number
  hours: number
  label: string
} {
  const seasonOne = competitiveSeasonOne()
  const countingToSeasonOne = now.getTime() < Date.parse(seasonOne.startDate)
  const target = countingToSeasonOne ? Date.parse(seasonOne.startDate) : new Date(season.endDate).getTime()
  const diff = Math.max(0, target - now.getTime())
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  return { days, hours, label: seasonBannerLabel(now) }
}

export const PRIZE_SUMMARY =
  'Each season, #1 on the Raid, Dungeon and New Bonds boards wins: Destiny 2 3D print (USA/Canada, shipping covered) or $50 CAD Steam gift card (UK). Other countries not eligible.'

/** Hero title-panel prize sticker (leaderboards & home). */
export const HERO_PRIZE_POOL_STICKER = '3D-print prizes'
