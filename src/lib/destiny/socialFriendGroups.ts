import {
  getAvailableClanFireteams,
  getClanFireteam,
  membershipTypeToFireteamPlatform,
  type BungieFireteamMemberRow,
  type BungieFireteamSummaryRow,
} from '@/lib/destiny/bungieClient'
import { buildBungieIconUrl } from '@/lib/destiny/bungieUrls'
import { getDestinyUsersBySiteUserIds } from '@/lib/destiny/destinyUserStore'
import { flierTeamRoomMembers, listOpenLobbies } from '@/lib/destiny/fireteamLobbyService'
import type { OnlineSocialMember, SocialFriendGroup } from '@/lib/destiny/types'

function formatBungieName(globalName?: string, code?: number, fallback?: string): string {
  if (globalName && code != null) {
    return `${globalName}#${String(code).padStart(4, '0')}`
  }
  return fallback ?? 'Guardian'
}

function socialLookup(members: OnlineSocialMember[]): Map<string, OnlineSocialMember> {
  const map = new Map<string, OnlineSocialMember>()
  for (const member of members) {
    map.set(member.membershipId, member)
  }
  return map
}

function memberFromBungieRow(
  row: BungieFireteamMemberRow,
  lookup: Map<string, OnlineSocialMember>
): OnlineSocialMember | null {
  const info = row.destinyUserInfo
  if (!info?.membershipId) return null
  const membershipId = String(info.membershipId)
  const known = lookup.get(membershipId)
  if (!known) return null
  return {
    ...known,
    displayName: info.displayName ?? known.displayName,
    bungieName: formatBungieName(
      info.bungieGlobalDisplayName,
      info.bungieGlobalDisplayNameCode,
      known.bungieName ?? known.displayName
    ),
    membershipType: info.membershipType ?? known.membershipType,
    emblemUrl: buildBungieIconUrl(info.iconPath) ?? known.emblemUrl,
  }
}

function filledSlots(summary: BungieFireteamSummaryRow): number {
  const total = summary.playerSlotCount ?? 0
  const open = summary.availablePlayerSlotCount ?? total
  return Math.max(0, total - open)
}

async function groupsFromTopNestLobbies(
  onlineClanMembers: OnlineSocialMember[],
  onlineFriends: OnlineSocialMember[]
): Promise<SocialFriendGroup[]> {
  const lookup = socialLookup([...onlineClanMembers, ...onlineFriends])
  if (lookup.size < 2) return []

  const lobbies = await listOpenLobbies()
  if (!lobbies.length) return []

  const hostIds = lobbies.map((lobby) => lobby.hostUserId)
  const hostsBySiteId = await getDestinyUsersBySiteUserIds(hostIds)
  const groups: SocialFriendGroup[] = []
  const usedMemberIds = new Set<string>()

  for (const lobby of lobbies) {
    const roster = flierTeamRoomMembers(lobby)
    const matched: OnlineSocialMember[] = []

    for (const person of roster) {
      let membershipId = person.bungieMembershipId
      if (!membershipId && person.userId === lobby.hostUserId) {
        membershipId = hostsBySiteId.get(lobby.hostUserId.toLowerCase())?.bungieMembershipId
      }
      if (!membershipId) continue
      const social = lookup.get(String(membershipId))
      if (social) matched.push(social)
    }

    const unique = Array.from(new Map(matched.map((m) => [m.membershipId, m])).values())
    if (unique.length < 2) continue

    const label = lobby.encounterName
      ? `${lobby.activityName} · ${lobby.encounterName}`
      : lobby.activityName

    groups.push({
      id: `topnest-${lobby.id}`,
      label: `FlierTeam · ${label}`,
      source: 'topnest_lobby',
      activityName: label,
      members: unique,
    })
    unique.forEach((m) => usedMemberIds.add(m.membershipId))
  }

  return groups
}

async function groupsFromBungieFireteams(
  clanId: string,
  platform: number,
  accessToken: string,
  onlineClanMembers: OnlineSocialMember[],
  onlineFriends: OnlineSocialMember[]
): Promise<SocialFriendGroup[]> {
  const lookup = socialLookup([...onlineClanMembers, ...onlineFriends])
  if (lookup.size < 2) return []

  const listing = await getAvailableClanFireteams(clanId, platform, accessToken, 0).catch(() => ({
    results: [] as BungieFireteamSummaryRow[],
  }))

  const candidates = (listing.results ?? [])
    .filter((row) => {
      const id = row.fireteamId
      if (id == null) return false
      if (filledSlots(row) < 2) return false
      const ownerId = row.ownerMembershipId != null ? String(row.ownerMembershipId) : ''
      return ownerId ? lookup.has(ownerId) || filledSlots(row) >= 2 : filledSlots(row) >= 2
    })
    .slice(0, 8)

  const groups: SocialFriendGroup[] = []

  for (const summary of candidates) {
    const fireteamId = summary.fireteamId
    if (fireteamId == null) continue

    const detail = await getClanFireteam(clanId, String(fireteamId), accessToken).catch(() => null)
    if (!detail) continue

    const matched = [...(detail.members ?? []), ...(detail.alternates ?? [])]
      .map((row) => memberFromBungieRow(row, lookup))
      .filter((row): row is OnlineSocialMember => row != null)

    const ownerId =
      summary.ownerMembershipId != null ? String(summary.ownerMembershipId) : undefined
    if (ownerId && lookup.has(ownerId) && !matched.some((m) => m.membershipId === ownerId)) {
      matched.unshift(lookup.get(ownerId)!)
    }

    const unique = Array.from(new Map(matched.map((m) => [m.membershipId, m])).values())
    if (unique.length < 2) continue

    const title = (detail.summary?.title ?? summary.title)?.trim()
    groups.push({
      id: `bungie-${fireteamId}`,
      label: title ? `Bungie fireteam · ${title}` : 'Bungie fireteam',
      source: 'bungie_fireteam',
      activityName: title || undefined,
      members: unique,
    })
  }

  return groups
}

function groupsFromClanFriends(
  onlineClanMembers: OnlineSocialMember[],
  onlineFriends: OnlineSocialMember[],
  usedMemberIds: Set<string>
): SocialFriendGroup[] {
  const friendIds = new Set(onlineFriends.map((f) => f.membershipId))
  const together = onlineClanMembers.filter(
    (member) => friendIds.has(member.membershipId) && !usedMemberIds.has(member.membershipId)
  )

  if (together.length < 2) return []

  return [
    {
      id: 'clan-friends-online',
      label: 'Clan friends online',
      source: 'clan_friends',
      members: together,
    },
  ]
}

export async function buildSocialFriendGroups(input: {
  clanId?: string
  destinyMembershipType?: number
  accessToken?: string | null
  onlineClanMembers: OnlineSocialMember[]
  onlineFriends: OnlineSocialMember[]
}): Promise<SocialFriendGroup[]> {
  const { onlineClanMembers, onlineFriends, clanId, destinyMembershipType, accessToken } = input
  if (onlineClanMembers.length + onlineFriends.length < 2) return []

  const [topNestGroups, bungieGroups] = await Promise.all([
    groupsFromTopNestLobbies(onlineClanMembers, onlineFriends).catch(() => []),
    clanId && accessToken && destinyMembershipType != null
      ? groupsFromBungieFireteams(
          clanId,
          membershipTypeToFireteamPlatform(destinyMembershipType),
          accessToken,
          onlineClanMembers,
          onlineFriends
        ).catch(() => [])
      : Promise.resolve([]),
  ])

  const usedMemberIds = new Set<string>()
  for (const group of [...topNestGroups, ...bungieGroups]) {
    for (const member of group.members) {
      usedMemberIds.add(member.membershipId)
    }
  }

  const clanFriendGroups = groupsFromClanFriends(onlineClanMembers, onlineFriends, usedMemberIds)

  const merged = [...topNestGroups, ...bungieGroups, ...clanFriendGroups]
  merged.sort((a, b) => b.members.length - a.members.length)
  return merged
}
