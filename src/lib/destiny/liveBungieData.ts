import {
  getClan,
  getClanMembersWithPresence,
  getGroupsForMember,
  type ClanMemberPresenceRow,
} from '@/lib/destiny/bungieClient'
import { buildBungieIconUrl } from '@/lib/destiny/bungieUrls'
import { fetchAllCharactersPresentation, fetchGuardianPresentation } from '@/lib/destiny/guardianPresentation'
import { resolveActiveCharacterId } from '@/lib/destiny/activeCharacter'
import { fetchGuardianBungieStats } from '@/lib/destiny/guardianBungieStats'
import { fetchCharacterBuild } from '@/lib/destiny/guardianBuild'
import { fetchSavedLoadouts } from '@/lib/destiny/guardianSavedLoadouts'
import { tagLoadoutCompleteness } from '@/lib/destiny/loadoutCompleteness'
import type { StoredDestinyUser } from '@/lib/destiny/destinyUserStore'
import { getValidAccessToken, upsertDestinyUser } from '@/lib/destiny/destinyUserStore'
import type {
  BuildSnapshot,
  ClanProfile,
  PlayerProfile,
} from '@/lib/destiny/types'

export async function refreshGuardianFromBungie(stored: StoredDestinyUser): Promise<StoredDestinyUser> {
  const accessToken = await getValidAccessToken(stored)
  const membershipType = stored.destinyMembershipType
  const membershipId = stored.bungieMembershipId
  if (!accessToken || !membershipType || !membershipId) return stored

  try {
    const allCharacters = await fetchAllCharactersPresentation(membershipType, membershipId, accessToken)
    const activeCharacterId = resolveActiveCharacterId(stored.activeCharacterId, allCharacters)

    const presentation = await fetchGuardianPresentation(
      membershipType,
      membershipId,
      accessToken,
      stored.bungieDisplayName,
      activeCharacterId
    )
    if (!presentation) return stored

    const bungieStats = await fetchGuardianBungieStats(
      membershipType,
      membershipId,
      accessToken,
      presentation.characterId
    ).catch(() => stored.bungieStats ?? null)

    const updated = await upsertDestinyUser(stored.userId, {
      emblemUrl: presentation.emblemUrl,
      emblemBackgroundUrl: presentation.emblemBackgroundUrl,
      emblemColor: presentation.emblemColor,
      characterThumbnailUrl: presentation.characterThumbnailUrl,
      activeCharacterId: presentation.characterId,
      guardianRank: presentation.guardianRank,
      powerLevel: presentation.powerLevel,
      characterClass: presentation.characterClass,
      bungieDisplayName: stored.bungieDisplayName || presentation.displayName,
      bungieStats: bungieStats ?? undefined,
    })
    return updated
  } catch {
    return stored
  }
}

export async function fetchLiveLoadout(
  stored: StoredDestinyUser,
  characterId?: string
): Promise<BuildSnapshot | null> {
  const accessToken = await getValidAccessToken(stored)
  const membershipType = stored.destinyMembershipType
  const membershipId = stored.bungieMembershipId
  if (!accessToken || !membershipType || !membershipId) return null

  const targetCharacterId = characterId ?? stored.activeCharacterId
  if (!targetCharacterId) return null

  try {
    const build = await fetchCharacterBuild(
      membershipType,
      membershipId,
      accessToken,
      stored.userId,
      targetCharacterId
    )
    if (!build) return null
    return tagLoadoutCompleteness({ ...build, loadoutSource: 'equipped' as const })
  } catch {
    return null
  }
}

export async function fetchSavedLoadoutsForCharacter(
  stored: StoredDestinyUser,
  characterId?: string
): Promise<BuildSnapshot[]> {
  const accessToken = await getValidAccessToken(stored)
  const membershipType = stored.destinyMembershipType
  const membershipId = stored.bungieMembershipId
  const targetCharacterId = characterId ?? stored.activeCharacterId
  if (!accessToken || !membershipType || !membershipId || !targetCharacterId) return []

  try {
    return await fetchSavedLoadouts(
      membershipType,
      membershipId,
      accessToken,
      targetCharacterId,
      stored.userId
    )
  } catch {
    return []
  }
}

const BUNGIE_NET_MEMBERSHIP_TYPE = 254

type DiscoveredClan = {
  clanId: string
  name?: string
  tag?: string
}

async function discoverClanForUser(
  stored: StoredDestinyUser,
  accessToken?: string
): Promise<DiscoveredClan | null> {
  const attempts: Array<[number, string]> = []
  if (stored.destinyMembershipType != null && stored.bungieMembershipId) {
    attempts.push([stored.destinyMembershipType, stored.bungieMembershipId])
  }
  if (stored.bungieNetMembershipId) {
    attempts.push([BUNGIE_NET_MEMBERSHIP_TYPE, stored.bungieNetMembershipId])
  }

  for (const [membershipType, membershipId] of attempts) {
    try {
      const groups = await getGroupsForMember(membershipType, membershipId, accessToken)
      const clanGroup =
        groups.results?.find((row) => row.group?.groupType === 1)?.group ??
        groups.results?.[0]?.group
      if (!clanGroup?.groupId) continue

      const tag = clanGroup.clanInfo?.clanCallsign
        ? `[${clanGroup.clanInfo.clanCallsign}]`
        : undefined

      return {
        clanId: String(clanGroup.groupId),
        name: clanGroup.name,
        tag,
      }
    } catch {
      /* try next membership identity */
    }
  }

  return null
}

export async function fetchLiveClan(stored: StoredDestinyUser): Promise<ClanProfile | null> {
  const membershipType = stored.destinyMembershipType
  const membershipId = stored.bungieMembershipId
  if (!membershipType || !membershipId) return null

  const accessToken = (await getValidAccessToken(stored).catch(() => null)) ?? undefined

  if (stored.clanId) {
    const cached = await fetchClanById(stored.clanId, stored, accessToken)
    if (cached) return cached
  }

  const discovered = await discoverClanForUser(stored, accessToken)
  if (!discovered) {
    if (stored.clanId) {
      await upsertDestinyUser(stored.userId, {
        clanId: '',
        clanName: '',
        clanTag: '',
      }).catch(() => null)
    }
    return null
  }

  await upsertDestinyUser(stored.userId, {
    clanId: discovered.clanId,
    clanName: discovered.name,
    clanTag: discovered.tag,
  })

  return fetchClanById(discovered.clanId, stored, accessToken)
}

async function fetchClanById(
  clanId: string,
  stored: StoredDestinyUser,
  accessToken?: string
): Promise<ClanProfile | null> {
  try {
    const clanData = (await getClan(clanId, accessToken)) as {
      detail?: {
        name?: string
        motto?: string
        memberCount?: number
        bannerPath?: string
        avatarPath?: string
        clanInfo?: {
          clanCallsign?: string
          clanBannerData?: { emblemPath?: string }
        }
      }
    }

    const detail = clanData.detail
    if (!detail?.name && !stored.clanName) return null

    let memberRows: ClanMemberPresenceRow[] = []
    try {
      const membersData = await getClanMembersWithPresence(clanId, accessToken)
      memberRows = membersData.results ?? []
    } catch {
      /* roster is optional — clan header should still load */
    }

    const tag = detail?.clanInfo?.clanCallsign
      ? `[${detail.clanInfo.clanCallsign}]`
      : stored.clanTag ?? ''
    const emblemPath =
      detail?.clanInfo?.clanBannerData?.emblemPath ??
      detail?.bannerPath ??
      detail?.avatarPath
    const emblemUrl = emblemPath ? buildBungieIconUrl(emblemPath) : undefined

    const topMembers = memberRows.map((m) => {
      const info = m.destinyUserInfo ?? m.bungieNetUserInfo
      return {
        displayName:
          m.destinyUserInfo?.LastSeenDisplayName ??
          info?.displayName ??
          'Member',
        points: 0,
        emblemUrl: buildBungieIconUrl(info?.iconPath),
        isOnline: Boolean(m.isOnline),
      }
    })

    return {
      id: clanId,
      name: detail?.name ?? stored.clanName ?? 'Clan',
      tag,
      emblemUrl,
      memberCount: detail?.memberCount ?? memberRows.length,
      points: 0,
      fullClanClears: 0,
      recruitmentOpen: false,
      avgRaidClearSeconds: 0,
      avgDungeonClearSeconds: 0,
      topMembers,
      onlineMembers: [],
      achievements: [],
    }
  } catch {
    return null
  }
}

export type { PlayerProfile }
