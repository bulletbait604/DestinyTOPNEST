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
import type { OnlineSocialMember, SocialPresencePayload } from '@/lib/destiny/types'

const EMPTY: SocialPresencePayload = {
  onlineClanMembers: [],
  onlineFriends: [],
  activeLobby: null,
  bungieFireteamId: null,
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
    inDestiny: true,
  }
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

  const onlineFriends = (friendsRes.friends ?? [])
    .map(mapFriend)
    .filter((row): row is OnlineSocialMember => row != null)
    .sort((a, b) => a.displayName.localeCompare(b.displayName))

  const onlineClanMembers = (clanMembersRes.results ?? [])
    .map((member) => mapClanMember(member, selfId))
    .filter((row): row is OnlineSocialMember => row != null)
    .sort((a, b) => a.displayName.localeCompare(b.displayName))

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

  return {
    onlineClanMembers,
    onlineFriends,
    activeLobby,
    bungieFireteamId,
  }
}
