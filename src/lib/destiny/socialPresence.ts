import {
  getBungieFriends,
  getClanMembersWithPresence,
  getMyClanFireteams,
  membershipTypeToFireteamPlatform,
  type BungieFriendRow,
  type ClanMemberPresenceRow,
} from '@/lib/destiny/bungieClient'
import { buildBungieIconUrl } from '@/lib/destiny/bungieUrls'
import { getValidAccessToken, type StoredDestinyUser } from '@/lib/destiny/destinyUserStore'
import { getUserActiveLobby } from '@/lib/destiny/fireteamLobbyService'
import { enrichOnlineSocialLists } from '@/lib/destiny/socialActivityPresence'
import { buildSocialFriendGroups } from '@/lib/destiny/socialFriendGroups'
import type { OnlineSocialMember, SocialPresencePayload } from '@/lib/destiny/types'

const EMPTY: SocialPresencePayload = {
  onlineClanMembers: [],
  onlineFriends: [],
  activeLobby: null,
  bungieFireteamId: null,
  friendGroups: [],
}

function formatBungieName(
  globalName?: string,
  code?: number,
  fallback?: string
): string {
  if (globalName && code != null) {
    return `${globalName}#${String(code).padStart(4, '0')}`
  }
  return fallback ?? 'Guardian'
}

function mapClanMember(
  member: ClanMemberPresenceRow,
  selfMembershipId?: string
): OnlineSocialMember | null {
  if (!member.isOnline) return null

  const info = member.destinyUserInfo ?? member.bungieNetUserInfo
  if (!info?.membershipId) return null

  const membershipId = String(info.membershipId)
  if (selfMembershipId && membershipId === selfMembershipId) return null

  const displayName =
    member.destinyUserInfo?.LastSeenDisplayName ??
    info.displayName ??
    'Clan member'

  return {
    displayName,
    bungieName: formatBungieName(
      info.bungieGlobalDisplayName,
      info.bungieGlobalDisplayNameCode,
      displayName
    ),
    membershipId,
    membershipType: member.destinyUserInfo?.membershipType,
    emblemUrl: buildBungieIconUrl(info.iconPath),
    isOnline: true,
    // Clan roster only reports Bungie.net online — not active D2 session.
    inDestiny: false,
  }
}

function sortOnlineMembers(members: OnlineSocialMember[]): OnlineSocialMember[] {
  return [...members].sort((a, b) => {
    const aDestiny = a.inDestiny ? 0 : 1
    const bDestiny = b.inDestiny ? 0 : 1
    if (aDestiny !== bDestiny) return aDestiny - bDestiny
    return (a.bungieName ?? a.displayName).localeCompare(b.bungieName ?? b.displayName)
  })
}

function dedupeMembers(members: OnlineSocialMember[]): OnlineSocialMember[] {
  const map = new Map<string, OnlineSocialMember>()
  for (const member of members) {
    const existing = map.get(member.membershipId)
    if (!existing || (member.inDestiny && !existing.inDestiny)) {
      map.set(member.membershipId, member)
    }
  }
  return Array.from(map.values())
}

function mapFriend(friend: BungieFriendRow): OnlineSocialMember | null {
  if (friend.onlineStatus !== 1) return null

  const membershipId = friend.lastSeenAsMembershipId
    ? String(friend.lastSeenAsMembershipId)
    : friend.bungieNetUser?.membershipId
      ? String(friend.bungieNetUser.membershipId)
      : ''
  if (!membershipId) return null

  const displayName =
    friend.bungieNetUser?.displayName ??
    formatBungieName(friend.bungieGlobalDisplayName, friend.bungieGlobalDisplayNameCode)

  return {
    displayName,
    bungieName: formatBungieName(
      friend.bungieGlobalDisplayName,
      friend.bungieGlobalDisplayNameCode,
      displayName
    ),
    membershipId,
    membershipType: friend.lastSeenAsBungieMembershipType,
    isOnline: true,
    inDestiny: friend.onlineTitle === 2,
  }
}

export async function fetchSocialPresence(
  stored: StoredDestinyUser
): Promise<SocialPresencePayload> {
  const accessToken = await getValidAccessToken(stored)
  if (!accessToken) return EMPTY

  const selfId = stored.bungieMembershipId
  const clanId = stored.clanId

  const [friendsRes, clanMembersRes, activeLobby] = await Promise.all([
    getBungieFriends(accessToken).catch(() => ({ friends: [] as BungieFriendRow[] })),
    clanId
      ? getClanMembersWithPresence(clanId).catch(() => ({ results: [] as ClanMemberPresenceRow[] }))
      : Promise.resolve({ results: [] as ClanMemberPresenceRow[] }),
    getUserActiveLobby(stored.userId),
  ])

  const onlineFriends = sortOnlineMembers(
    dedupeMembers(
      (friendsRes.friends ?? [])
        .map(mapFriend)
        .filter((row): row is OnlineSocialMember => row != null)
    )
  )

  const onlineClanMembers = sortOnlineMembers(
    dedupeMembers(
      (clanMembersRes.results ?? [])
        .map((member) => mapClanMember(member, selfId))
        .filter((row): row is OnlineSocialMember => row != null)
    )
  )

  let bungieFireteamId: string | null = null
  if (clanId && stored.destinyMembershipType != null) {
    try {
      const platform = membershipTypeToFireteamPlatform(stored.destinyMembershipType)
      const myTeams = await getMyClanFireteams(clanId, platform, accessToken, false, 0)
      const open = myTeams.results?.find((team) => !team.isClosed)
      const id = open?.fireteamId ?? open?.id
      if (id != null) bungieFireteamId = String(id)
    } catch {
      bungieFireteamId = null
    }
  }

  const withActivity = await enrichOnlineSocialLists(
    onlineFriends,
    onlineClanMembers,
    accessToken
  ).catch(() => ({ onlineFriends, onlineClanMembers }))

  return {
    onlineClanMembers: withActivity.onlineClanMembers,
    onlineFriends: withActivity.onlineFriends,
    activeLobby,
    bungieFireteamId,
    friendGroups: await buildSocialFriendGroups({
      clanId,
      destinyMembershipType: stored.destinyMembershipType,
      accessToken,
      onlineClanMembers: withActivity.onlineClanMembers,
      onlineFriends: withActivity.onlineFriends,
    }).catch(() => []),
  }
}
