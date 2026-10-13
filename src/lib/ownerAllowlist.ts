import { OWNER_USERNAMES, PRIMARY_OWNER_BUNGIE_NAME } from '@/lib/home/roles'

/**
 * Server-side owner allowlist.
 *
 * Owner access is granted ONLY by identifiers a player cannot choose:
 *  - OWNER_MEMBERSHIP_IDS (comma-separated Destiny/Bungie.net membership ids) — preferred
 *  - the legacy site username (assigned server-side, never user-editable)
 *  - the exact full Bungie global name including the #code (unique per Bungie account)
 *
 * Previously the #code was stripped, so any "Bulletbait604#xxxx" could become owner.
 */
function list(raw: string | undefined): string[] {
  return (raw || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
}

export function ownerMembershipIds(): string[] {
  return list(process.env.OWNER_MEMBERSHIP_IDS)
}

function ownerUsernames(): string[] {
  const env = list(process.env.OWNER_USERNAMES).filter((s) => !s.includes('#'))
  return env.length ? env : OWNER_USERNAMES.map((o) => o.toLowerCase())
}

function ownerFullBungieNames(): string[] {
  const env = list(process.env.OWNER_USERNAMES).filter((s) => /#\d{3,4}$/.test(s))
  return env.length ? env : [PRIMARY_OWNER_BUNGIE_NAME.toLowerCase()]
}

export function isAllowlistedOwner(
  username: string,
  displayName?: string,
  membershipId?: string
): boolean {
  const user = (username || '').trim().toLowerCase()
  const ids = ownerMembershipIds()
  if (ids.length > 0) {
    // Strict mode: membership id only (username equals membership id for new accounts).
    return Boolean((membershipId && ids.includes(membershipId.trim().toLowerCase())) || (user && ids.includes(user)))
  }
  if (user && ownerUsernames().includes(user)) return true
  const name = (displayName || '').trim().toLowerCase()
  return Boolean(name && ownerFullBungieNames().includes(name))
}
