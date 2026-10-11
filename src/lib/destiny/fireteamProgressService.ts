import type { StoredDestinyUser } from '@/lib/destiny/destinyUserStore'
import { evaluatePassport, type FireteamViewer } from '@/lib/destiny/passport'
import { getConfiguredActiveSeason } from '@/lib/destiny/seasonConfig'
import { getRunsForParticipant, listVerifiedRunsForMembers } from '@/lib/destiny/store'
import type { PassportProfile, RunRecord, WeeklyContractsSnapshot } from '@/lib/destiny/types'
import { evaluateWeeklyContracts } from '@/lib/destiny/weeklyContracts'

const VIEWER_RUN_LIMIT = 2000
const CLEAR_HISTORY_LIMIT = 5000

export interface FireteamProgress {
  passport: PassportProfile
  weeklyContracts: WeeklyContractsSnapshot
}

function viewerFromStored(stored: StoredDestinyUser): FireteamViewer {
  return {
    userId: stored.userId,
    membershipId: stored.bungieMembershipId,
    clanId: stored.clanId,
    displayName: stored.bungieDisplayName,
  }
}

function unionRuns(groups: RunRecord[][]): RunRecord[] {
  const byId = new Map<string, RunRecord>()
  for (const group of groups) {
    for (const run of group) byId.set(run.id, run)
  }
  return Array.from(byId.values())
}

/** Passport stamps and this week's contracts for a linked Guardian. Read-only. */
export async function loadFireteamProgress(stored: StoredDestinyUser, now = new Date()): Promise<FireteamProgress> {
  const viewer = viewerFromStored(stored)
  const viewerResult = await getRunsForParticipant(stored.userId, stored.bungieMembershipId, VIEWER_RUN_LIMIT)
  const viewerHistoryComplete = viewerResult.length < VIEWER_RUN_LIMIT

  const teammateIds = new Set<string>()
  if (stored.bungieMembershipId) teammateIds.add(stored.bungieMembershipId)
  for (const run of viewerResult) {
    for (const member of run.teamMembers) {
      if (member.membershipId) teammateIds.add(member.membershipId)
    }
  }

  const corpus = await listVerifiedRunsForMembers(Array.from(teammateIds), CLEAR_HISTORY_LIMIT)
  const runs = unionRuns([viewerResult, corpus.runs])
  const season = getConfiguredActiveSeason(now)

  return {
    passport: evaluatePassport(runs, viewer),
    weeklyContracts: evaluateWeeklyContracts({
      runs,
      viewer,
      now,
      season: { startDate: season.startDate, endDate: season.endDate },
      viewerHistoryComplete,
      clearHistoryComplete: corpus.complete,
    }),
  }
}
