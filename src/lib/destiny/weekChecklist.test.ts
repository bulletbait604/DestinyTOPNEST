import { describe, expect, it } from 'vitest'
import { ACTIVITY_CATALOG } from '@/lib/destiny/activityCatalog'
import {
  activitiesFromNames,
  buildWeekPayload,
  clearStatusLabel,
  historyActivityKey,
  interpretHistoryRow,
  loadPersonalWeek,
  readModeHistory,
  rotationSourceLabel,
  SIGNED_OUT_MESSAGE,
  summarizeWeekClears,
  type RawHistoryActivity,
  type WeekChecklistActivity,
} from '@/lib/destiny/weekChecklist'
import { getWeeklyResetState } from '@/lib/destiny/weeklyRotation'

const RESET = '2026-11-03T17:00:00.000Z'
const RESET_MS = Date.parse(RESET)
const VOW = ACTIVITY_CATALOG['vow of the disciple']!.hash

const activities: WeekChecklistActivity[] = activitiesFromNames(
  ['Vow of the Disciple', 'Last Wish'],
  ['Prophecy', "Vesper's Host"]
)

function row(partial: RawHistoryActivity): RawHistoryActivity {
  return partial
}

describe('week checklist', () => {
  it('labels every rotation source without calling the list live when it is not', () => {
    expect(rotationSourceLabel('bungie')).toContain('Bungie milestones')
    expect(rotationSourceLabel('schedule')).toContain('backup calendar')
    expect(rotationSourceLabel('web')).toContain('saved weekly post')
    expect(rotationSourceLabel('mixed')).toContain('Part of this list')
  })

  it('uses words for each clear state', () => {
    expect(clearStatusLabel('cleared')).toBe('Cleared')
    expect(clearStatusLabel('not_cleared')).toBe('Not yet')
    expect(clearStatusLabel('unknown')).toBe('Could not check')
    expect(clearStatusLabel('not_checked')).toBe('Not checked')
  })

  it('counts a completion after reset, including a master name and a catalog hash', () => {
    const dated = interpretHistoryRow(
      row({
        period: '2026-11-05T02:00:00Z',
        activityDetails: { referenceId: 999, completionReason: 0 },
      }),
      RESET_MS,
      'Vow of the Disciple: Master'
    )
    const byHash = interpretHistoryRow(
      row({
        period: '2026-11-04T18:00:00Z',
        activityDetails: { referenceId: VOW, completionReason: 0 },
      }),
      RESET_MS,
      null
    )
    const before = interpretHistoryRow(
      row({
        period: '2026-11-01T18:00:00Z',
        activityDetails: { referenceId: VOW, completionReason: 0 },
      }),
      RESET_MS,
      null
    )
    const failed = interpretHistoryRow(
      row({
        period: '2026-11-05T03:00:00Z',
        activityDetails: { referenceId: VOW, completionReason: 1 },
      }),
      RESET_MS,
      null
    )
    expect(before).toBeNull()
    expect(failed?.completed).toBe(false)
    expect(historyActivityKey(row({ activityDetails: { referenceId: VOW } }))).toBe('vow of the disciple')

    const clears = summarizeWeekClears({
      activities,
      rows: [dated, byHash, failed].filter((entry): entry is NonNullable<typeof entry> => Boolean(entry)),
      reachedReset: true,
    })
    expect(clears['raid:vow of the disciple']?.state).toBe('cleared')
    expect(clears['raid:last wish']?.state).toBe('not_cleared')
    expect(clears['dungeon:prophecy']?.state).toBe('not_cleared')
  })

  it('does not call a missing clear final when history stopped early or a hash could not be named', () => {
    const unknownName = interpretHistoryRow(
      row({
        period: '2026-11-05T02:00:00Z',
        activityDetails: { referenceId: 123456, completionReason: 0 },
      }),
      RESET_MS,
      null
    )
    expect(unknownName?.unresolved).toBe(true)
    const truncated = summarizeWeekClears({
      activities,
      rows: [],
      reachedReset: false,
    })
    expect(truncated['raid:last wish']?.state).toBe('unknown')
    const unresolved = summarizeWeekClears({
      activities,
      rows: unknownName ? [unknownName] : [],
      reachedReset: true,
    })
    expect(unresolved['dungeon:prophecy']?.state).toBe('unknown')
    expect(unresolved['raid:vow of the disciple']?.state).toBe('unknown')
  })

  it('stops paging once a row is older than reset and treats a short page as complete', async () => {
    const pages = [
      {
        activities: [
          row({ period: '2026-11-06T00:00:00Z', activityDetails: { referenceId: VOW, completionReason: 0 } }),
          row({ period: '2026-10-01T00:00:00Z', activityDetails: { referenceId: 1, completionReason: 0 } }),
        ],
      },
      { activities: [row({ period: '2026-11-08T00:00:00Z', activityDetails: { completionReason: 0 } })] },
    ]
    let calls = 0
    const history = await readModeHistory(
      async (page) => {
        calls += 1
        return pages[page] ?? { activities: [] }
      },
      { resetAtMs: RESET_MS, pageSize: 2 }
    )
    expect(calls).toBe(1)
    expect(history.reachedReset).toBe(true)
    expect(history.activities).toHaveLength(1)

    const empty = await readModeHistory(async () => ({ activities: [] }), { resetAtMs: RESET_MS })
    expect(empty.reachedReset).toBe(true)

    const failed = await readModeHistory(
      async () => {
        throw new Error('bungie down')
      },
      { resetAtMs: RESET_MS }
    )
    expect(failed.reachedReset).toBe(false)
  })

  it('asks for a link instead of inventing clears when the account has no token', async () => {
    const personal = await loadPersonalWeek({
      account: { bungieMembershipId: '1', destinyMembershipType: 3 },
      token: null,
      resetAt: RESET,
      activities,
      deps: {
        getCharacterIds: async () => ['c1'],
        fetchPage: async () => ({ activities: [] }),
        resolveName: async () => null,
      },
    })
    expect(personal.status).toBe('needs_link')
  })

  it('reports not yet only after both modes on the character reach reset', async () => {
    const personal = await loadPersonalWeek({
      account: {
        bungieMembershipId: '1',
        destinyMembershipType: 3,
        bungieDisplayName: 'Ada#1234',
      },
      token: 'token',
      resetAt: RESET,
      activities,
      deps: {
        getCharacterIds: async () => ['hunter'],
        fetchPage: async (_type, _id, _character, mode) => {
          if (mode === 4) {
            return {
              activities: [
                row({
                  period: '2026-11-04T20:00:00Z',
                  activityDetails: { referenceId: VOW, completionReason: 0 },
                }),
                row({ period: '2026-10-01T00:00:00Z', activityDetails: { completionReason: 0 } }),
              ],
            }
          }
          return { activities: [row({ period: '2026-10-01T00:00:00Z', activityDetails: { completionReason: 0 } })] }
        },
        resolveName: async () => null,
      },
    })
    expect(personal.status).toBe('ready')
    if (personal.status !== 'ready') return
    expect(personal.displayName).toBe('Ada#1234')
    expect(personal.clears['raid:vow of the disciple']?.state).toBe('cleared')
    expect(personal.clears['dungeon:prophecy']?.state).toBe('not_cleared')
    expect(personal.message).toContain('Checked raid and dungeon history')
  })

  it('builds a public payload that stays useful when nobody is signed in', () => {
    const state = getWeeklyResetState(new Date('2026-11-09T12:00:00.000Z'))
    const payload = buildWeekPayload(state, { status: 'signed_out', message: SIGNED_OUT_MESSAGE })
    expect(payload.activities).toHaveLength(4)
    expect(payload.personal.status).toBe('signed_out')
    expect(payload.note).toContain('checkpoint')
    expect(payload.sourceLabel.length).toBeGreaterThan(0)
    expect(payload.activities.every((activity) => activity.iconUrl?.startsWith('https://www.bungie.net'))).toBe(true)
  })
})
