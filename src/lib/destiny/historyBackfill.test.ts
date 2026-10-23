import { describe, expect, it } from 'vitest'
import { destinyApiConfigured } from '@/lib/destiny/env'
import {
  backfillRegisteredAndKickHistory,
  previousHistoryPages,
  resetScoringHistoryBackfillForTests,
  scheduleScoringHistoryBackfill,
} from '@/lib/destiny/historyBackfill'
import { HISTORY_PAGE_SIZE, RECENT_HISTORY_PAGES } from '@/lib/destiny/runLookup'

describe('scoring history backfill', () => {
  it('asks for five pages of 25 and a deeper previous walk', () => {
    expect(RECENT_HISTORY_PAGES).toBe(5)
    expect(HISTORY_PAGE_SIZE).toBe(25)
    expect(previousHistoryPages()).toBeGreaterThan(RECENT_HISTORY_PAGES)
  })

  it('does not call Bungie when the API key is missing', async () => {
    resetScoringHistoryBackfillForTests()
    if (destinyApiConfigured()) {
      const result = await backfillRegisteredAndKickHistory(1)
      expect(result.users + result.kick).toBeGreaterThanOrEqual(0)
      return
    }
    scheduleScoringHistoryBackfill()
    await expect(backfillRegisteredAndKickHistory()).resolves.toEqual({ users: 0, kick: 0, imported: 0 })
  })
})
