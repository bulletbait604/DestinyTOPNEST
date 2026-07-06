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

/** Shared prize structure across Nest seasons — adjust per season in admin if needed. */
export const DEFAULT_SEASON_PRIZE_RULES: SeasonPrizeRules = {
  raid: {
    first: '$50 CAD platform card (Xbox / PlayStation / Steam)',
    second: '$25 CAD platform card',
    thirdToFifth: '3D print prize',
    participation: 'Leaderboard history mention',
  },
  dungeon: {
    first: '$50 CAD platform card',
    second: '$25 CAD platform card',
    thirdToFifth: '3D print prize',
    participation: 'Leaderboard history mention',
  },
  topGuardians: {
    first: 'Commander — $50 CAD platform card',
    second: 'Commander — $25 CAD platform card',
    third: 'Commander — 3D print prize',
  },
}

/** Monthly Nest seasons — Season 1 begins July 1, 2026 (launch). */
export const NEST_SEASON_CATALOG: NestSeasonDefinition[] = [
  {
    seasonNumber: 1,
    id: 'dtn-s01-monument-era',
    name: 'Season of the Monument Era',
    tagline: 'The inaugural launch theme',
    startDate: '2026-07-01T17:00:00.000Z',
    endDate: '2026-07-31T23:59:59.999Z',
  },
  {
    seasonNumber: 2,
    id: 'dtn-s02-skyward-oath',
    name: 'Season of the Skyward Oath',
    tagline: 'Focusing on community, honor, and the Guardian Oath',
    startDate: '2026-08-01T17:00:00.000Z',
    endDate: '2026-08-31T23:59:59.999Z',
  },
  {
    seasonNumber: 3,
    id: 'dtn-s03-high-eyrie',
    name: 'Season of the High Eyrie',
    tagline: 'The peak of the leaderboards',
    startDate: '2026-09-01T17:00:00.000Z',
    endDate: '2026-09-30T23:59:59.999Z',
  },
  {
    seasonNumber: 4,
    id: 'dtn-s04-apex-flight',
    name: 'Season of the Apex Flight',
    tagline: 'Focused on the race to climb the boards',
    startDate: '2026-10-01T17:00:00.000Z',
    endDate: '2026-10-31T23:59:59.999Z',
  },
  {
    seasonNumber: 5,
    id: 'dtn-s05-gilded-talon',
    name: 'Season of the Gilded Talon',
    tagline: 'Highlighting premium digital and physical rewards',
    startDate: '2026-11-01T17:00:00.000Z',
    endDate: '2026-11-30T23:59:59.999Z',
  },
  {
    seasonNumber: 6,
    id: 'dtn-s06-astral-forge',
    name: 'Season of the Astral Forge',
    tagline: 'Leaning into your custom 3D-printed prize culture',
    startDate: '2026-12-01T17:00:00.000Z',
    endDate: '2026-12-31T23:59:59.999Z',
  },
  {
    seasonNumber: 7,
    id: 'dtn-s07-eyrie-sovereign',
    name: 'Season of the Eyrie Sovereign',
    tagline: 'A regal theme for the top leaderboard spots',
    startDate: '2027-01-01T17:00:00.000Z',
    endDate: '2027-01-31T23:59:59.999Z',
  },
  {
    seasonNumber: 8,
    id: 'dtn-s08-nestborn',
    name: 'Season of the Nestborn',
    tagline: 'Celebrating the growth of the community core',
    startDate: '2027-02-01T17:00:00.000Z',
    endDate: '2027-02-28T23:59:59.999Z',
  },
  {
    seasonNumber: 9,
    id: 'dtn-s09-vanguards-crest',
    name: "Season of the Vanguard's Crest",
    tagline: 'Grounding the app within the classic Tower lore',
    startDate: '2027-03-01T17:00:00.000Z',
    endDate: '2027-03-31T23:59:59.999Z',
  },
  {
    seasonNumber: 10,
    id: 'dtn-s10-molten-crest',
    name: 'Season of the Molten Crest',
    tagline: 'A fiery theme for competitive faction shakeups',
    startDate: '2027-04-01T17:00:00.000Z',
    endDate: '2027-04-30T23:59:59.999Z',
  },
  {
    seasonNumber: 11,
    id: 'dtn-s11-iron-hatchling',
    name: 'Season of the Iron Hatchling',
    tagline: 'A social-first season prioritizing fireteam building and more casual play',
    startDate: '2027-05-01T17:00:00.000Z',
    endDate: '2027-05-31T23:59:59.999Z',
  },
  {
    seasonNumber: 12,
    id: 'dtn-s12-golden-roost',
    name: 'Season of the Golden Roost',
    tagline:
      'Celebrating the social hub of the community, where casual and endgame players come together to share builds, vote on MVPs, and chill',
    startDate: '2027-06-01T17:00:00.000Z',
    endDate: '2027-06-30T23:59:59.999Z',
  },
]

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
    name: def.name,
    tagline: def.tagline,
    seasonNumber: def.seasonNumber,
    startDate: def.startDate,
    endDate: def.endDate,
  }
}
