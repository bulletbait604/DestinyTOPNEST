import { OWNER_USERNAMES, type Role } from '@/lib/home/roles'

export function normalizeKickUsername(username: string): string {
  return username.replace(/^@/, '').toLowerCase().trim()
}

/** Bungie global name (Name#1234) or legacy handle → comparable owner key. */
export function normalizeOwnerHandle(value: string): string {
  const normalized = normalizeKickUsername(value)
  const hashIdx = normalized.indexOf('#')
  if (hashIdx > 0) return normalized.slice(0, hashIdx)
  return normalized
}

export function isSiteOwner(username: string | null | undefined): boolean {
  if (!username) return false
  const normalized = normalizeKickUsername(username)
  return OWNER_USERNAMES.some((o) => normalizeKickUsername(o) === normalized)
}

export function capOwnerRole(username: string, role: Role): Role {
  if (role === 'owner' && !isSiteOwner(username)) {
    return 'admin'
  }
  return role
}
