import type { Season, SeasonPrizeRules } from '@/lib/destiny/types'

export interface NestSeasonDefinition {
  seasonNumber: number
  id: string
  name: string
  tagline: string
  /** Inclusive season window (UTC). */
  startDate: string
  endDate: string
}

export const SEASON_PRIZE_TEXT = 'Destiny 2 3D print (USA/Canada) or $50 CAD Steam gift card (UK)' as const

/** Prize eligibility by country of residence. Other countries are not eligible. */
export const PRIZE_ELIGIBILITY = {
  physicalPrizeCountries: ['US', 'CA'],
  physicalPrize: 'Destiny 2 3D print, shipping covered',
  giftCardCountries: ['GB'],
  giftCardPrize: '$50 CAD Steam gift card',
  summary:
    'USA and Canada winners receive a Destiny 2 3D print (shipping covered). UK winners receive a $50 CAD Steam gift card instead. Players in other countries can compete but are not eligible for prizes.',
} as const

export function prizeForCountry(countryCode: string): string | null {
  const c = countryCode.trim().toUpperCase()
  if ((PRIZE_ELIGIBILITY.physicalPrizeCountries as readonly string[]).includes(c)) return PRIZE_ELIGIBILITY.physicalPrize
  if ((PRIZE_ELIGIBILITY.giftCardCountries as readonly string[]).includes(c === 'UK' ? 'GB' : c)) return PRIZE_ELIGIBILITY.giftCardPrize
  if (c === 'UK') return PRIZE_ELIGIBILITY.giftCardPrize
  return null
}

/**
 * One prize per leaderboard per season: the #1 player on the Raid, Dungeon and
 * New Bonds boards each win a prize: a Destiny 2 3D print (USA/Canada, shipping covered)
 * or a $50 CAD Steam gift card (UK). Other countries are not eligible.
 */
export const DEFAULT_SEASON_PRIZE_RULES: SeasonPrizeRules = {
  raid: {
    first: SEASON_PRIZE_TEXT,
    second: 'Hall of Fame mention',
    thirdToFifth: 'Hall of Fame mention',
    participation: 'Season history',
  },
  dungeon: {
    first: SEASON_PRIZE_TEXT,
    second: 'Hall of Fame mention',
    thirdToFifth: 'Hall of Fame mention',
    participation: 'Season history',
  },
  newBonds: {
    first: SEASON_PRIZE_TEXT,
    second: 'Hall of Fame mention',
    thirdToFifth: 'Hall of Fame mention',
    participation: 'Season history',
  },
}

const QUARTER_NAMES: { name: string; tagline: string }[] = [
  { name: 'Season of New Bonds', tagline: 'Clear with Guardians you have never met — every new fireteam counts.' },
  { name: 'Season of the Open Hand', tagline: 'Veterans and new lights, one fireteam.' },
  { name: 'Season of the Long Watch', tagline: 'Raid and dungeon glory, earned together.' },
  { name: 'Season of the Kindled Flame', tagline: 'Bring someone through their first clear.' },
]

/** Pacific midnight of a calendar date, as UTC ISO (handles PST/PDT). */
export function pacificMidnightIso(year: number, month0: number, day = 1): string {
  // Probe offset at noon UTC on that day to pick PST (-8) or PDT (-7).
  const probe = new Date(Date.UTC(year, month0, day, 12))
  const tzName = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', timeZoneName: 'short' })
    .formatToParts(probe)
    .find((p) => p.type === 'timeZoneName')?.value
  const offsetHours = tzName === 'PDT' ? 7 : 8
  return new Date(Date.UTC(year, month0, day, offsetHours)).toISOString()
}

/** Quarterly seasons: Season 1 = Oct 1 – Dec 31 2026 (Pacific), then every 3 months. */
export function buildQuarterlyCatalog(count = 12): NestSeasonDefinition[] {
  const out: NestSeasonDefinition[] = []
  for (let i = 0; i < count; i++) {
    const startMonthIndex = 9 + i * 3 // Oct 2026 = month 9
    const y = 2026 + Math.floor(startMonthIndex / 12)
    const m = startMonthIndex % 12
    const endIdx = startMonthIndex + 3
    const ey = 2026 + Math.floor(endIdx / 12)
    const em = endIdx % 12
    const start = pacificMidnightIso(y, m, 1)
    const end = new Date(Date.parse(pacificMidnightIso(ey, em, 1)) - 1).toISOString()
    const label = QUARTER_NAMES[i % QUARTER_NAMES.length]!
    out.push({
      seasonNumber: i + 1,
      id: `dtn-q${String(i + 1).padStart(2, '0')}-${y}-${String(m + 1).padStart(2, '0')}`,
      name: label.name,
      tagline: label.tagline,
      startDate: start,
      endDate: end,
    })
  }
  return out
}

/** Quarterly Nest seasons (DB rows in destiny_seasons may override name/tagline/dates). */
export const NEST_SEASON_CATALOG: NestSeasonDefinition[] = buildQuarterlyCatalog()

export function seasonDefinitionToSeason(
  def: NestSeasonDefinition,
  status: Season['status'],
  overrides: Partial<Season> = {}
): Season {
  return {
    id: def.id,
    name: def.name,
    tagline: def.tagline,
    seasonNumber: def.seasonNumber,
    startDate: def.startDate,
    endDate: def.endDate,
    status,
    prizeRules: DEFAULT_SEASON_PRIZE_RULES,
    winners: [],
    ...overrides,
  }
}

export function resolveSeasonStatus(def: NestSeasonDefinition, now = new Date()): Season['status'] {
  const ts = now.getTime()
  const start = new Date(def.startDate).getTime()
  const end = new Date(def.endDate).getTime()
  if (ts < start) return 'upcoming'
  if (ts > end) return 'archived'
  return 'active'
}

/** Pick the catalog season that should drive live scoring for a given moment. */
export function resolveActiveSeasonByDate(now = new Date()): Season {
  const ts = now.getTime()

  for (const def of NEST_SEASON_CATALOG) {
    const start = new Date(def.startDate).getTime()
    const end = new Date(def.endDate).getTime()
    if (ts >= start && ts <= end) {
      return seasonDefinitionToSeason(def, 'active')
    }
  }

  const first = NEST_SEASON_CATALOG[0]
  if (ts < new Date(first.startDate).getTime()) {
    return seasonDefinitionToSeason(first, 'upcoming')
  }

  const last = NEST_SEASON_CATALOG[NEST_SEASON_CATALOG.length - 1]
  return seasonDefinitionToSeason(last, 'archived')
}

export function getSeasonDefinitionById(id: string): NestSeasonDefinition | undefined {
  return NEST_SEASON_CATALOG.find((def) => def.id === id)
}

export function getNextSeasonDefinition(afterId: string): NestSeasonDefinition | undefined {
  const index = NEST_SEASON_CATALOG.findIndex((def) => def.id === afterId)
  if (index < 0) return undefined
  return NEST_SEASON_CATALOG[index + 1]
}

export function mergeSeasonWithDefinition(stored: Season, def: NestSeasonDefinition): Season {
  return {
    ...seasonDefinitionToSeason(def, stored.status, {
      prizeRules: stored.prizeRules ?? DEFAULT_SEASON_PRIZE_RULES,
      winners: stored.winners,
    }),
    ...stored,
    id: def.id,
    seasonNumber: def.seasonNumber,
    // Admin edits (destiny_seasons.adminOverride) win over the generated catalog.
    name: stored.adminOverride?.name || def.name,
    tagline: stored.adminOverride?.tagline || def.tagline,
    startDate: stored.adminOverride?.startDate || def.startDate,
    endDate: stored.adminOverride?.endDate || def.endDate,
    prizeRules: stored.prizeRulesEdited
      ? {
          raid: { ...DEFAULT_SEASON_PRIZE_RULES.raid, ...stored.prizeRules?.raid },
          dungeon: { ...DEFAULT_SEASON_PRIZE_RULES.dungeon, ...stored.prizeRules?.dungeon },
          newBonds: {
            first: stored.prizeRules?.newBonds?.first ?? DEFAULT_SEASON_PRIZE_RULES.newBonds!.first,
            second: stored.prizeRules?.newBonds?.second ?? DEFAULT_SEASON_PRIZE_RULES.newBonds!.second,
            thirdToFifth:
              stored.prizeRules?.newBonds?.thirdToFifth ?? DEFAULT_SEASON_PRIZE_RULES.newBonds!.thirdToFifth,
            participation:
              stored.prizeRules?.newBonds?.participation ?? DEFAULT_SEASON_PRIZE_RULES.newBonds!.participation,
          },
        }
      : {
          ...(stored.prizeRules ?? {}),
          ...DEFAULT_SEASON_PRIZE_RULES,
        },
  }
}
