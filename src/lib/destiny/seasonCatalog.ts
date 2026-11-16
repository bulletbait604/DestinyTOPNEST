import type { Season, SeasonPrizeRules } from '@/lib/destiny/types'

export const SEASON_TIME_ZONE = 'America/Vancouver'
/** Competitive seasons after the preseason. Season 2 starts three months after Season 1. */
export const SEASON_LENGTH_MONTHS = 3
/** Season 1 opens at this Pacific midnight. It is a restart, not a continuation of the preseason. */
export const SEASON_ONE_START = { year: 2027, month: 1, day: 1 } as const
/** Beta window. Standings are archived under this name. Runs are not deleted. */
export const PRESEASON_START = { year: 2026, month: 10, day: 1 } as const
export const PRESEASON_NAME = 'Preseason (Oct-Dec 2026)'

export type SeasonKind = 'preseason' | 'season'

export interface NestSeasonDefinition {
  /** 0 for the preseason. Competitive seasons start at 1 on Jan 1, 2027. */
  seasonNumber: number
  kind: SeasonKind
  id: string
  name: string
  tagline: string
  /** Inclusive window (UTC instants of America/Vancouver wall time). */
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
    second: 'Listed on the season Hall',
    thirdToFifth: 'Listed on the season Hall',
    participation: 'Season history',
  },
  dungeon: {
    first: SEASON_PRIZE_TEXT,
    second: 'Listed on the season Hall',
    thirdToFifth: 'Listed on the season Hall',
    participation: 'Season history',
  },
  newBonds: {
    first: SEASON_PRIZE_TEXT,
    second: 'Listed on the season Hall',
    thirdToFifth: 'Listed on the season Hall',
    participation: 'Season history',
  },
}

const QUARTER_NAMES: { name: string; tagline: string }[] = [
  { name: 'Season of New Bonds', tagline: 'Clear with Guardians you have never met — every new fireteam counts.' },
  { name: 'Season of the Open Hand', tagline: 'Veterans and new lights, one fireteam.' },
  { name: 'Season of the Long Watch', tagline: 'Raid and dungeon glory, earned together.' },
  { name: 'Season of the Kindled Flame', tagline: 'Bring someone through their first clear.' },
]

/** Local clock minus UTC, in milliseconds, for an instant in the season timezone. */
export function timeZoneOffsetMs(instant: Date, timeZone = SEASON_TIME_ZONE): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant)
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 'NaN')
  const asUtc = Date.UTC(pick('year'), pick('month') - 1, pick('day'), pick('hour'), pick('minute'), pick('second'))
  return asUtc - instant.getTime()
}

/** UTC instant of a wall-clock time in America/Vancouver (or another zone). */
export function zonedWallTimeUtc(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
  millisecond = 0,
  timeZone = SEASON_TIME_ZONE
): Date {
  const wallAsUtc = Date.UTC(year, month - 1, day, hour, minute, second, millisecond)
  let utc = wallAsUtc
  for (let pass = 0; pass < 3; pass += 1) {
    utc = wallAsUtc - timeZoneOffsetMs(new Date(utc), timeZone)
  }
  return new Date(utc)
}

/** Midnight at the start of a calendar day in the season timezone. `month0` is 0-based. */
export function pacificMidnightIso(year: number, month0: number, day = 1): string {
  return zonedWallTimeUtc(year, month0 + 1, day).toISOString()
}

function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const index = year * 12 + (month - 1) + delta
  return { year: Math.floor(index / 12), month: (index % 12) + 1 }
}

/** Inclusive window: start at local midnight, end 1ms before the next local midnight. */
export function seasonWindow(startYear: number, startMonth: number, endYear: number, endMonth: number): {
  startDate: string
  endDate: string
} {
  const start = zonedWallTimeUtc(startYear, startMonth, 1)
  const end = new Date(zonedWallTimeUtc(endYear, endMonth, 1).getTime() - 1)
  return { startDate: start.toISOString(), endDate: end.toISOString() }
}

/**
 * Preseason is Oct 1–Dec 31 2026 Pacific. Season 1 restarts Jan 1 2027 and lasts
 * SEASON_LENGTH_MONTHS. Season 2 opens the next boundary (Apr 1), then Jul 1, Oct 1, and so on.
 */
export function buildQuarterlyCatalog(count = 12): NestSeasonDefinition[] {
  const pre = seasonWindow(PRESEASON_START.year, PRESEASON_START.month, SEASON_ONE_START.year, SEASON_ONE_START.month)
  const out: NestSeasonDefinition[] = [
    {
      seasonNumber: 0,
      kind: 'preseason',
      id: 'dtn-preseason-2026',
      name: PRESEASON_NAME,
      tagline: 'Beta standings. Archived when Season 1 starts. Clears are not deleted.',
      startDate: pre.startDate,
      endDate: pre.endDate,
    },
  ]
  let year: number = SEASON_ONE_START.year
  let month: number = SEASON_ONE_START.month
  for (let i = 0; i < count; i += 1) {
    const next = addMonths(year, month, SEASON_LENGTH_MONTHS)
    const span = seasonWindow(year, month, next.year, next.month)
    const label = QUARTER_NAMES[i % QUARTER_NAMES.length]!
    const seasonNumber = i + 1
    out.push({
      seasonNumber,
      kind: 'season',
      id: `dtn-s${String(seasonNumber).padStart(2, '0')}-${year}-${String(month).padStart(2, '0')}`,
      name: `Season ${seasonNumber}`,
      tagline: label.tagline,
      startDate: span.startDate,
      endDate: span.endDate,
    })
    year = next.year
    month = next.month
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
    kind: def.kind,
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
    kind: def.kind,
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
