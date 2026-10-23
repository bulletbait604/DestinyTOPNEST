import { getAllClanMembersWithPresence, searchClanByName, getGroupsForMember } from '@/lib/destiny/bungieClient'
import type { StoredDestinyUser } from '@/lib/destiny/destinyUserStore'
import { destinyApiKey } from '@/lib/destiny/env'
import type { DestinyPlatform } from '@/lib/destiny/types'

export const KICK_GUARDIANS_CLAN = 'Kick Guardians'

const ROSTER_TTL_MS = 10 * 60 * 1000

let rosterCache: { at: number; ids: Set<string>; clanId?: string } | null = null

export function isKickGuardiansClan(name?: string | null): boolean {
  return (name ?? '').trim().toLowerCase() === KICK_GUARDIANS_CLAN.toLowerCase()
}

/** Site key for a Guardian who has not signed in. */
export function bungieBoardKey(membershipId: string): string {
  return `bungie:${membershipId.trim()}`
}

/** A run owner record for a Kick Guardians member who has not signed in. */
export function kickOwnerRecord(input: {
  membershipId: string
  displayName: string
  membershipType?: number
  clanId?: string
  clanTag?: string
}): StoredDestinyUser {
  const membershipId = input.membershipId.trim()
  return {
    userId: bungieBoardKey(membershipId),
    bungieMembershipId: membershipId,
    bungieDisplayName: input.displayName.trim() || membershipId,
    platform: platformFromType(input.membershipType),
    destinyMembershipType: input.membershipType || 3,
    clanId: input.clanId,
    clanName: KICK_GUARDIANS_CLAN,
    clanTag: input.clanTag,
  }
}

function platformFromType(membershipType?: number): DestinyPlatform {
  if (membershipType === 1) return 'xbox'
  if (membershipType === 2) return 'playstation'
  if (membershipType === 6) return 'epic'
  return 'steam'
}

/**
 * Membership ids in Kick Guardians, from GroupV2 name search plus GetMembersOfGroup.
 * Empty when the Bungie API key is missing or the clan cannot be loaded.
 */
export async function loadKickGuardianMembershipIds(): Promise<Set<string>> {
  if (!destinyApiKey()) return new Set()
  if (rosterCache && Date.now() - rosterCache.at < ROSTER_TTL_MS) return rosterCache.ids
  try {
    const found = await searchClanByName(KICK_GUARDIANS_CLAN)
    const clanId = found.detail?.groupId != null ? String(found.detail.groupId) : ''
    const name = found.detail?.name ?? ''
    if (!clanId || !isKickGuardiansClan(name)) {
      return rosterCache?.ids ?? new Set()
    }
    const members = await getAllClanMembersWithPresence(clanId)
    const ids = new Set<string>()
    for (const member of members) {
      const info = member.destinyUserInfo ?? member.bungieNetUserInfo
      if (info?.membershipId != null) ids.add(String(info.membershipId))
    }
    rosterCache = { at: Date.now(), ids, clanId }
    return ids
  } catch (error) {
    console.warn('[kick] Kick Guardians roster unavailable', error)
    return rosterCache?.ids ?? new Set()
  }
}

/**
 * Build a scoring owner for a Kick Guardians member who has no TopNest account.
 * Returns null for anyone outside that clan.
 */
export async function resolveUnregisteredKickOwner(input: {
  membershipId: string
  displayName?: string
  membershipType?: number
}): Promise<StoredDestinyUser | null> {
  const membershipId = input.membershipId.trim()
  if (!/^\d{1,22}$/.test(membershipId) || !destinyApiKey()) return null
  try {
    const roster = await loadKickGuardianMembershipIds()
    if (roster.has(membershipId)) {
      return kickOwnerRecord({
        membershipId,
        displayName: input.displayName || membershipId,
        membershipType: input.membershipType,
        clanId: rosterCache?.clanId,
      })
    }
    const groups = await getGroupsForMember(input.membershipType || 3, membershipId)
    const clan = (groups.results ?? []).find((row) => isKickGuardiansClan(row.group?.name))
    if (!clan?.group?.groupId) return null
    return kickOwnerRecord({
      membershipId,
      displayName: input.displayName || membershipId,
      membershipType: input.membershipType,
      clanId: String(clan.group.groupId),
      clanTag: clan.group.clanInfo?.clanCallsign,
    })
  } catch (error) {
    console.warn('[kick] membership check failed', error)
    return null
  }
}
