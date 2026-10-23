import { listOauthDestinyUsers } from '@/lib/destiny/destinyUserStore'
import { destinyApiConfigured } from '@/lib/destiny/env'
import { loadKickGuardianMembershipIds, resolveUnregisteredKickOwner } from '@/lib/destiny/kickGuardians'
import { syncRunsForUser } from '@/lib/destiny/runIngestion'
import { HISTORY_PAGE_SIZE, PREVIOUS_HISTORY_PAGES, RECENT_HISTORY_PAGES } from '@/lib/destiny/runLookup'

const COOLDOWN_MS = 15 * 60 * 1000

let lastStartedAt = 0
let inFlight: Promise<{ users: number; kick: number; imported: number }> | null = null

export function resetScoringHistoryBackfillForTests(): void {
  lastStartedAt = 0
  inFlight = null
}

/**
 * Pull the last several raid and dungeon history pages for linked players and
 * Kick Guardians, and store them with `scoredInActiveSeason` so they stay on
 * the scoring list. No-ops when the Bungie API key is missing.
 */
export async function backfillRegisteredAndKickHistory(
  limit = 6
): Promise<{ users: number; kick: number; imported: number }> {
  if (!destinyApiConfigured()) return { users: 0, kick: 0, imported: 0 }

  const users = await listOauthDestinyUsers(limit)
  const seen = new Set(users.map((user) => user.bungieMembershipId).filter(Boolean))
  let imported = 0
  for (const user of users) {
    try {
      const result = await syncRunsForUser(user, {
        pages: RECENT_HISTORY_PAGES,
        countPerPage: HISTORY_PAGE_SIZE,
      })
      imported += result.imported
    } catch (error) {
      console.warn('[history] user backfill failed', user.userId, error)
    }
  }

  const roster = await loadKickGuardianMembershipIds()
  let kick = 0
  for (const membershipId of Array.from(roster)) {
    if (kick >= limit || seen.has(membershipId)) continue
    const owner = await resolveUnregisteredKickOwner({ membershipId })
    if (!owner) continue
    kick += 1
    seen.add(membershipId)
    try {
      const result = await syncRunsForUser(owner, {
        pages: RECENT_HISTORY_PAGES,
        countPerPage: HISTORY_PAGE_SIZE,
      })
      imported += result.imported
    } catch (error) {
      console.warn('[history] Kick Guardians backfill failed', membershipId, error)
    }
  }

  return { users: users.length, kick, imported }
}

/** Deeper page count used by Lookup & Score Previous Runs. */
export function previousHistoryPages(): number {
  return PREVIOUS_HISTORY_PAGES
}

/** Start one backfill if the API is configured and another is not already running. */
export function scheduleScoringHistoryBackfill(): void {
  if (!destinyApiConfigured()) return
  if (inFlight) return
  if (Date.now() - lastStartedAt < COOLDOWN_MS) return
  lastStartedAt = Date.now()
  inFlight = backfillRegisteredAndKickHistory().finally(() => {
    inFlight = null
  })
}
