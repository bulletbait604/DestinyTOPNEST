import type { ClanMemberPresenceRow } from '@/lib/destiny/bungieClient'
import { buildBungieIconUrl } from '@/lib/destiny/bungieUrls'
import type { ClanProfile } from '@/lib/destiny/types'

export type ClanRosterMember = ClanProfile['topMembers'][number]

function formatBungieName(globalName?: string, code?: number, fallback?: string): string {
  if (globalName && code != null) {
    return `${globalName}#${String(code).padStart(4, '0')}`
  }
  return fallback ?? 'Guardian'
}

export function mapClanMemberRowToRosterEntry(member: ClanMemberPresenceRow): ClanRosterMember | null {
  const destiny = member.destinyUserInfo
  const bungie = member.bungieNetUserInfo
  const membershipId = destiny?.membershipId ?? bungie?.membershipId
  if (membershipId == null) return null

  const displayName =
    destiny?.LastSeenDisplayName ??
    destiny?.displayName ??
    bungie?.displayName ??
    'Member'

  const iconPath = destiny?.iconPath ?? bungie?.iconPath

  return {
    membershipId: String(membershipId),
    displayName,
    bungieName: formatBungieName(
      destiny?.bungieGlobalDisplayName ?? bungie?.bungieGlobalDisplayName,
      destiny?.bungieGlobalDisplayNameCode ?? bungie?.bungieGlobalDisplayNameCode,
      displayName
    ),
    points: 0,
    emblemUrl: buildBungieIconUrl(iconPath),
    isOnline: Boolean(member.isOnline),
  }
}

export function buildClanRosterFromMemberRows(rows: ClanMemberPresenceRow[]): ClanRosterMember[] {
  const byId = new Map<string, ClanRosterMember>()
  for (const row of rows) {
    const entry = mapClanMemberRowToRosterEntry(row)
    if (!entry) continue
    byId.set(entry.membershipId, entry)
  }

  return Array.from(byId.values()).sort((a, b) =>
    (a.bungieName ?? a.displayName).localeCompare(b.bungieName ?? b.displayName)
  )
}
