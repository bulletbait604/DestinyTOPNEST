import type { Season } from '@/lib/destiny/types'
import { resolveActiveSeasonByDate } from '@/lib/destiny/seasonCatalog'

export { DEFAULT_SEASON_PRIZE_RULES, NEST_SEASON_CATALOG } from '@/lib/destiny/seasonCatalog'
export { resolveActiveSeasonByDate, getNextSeasonDefinition } from '@/lib/destiny/seasonCatalog'

/** Current operational season — resolves from the Nest catalog by date. */
export function getConfiguredActiveSeason(now = new Date()): Season {
  return resolveActiveSeasonByDate(now)
}

export function getSeasonCountdown(season: Season = getConfiguredActiveSeason()): {
  days: number
  hours: number
  label: string
} {
  const end = new Date(season.endDate).getTime()
  const now = Date.now()
  const diff = Math.max(0, end - now)
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  return { days, hours, label: `${days}d ${hours}h until season end` }
}

export const PRIZE_SUMMARY =
  'Each season, #1 on the Raid, Dungeon and New Bonds boards wins: Destiny 2 3D print (USA/Canada, shipping covered) or $50 CAD Steam gift card (UK). Other countries not eligible.'

/** Hero title-panel prize sticker (leaderboards & home). */
export const HERO_PRIZE_POOL_STICKER = '3D-print prizes'
