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
import { buildPlayerProfileFromStored, emptyPlayerProfile } from '@/lib/destiny/profileBuilder'
import { guardianPointsForUser } from '@/lib/destiny/mvpVoting'
import {
  getReputationReviewsForUser,
  getRunsForUser,
  getSeasonData,
  getSeasonStandingForUser,
  getTrustReviewsForUser,
  loadAllMvpVotes,
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

  const [runs, reviews, trustReviews, seasonLeaderboardEntries, season, mvpVotes] = await Promise.all([
    scope === 'full' ? getRunsForUser(siteUserId) : Promise.resolve([]),
    scope === 'full' ? getReputationReviewsForUser(siteUserId) : Promise.resolve([]),
    getTrustReviewsForUser(siteUserId, stored?.bungieMembershipId),
    scope === 'full' ? getSeasonStandingForUser(siteUserId) : Promise.resolve([]),
    getSeasonData(),
    loadAllMvpVotes(),
  ])

  const guardianPoints = guardianPointsForUser(siteUserId, mvpVotes, 'monthly', season)

  const profile = syncProfileWithActiveCharacter(
    buildPlayerProfileFromStored(stored, runs, {
      loadout,
      reviews,
      trustReviews,
      seasonLeaderboardEntries,
      displayEmblem,
      characters,
      guardianPoints,
    })
  )

  return {
    profile: await enrichProfile(profile, scope),
    bungieLinked: true,
  }
}
