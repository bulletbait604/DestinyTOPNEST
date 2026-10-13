import { describe, expect, it } from 'vitest'
import { NEST_SEASON_CATALOG, resolveActiveSeasonByDate, DEFAULT_SEASON_PRIZE_RULES } from './seasonCatalog'

describe('quarterly seasons', () => {
  it('season 1 is Oct 1 – Dec 31 2026 Pacific', () => {
    const s1 = NEST_SEASON_CATALOG[0]!
    expect(s1.startDate).toBe('2026-10-01T07:00:00.000Z')
    expect(s1.endDate).toBe('2027-01-01T07:59:59.999Z')
  })
  it('season 2 starts Jan 1 2027 Pacific (PST)', () => {
    expect(NEST_SEASON_CATALOG[1]!.startDate).toBe('2027-01-01T08:00:00.000Z')
  })
  it('seasons are contiguous', () => {
    for (let i = 1; i < NEST_SEASON_CATALOG.length; i++) {
      expect(Date.parse(NEST_SEASON_CATALOG[i]!.startDate) - Date.parse(NEST_SEASON_CATALOG[i - 1]!.endDate)).toBe(1)
    }
  })
  it('resolves the active season', () => {
    expect(resolveActiveSeasonByDate(new Date('2026-10-13T18:00:00Z')).seasonNumber).toBe(1)
    expect(resolveActiveSeasonByDate(new Date('2027-02-10T18:00:00Z')).seasonNumber).toBe(2)
  })
  it('prizes are 3D prints only, no cash or cards', () => {
    const txt = JSON.stringify(DEFAULT_SEASON_PRIZE_RULES).toLowerCase()
    expect(txt).toContain('3d print')
    expect(txt).not.toMatch(/\$|cad|card/)
  })
})
