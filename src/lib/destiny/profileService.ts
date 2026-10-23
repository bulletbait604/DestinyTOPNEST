import { resolveActiveCharacterId, syncProfileWithActiveCharacter } from '@/lib/destiny/activeCharacter'
import { enrichProfile } from '@/lib/destiny/enrich'
import { resolveDisplayEmblem } from '@/lib/destiny/guardianEmblems'
import { fetchAllCharactersPresentation } from '@/lib/destiny/guardianPresentation'
import {
  getDestinyUserBySiteUserId,
  getValidAccessToken,
  upsertDestinyUser,
  type StoredDestinyUser,
} from '@/lib/destiny/destinyUserStore'
import { fetchLiveClan, fetchLiveLoadout, refreshGuardianFromBungie } from '@/lib/destiny/liveBungieData'
import { NON_MONETARY_REWARD_SUMMARY } from '@/lib/destiny/featureFlags'
import { resolvePrizesEnabled } from '@/lib/destiny/siteContent'
import { loadFireteamProgress } from '@/lib/destiny/fireteamProgressService'
import { buildPlayerProfileFromStored, emptyPlayerProfile } from '@/lib/destiny/profileBuilder'
import { claimPendingPlayer } from '@/lib/destiny/pendingPlayers'
import {
  countReceivedVotes,
  getReputationReviewsForUser,
  getRunsForUser,
  getSeasonStandingForUser,
  getTrustReviewsForUser,
} from '@/lib/destiny/store'
import type { PlayerProfile } from '@/lib/destiny/types'

async function fetchProfileCharacters(stored: StoredDestinyUser | null) {
  if (!stored?.oauth) return undefined
  const accessToken = await getValidAccessToken(stored)
  const membershipType = stored.destinyMembershipType
  const membershipId = stored.bungieMembershipId
  if (!accessToken || !membershipType || !membershipId) return undefined

  try {
    return await fetchAllCharactersPresentation(membershipType, membershipId, accessToken)
  } catch {
    return undefined
  }
}

/** Build the same profile payload the Guardian tab uses (summary or full). */
export async function buildUserProfile(
  siteUserId: string,
  scope: 'summary' | 'full',
  requestedCharacterId?: string | null
): Promise<{ profile: PlayerProfile; bungieLinked: boolean }> {
  let stored = await getDestinyUserBySiteUserId(siteUserId)

  if (!stored?.oauth) {
    return {
      profile: await enrichProfile(emptyPlayerProfile(siteUserId), scope),
      bungieLinked: false,
    }
  }

  stored = await refreshGuardianFromBungie(stored)
  await fetchLiveClan(stored).catch(() => null)
  stored = (await getDestinyUserBySiteUserId(siteUserId)) ?? stored

  const characters = (await fetchProfileCharacters(stored)) ?? []
  const activeCharacterId = resolveActiveCharacterId(
    requestedCharacterId ?? stored.activeCharacterId,
    characters
  )

  if (activeCharacterId && activeCharacterId !== stored.activeCharacterId) {
    stored = await upsertDestinyUser(siteUserId, { activeCharacterId })
  }

  const displayEmblem = await resolveDisplayEmblem(stored)

  let loadout = undefined
  if (scope === 'full' && activeCharacterId) {
    loadout = (await fetchLiveLoadout(stored, activeCharacterId).catch(() => null)) ?? undefined
  }

  const [runs, reviews, trustReviews, seasonLeaderboardEntries] = await Promise.all([
    getRunsForUser(siteUserId, 200),
    scope === 'full' ? getReputationReviewsForUser(siteUserId) : Promise.resolve([]),
    getTrustReviewsForUser(siteUserId, stored?.bungieMembershipId),
    scope === 'full' ? getSeasonStandingForUser(siteUserId) : Promise.resolve([]),
  ])

  let passport = undefined
  let weeklyContracts = undefined
  let progressSherpa = undefined
  let progressClanWars = undefined
  let progressNightOps = undefined
  let progressChemistry = undefined
  if (scope === 'full') {
    try {
      const progress = await loadFireteamProgress(stored)
      passport = progress.passport
      weeklyContracts = progress.weeklyContracts
      progressSherpa = progress.sherpa
      progressClanWars = progress.clanWars
      progressNightOps = progress.nightOps
      progressChemistry = progress.chemistry
    } catch (err) {
      console.warn('[profile] fireteam progress failed', err)
    }
  }

  if (stored.bungieMembershipId) {
    await claimPendingPlayer(stored.bungieMembershipId, siteUserId).catch((err) => {
      console.warn('[profile] MVP credit attach failed', err)
    })
  }
  const [mvpVotesReceived, kudosReceived] = await Promise.all([
    countReceivedVotes(siteUserId, stored.bungieMembershipId, 'mvp'),
    countReceivedVotes(siteUserId, stored.bungieMembershipId, 'kudos'),
  ])

  const built = syncProfileWithActiveCharacter(
    buildPlayerProfileFromStored(stored, runs, {
      loadout,
      reviews,
      trustReviews,
      seasonLeaderboardEntries,
      displayEmblem,
      characters,
    })
  )
  built.mvpVotesReceived = mvpVotesReceived
  built.kudosReceived = kudosReceived
  const earnedTitles = passport?.titles.filter((title) => title.earned).map((title) => title.title) ?? []
  const sherpaTitle = progressSherpa && progressSherpa.title !== 'Unranked' ? [progressSherpa.title] : []
  const profile = {
    ...built,
    passport,
    weeklyContracts,
    sherpa: progressSherpa,
    clanWars: progressClanWars,
    nightOps: progressNightOps,
    chemistry: progressChemistry,
    badges: Array.from(
      new Set([...built.badges, ...earnedTitles, ...sherpaTitle, ...(progressNightOps?.badges ?? [])])
    ),
    prizeEligibility: (await resolvePrizesEnabled()) ? built.prizeEligibility : NON_MONETARY_REWARD_SUMMARY,
  }

  return {
    profile: await enrichProfile(profile, scope),
    bungieLinked: true,
  }
}
