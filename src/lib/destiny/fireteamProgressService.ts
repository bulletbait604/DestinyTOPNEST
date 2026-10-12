import type { StoredDestinyUser } from '@/lib/destiny/destinyUserStore'
import { evaluateClanWars } from '@/lib/destiny/clanWars'
import { evaluateFireteamChemistry } from '@/lib/destiny/fireteamChemistry'
import { evaluateNightOps } from '@/lib/destiny/nightOps'
import { evaluatePassport, type FireteamViewer } from '@/lib/destiny/passport'
import { evaluateSherpaRanks } from '@/lib/destiny/sherpaRanks'
import { getConfiguredActiveSeason } from '@/lib/destiny/seasonConfig'
import {
  getRunsForParticipant,
  listVerifiedFullClears,
  listVerifiedRunsForMembers,
  loadAllMvpVotes,
  loadUsersMap,
} from '@/lib/destiny/store'
import type {
  ChemistryBoard,
  ClanWarsBoard,
  NightOpsBoard,
  PassportProfile,
  RunRecord,
  SherpaBoard,
  WeeklyContractsSnapshot,
} from '@/lib/destiny/types'
import { evaluateWeeklyContracts } from '@/lib/destiny/weeklyContracts'

const VIEWER_RUN_LIMIT = 2000
const CLEAR_HISTORY_LIMIT = 5000

export interface FireteamProgress {
  passport: PassportProfile
  weeklyContracts: WeeklyContractsSnapshot
  sherpa: SherpaBoard
  clanWars: ClanWarsBoard
  nightOps: NightOpsBoard
  chemistry: ChemistryBoard
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

function membershipToUserId(users: Map<string, StoredDestinyUser>): Map<string, string> {
  const map = new Map<string, string>()
  for (const user of Array.from(users.values())) {
    if (user.bungieMembershipId && user.userId) map.set(user.bungieMembershipId, user.userId)
  }
  return map
}

/** Passport, contracts, sherpa, clan wars, night ops, and chemistry. Read-only. */
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

  const [corpus, globalClears, votes, users] = await Promise.all([
    listVerifiedRunsForMembers(Array.from(teammateIds), CLEAR_HISTORY_LIMIT),
    listVerifiedFullClears(CLEAR_HISTORY_LIMIT),
    loadAllMvpVotes().catch(() => []),
    loadUsersMap().catch(() => new Map<string, StoredDestinyUser>()),
  ])
  const runs = unionRuns([viewerResult, corpus.runs, globalClears.runs])
  const season = getConfiguredActiveSeason(now)
  const seasonWindow = { startDate: season.startDate, endDate: season.endDate }
  const historyComplete = globalClears.complete && corpus.complete

  return {
    passport: evaluatePassport(runs, viewer),
    weeklyContracts: evaluateWeeklyContracts({
      runs,
      viewer,
      now,
      season: seasonWindow,
      viewerHistoryComplete,
      clearHistoryComplete: corpus.complete,
    }),
    sherpa: evaluateSherpaRanks({
      runs,
      votes,
      membershipToUserId: membershipToUserId(users),
      season: seasonWindow,
      viewerMembershipId: stored.bungieMembershipId,
      historyComplete,
    }),
    clanWars: evaluateClanWars({
      runs,
      season: seasonWindow,
      now,
      viewerClanId: stored.clanId,
      historyComplete: globalClears.complete,
    }),
    nightOps: evaluateNightOps({ runs: viewerResult, viewer, now }),
    chemistry: evaluateFireteamChemistry(viewerResult, viewer),
  }
}
