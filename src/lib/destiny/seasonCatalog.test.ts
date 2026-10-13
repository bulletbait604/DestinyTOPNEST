import { describe, expect, it } from 'vitest'
import { NEST_SEASON_CATALOG, resolveActiveSeasonByDate, DEFAULT_SEASON_PRIZE_RULES, prizeForCountry } from './seasonCatalog'

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
  it('prize is a 3D print (US/CA) or $50 CAD Steam card (UK); old $250 pool gone', () => {
    const txt = JSON.stringify(DEFAULT_SEASON_PRIZE_RULES).toLowerCase()
    expect(txt).toContain('3d print')
    expect(txt).not.toMatch(/\$250|platform card|\$25 /)
    expect(prizeForCountry('US')).toContain('3D print')
    expect(prizeForCountry('ca')).toContain('3D print')
    expect(prizeForCountry('UK')).toBe('$50 CAD Steam gift card')
    expect(prizeForCountry('GB')).toBe('$50 CAD Steam gift card')
    expect(prizeForCountry('DE')).toBeNull()
  })
})
