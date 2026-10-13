import { buildLeaderboardWithAdjustments } from '@/lib/destiny/leaderboardAdjustments'
import type { LeaderboardCategory, LeaderboardEntry, MvpVote, RunRecord, Season, SeasonWinner } from '@/lib/destiny/types'
import type { StoredDestinyUser } from '@/lib/destiny/destinyUserStore'

function prizeForRank(
  category: SeasonWinner['category'],
  rank: number,
  rules: Season['prizeRules']
): string {
  const legacy = rules as Season['prizeRules'] & { fullClanTeam?: Season['prizeRules']['topGuardians'] }
  const bucket =
    category === 'new_bonds'
      ? (rules.newBonds ?? rules.raid)
      : category === 'raid' || category === 'pantheon'
      ? rules.raid
      : category === 'dungeon'
        ? rules.dungeon
        : rules.topGuardians ?? legacy.fullClanTeam!

  if (rank === 1) return bucket.first
  if (rank === 2) return bucket.second
  if (rank === 3) {
    if ('third' in bucket) return bucket.third
    if ('thirdToFifth' in bucket) return bucket.thirdToFifth
  }
  if (rank <= 5 && 'thirdToFifth' in bucket) return bucket.thirdToFifth
  return 'participation' in bucket ? bucket.participation : 'Season participant'
}

/** Live season standings → hall of fame preview (Phase 5). */
export async function computeSeasonStandings(
  runs: RunRecord[],
  usersById: Map<string, StoredDestinyUser>,
  season: Season,
  votes: MvpVote[] = []
): Promise<{
  hallOfFame: SeasonWinner[]
  eligibility: string
}> {
  // One Destiny 2 3D print per board — winner = rank #1 on Raid, Dungeon and New Bonds.
  const raidTop = (await buildLeaderboardWithAdjustments('raid', 'season', season, runs, usersById, votes)).slice(0, 3)
  const dungeonTop = (
    await buildLeaderboardWithAdjustments('dungeon', 'season', season, runs, usersById, votes)
  ).slice(0, 3)
  const bondsTop = (
    await buildLeaderboardWithAdjustments('new_bonds', 'season', season, runs, usersById, votes)
  ).slice(0, 3)

  const hallOfFame: SeasonWinner[] = [
    ...toWinners(raidTop, 'raid', season, 3),
    ...toWinners(dungeonTop, 'dungeon', season, 3),
    ...toWinners(bondsTop, 'new_bonds', season, 3),
  ]

  const storedWinners = season.winners ?? []
  const eligibility =
    raidTop.length || dungeonTop.length || bondsTop.length
      ? `Season ends ${new Date(season.endDate).toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles' })} PT. #1 on the Raid, Dungeon and New Bonds boards each win a Destiny 2 3D print after a 7-day verification window.`
      : 'Sync verified raid and dungeon clears — new fireteam members earn bonus New Bonds points.'

  return {
    hallOfFame: storedWinners.length ? storedWinners : hallOfFame,
    eligibility,
  }
}

function toWinners(
  entries: LeaderboardEntry[],
  category: SeasonWinner['category'],
  season: Season,
  maxRank: number
): SeasonWinner[] {
  return entries.slice(0, maxRank).map((entry) => ({
    category,
    rank: entry.rank,
    userId: entry.userId,
    displayName: entry.bungieDisplayName,
    clanTag: entry.clanTag,
    prize: prizeForRank(category, entry.rank, season.prizeRules),
    seasonId: season.id,
    emblemUrl: entry.emblemUrl,
  }))
}

export function prizeEligibilityForUser(
  entries: LeaderboardEntry[],
  verifiedClears: number
): string {
  if (!verifiedClears) {
    return 'Sync verified runs from Home to start scoring and prize eligibility.'
  }

  const best = entries.sort((a, b) => a.rank - b.rank)[0]
  if (!best) {
    return 'Eligible for verified run scoring this season. Vote MVP in Previous Activities to climb Top Guardians.'
  }

  return `Season rank #${best.rank} in ${best.category.replace(/_/g, ' ')} — ${best.points} pts. #1 at season end wins a prize (US/CA 3D print, UK Steam card).`
}

export interface UserPrizeTrackEntry {
  category: LeaderboardCategory
  rank: number
  points: number
  verifiedClears: number
  prizeIfHeld: string
  fastestActivityName?: string
  fastestClearSeconds?: number
}

/** Personal prize ladder for the signed-in player (Phase 5). */
export function buildUserPrizeTrack(
  entries: LeaderboardEntry[],
  season: Season
): UserPrizeTrackEntry[] {
  const byCategory = new Map<LeaderboardCategory, LeaderboardEntry>()
  for (const entry of entries) {
    const existing = byCategory.get(entry.category)
    if (!existing || entry.rank < existing.rank) {
      byCategory.set(entry.category, entry)
    }
  }

  return Array.from(byCategory.values())
    .sort((a, b) => a.rank - b.rank)
    .map((entry) => ({
      category: entry.category,
      rank: entry.rank,
      points: entry.points,
      verifiedClears: entry.verifiedClears,
      prizeIfHeld: prizeForRank(entry.category, entry.rank, season.prizeRules),
      fastestActivityName: entry.fastestActivityName,
      fastestClearSeconds: entry.fastestClearSeconds,
    }))
}
