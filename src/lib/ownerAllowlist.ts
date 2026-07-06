import { OWNER_USERNAMES } from '@/lib/home/roles'
import { isSiteOwner, normalizeKickUsername, normalizeOwnerHandle } from '@/lib/home/ownerIdentity'

function ownerAllowlist(): string[] {
  const envRaw = process.env.OWNER_USERNAMES || ''
  const envList = envRaw
    .split(',')
    .map((s) => normalizeOwnerHandle(s))
    .filter(Boolean)
  if (envList.length > 0) return envList
  return OWNER_USERNAMES.map((o) => normalizeOwnerHandle(o))
}

function matchesAllowlist(username: string, displayName?: string): boolean {
  const allowlist = ownerAllowlist()
  const candidates = [username, displayName]
    .filter((v): v is string => Boolean(v?.trim()))
    .flatMap((v) => [normalizeOwnerHandle(v), normalizeKickUsername(v)])

  return candidates.some((candidate) => allowlist.includes(normalizeOwnerHandle(candidate)))
}

/**
 * Server-side owner allowlist.
 * Matches site username or Bungie display name (e.g. Bulletbait604#0950).
 */
export function isAllowlistedOwner(username: string, displayName?: string): boolean {
  if (matchesAllowlist(username, displayName)) return true
  return isSiteOwner(username) || isSiteOwner(normalizeOwnerHandle(username))
}
