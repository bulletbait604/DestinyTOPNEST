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

function selfMembershipIds(stored: StoredDestinyUser): Set<string> {
  const ids = new Set<string>()
  if (stored.bungieMembershipId) ids.add(String(stored.bungieMembershipId))
  if (stored.bungieNetMembershipId) ids.add(String(stored.bungieNetMembershipId))
  return ids
}

function isSelfMember(member: ClanMemberPresenceRow, selfIds: Set<string>): boolean {
  for (const info of [member.destinyUserInfo, member.bungieNetUserInfo]) {
    if (info?.membershipId != null && selfIds.has(String(info.membershipId))) {
      return true
    }
  }
  return false
}

function resolveClanMemberIdentity(member: ClanMemberPresenceRow) {
  const destiny = member.destinyUserInfo
  const bungie = member.bungieNetUserInfo
  const membershipId = destiny?.membershipId ?? bungie?.membershipId
  if (membershipId == null) return null

  const displayName =
    destiny?.LastSeenDisplayName ??
    destiny?.displayName ??
    bungie?.displayName ??
    'Clan member'

  const iconPath = destiny?.iconPath ?? bungie?.iconPath

  return {
    membershipId: String(membershipId),
    displayName,
    bungieName: formatBungieName(
      destiny?.bungieGlobalDisplayName ?? bungie?.bungieGlobalDisplayName,
      destiny?.bungieGlobalDisplayNameCode ?? bungie?.bungieGlobalDisplayNameCode,
      displayName
    ),
    membershipType: destiny?.membershipType,
    emblemUrl: buildBungieIconUrl(iconPath),
  }
}

function mapClanMember(
  member: ClanMemberPresenceRow,
  selfIds: Set<string>
): OnlineSocialMember | null {
  if (!member.isOnline) return null
  if (isSelfMember(member, selfIds)) return null

  const identity = resolveClanMemberIdentity(member)
  if (!identity) return null

  return {
    displayName: identity.displayName,
    bungieName: identity.bungieName,
    membershipId: identity.membershipId,
    membershipType: identity.membershipType,
    emblemUrl: identity.emblemUrl,
    isOnline: true,
    // Clan roster only reports Bungie.net online — activity enrichment may set inDestiny.
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

function mergeMember(existing: OnlineSocialMember, incoming: OnlineSocialMember): OnlineSocialMember {
  return {
    ...existing,
    ...incoming,
    emblemUrl: incoming.emblemUrl ?? existing.emblemUrl,
    membershipType: incoming.membershipType ?? existing.membershipType,
    inDestiny: existing.inDestiny || incoming.inDestiny,
    currentActivity: incoming.currentActivity ?? existing.currentActivity,
    bungieName: incoming.bungieName ?? existing.bungieName,
    displayName: incoming.displayName ?? existing.displayName,
  }
}

function dedupeMembers(members: OnlineSocialMember[]): OnlineSocialMember[] {
  const map = new Map<string, OnlineSocialMember>()
  for (const member of members) {
    const existing = map.get(member.membershipId)
    map.set(member.membershipId, existing ? mergeMember(existing, member) : member)
  }
  return Array.from(map.values())
}

function isFriendOnline(friend: BungieFriendRow): boolean {
  // 1 = online on Bungie.net; onlineTitle 2 = currently in Destiny 2.
  return friend.onlineStatus === 1 || friend.onlineTitle === 2
}

function mapFriend(friend: BungieFriendRow, selfIds: Set<string>): OnlineSocialMember | null {
  if (!isFriendOnline(friend)) return null

  const membershipId = String(
    friend.lastSeenAsMembershipId ?? friend.bungieNetUser?.membershipId ?? ''
  )
  if (!membershipId || selfIds.has(membershipId)) return null

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

  const selfIds = selfMembershipIds(stored)
  const clanId = stored.clanId

  const [friendsRes, clanMembersRes, activeLobby] = await Promise.all([
    getBungieFriends(accessToken).catch(() => ({ friends: [] as BungieFriendRow[] })),
    clanId
      ? getClanMembersWithPresence(clanId, accessToken).catch(() => ({
          results: [] as ClanMemberPresenceRow[],
        }))
      : Promise.resolve({ results: [] as ClanMemberPresenceRow[] }),
    getUserActiveLobby(stored.userId),
  ])

  const onlineFriends = sortOnlineMembers(
    dedupeMembers(
      (friendsRes.friends ?? [])
        .map((friend) => mapFriend(friend, selfIds))
        .filter((row): row is OnlineSocialMember => row != null)
    )
  )

  const onlineClanMembers = sortOnlineMembers(
    dedupeMembers(
      (clanMembersRes.results ?? [])
        .map((member) => mapClanMember(member, selfIds))
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
