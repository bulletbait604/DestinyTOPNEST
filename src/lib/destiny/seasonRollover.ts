import { NEST_SEASON_CATALOG, type NestSeasonDefinition } from '@/lib/destiny/seasonCatalog'

export interface SeasonFreezeRow {
  id: string
  standingsFrozenAt?: string
}

/** Catalog windows whose end has passed. Run documents are not part of this list. */
export function catalogSeasonsEndedBy(now = new Date()): NestSeasonDefinition[] {
  const ts = now.getTime()
  return NEST_SEASON_CATALOG.filter((def) => Date.parse(def.endDate) < ts)
}

/** The window that just finished, if any. During the preseason this is empty. */
export function previousSeasonDefinition(now = new Date()): NestSeasonDefinition | undefined {
  const ended = catalogSeasonsEndedBy(now)
  return ended[ended.length - 1]
}

/**
 * Ended windows that do not yet have a standings snapshot.
 * Callers write winners onto the season row. They do not delete runs.
 */
export function seasonsAwaitingFreeze(now: Date, stored: SeasonFreezeRow[]): NestSeasonDefinition[] {
  const frozen = new Set(stored.filter((row) => row.standingsFrozenAt).map((row) => row.id))
  return catalogSeasonsEndedBy(now).filter((def) => !frozen.has(def.id))
}
