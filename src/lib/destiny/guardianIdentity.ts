/** One Guardian is their Bungie membership, shown as Name#code. */

const GLOBAL_NAME = /^[^#\s][^#]{0,40}#\d{1,4}$/

export function isBungieGlobalName(value: string | undefined | null): boolean {
  return GLOBAL_NAME.test((value ?? '').trim())
}

function isBareId(value: string): boolean {
  const trimmed = value.trim()
  return /^\d{5,}$/.test(trimmed) || trimmed.startsWith('bungie:')
}

/** `Name#1234`. The code is four digits, matching Bungie Global Display Name. */
export function formatBungieGlobalName(
  name?: string | null,
  code?: number | string | null,
  fallback = ''
): string {
  const trimmed = (name ?? '').trim()
  if (trimmed && code != null && String(code).trim() !== '') {
    const digits = String(code).replace(/\D/g, '')
    if (digits) return `${trimmed}#${digits.padStart(4, '0').slice(-4)}`
  }
  if (isBungieGlobalName(trimmed)) return trimmed
  return (fallback || trimmed).trim()
}

/** Keep a Bungie global name ahead of a platform name, Kick name, or raw id. */
export function preferBungieGlobalName(current: string | undefined, next: string | undefined): string {
  const a = (current ?? '').trim()
  const b = (next ?? '').trim()
  if (!a) return b
  if (!b) return a
  const aGlobal = isBungieGlobalName(a)
  const bGlobal = isBungieGlobalName(b)
  if (bGlobal && !aGlobal) return b
  if (aGlobal && !bGlobal) return a
  if (isBareId(a) && !isBareId(b)) return b
  if (isBareId(b) && !isBareId(a)) return a
  return a
}

/**
 * Follow alias links to the cross-save primary membership.
 * A membership with no alias is already its own primary.
 */
export function primaryMembershipId(
  membershipId: string | undefined,
  aliases?: ReadonlyMap<string, string>
): string {
  const start = (membershipId ?? '').trim()
  if (!start) return ''
  const seen = new Set<string>()
  let current = start
  while (!seen.has(current)) {
    seen.add(current)
    const next = aliases?.get(current)?.trim()
    if (!next || next === current) return current
    current = next
  }
  return current
}

export function membershipAliasesFromUsers(
  users: Array<{ bungieMembershipId?: string; linkedMembershipIds?: string[] }>,
  extra?: ReadonlyMap<string, string>
): Map<string, string> {
  const map = new Map<string, string>()
  for (const user of users) {
    const primary = user.bungieMembershipId?.trim()
    if (!primary) continue
    map.set(primary, primary)
    for (const linked of user.linkedMembershipIds ?? []) {
      const id = linked.trim()
      if (id) map.set(id, primary)
    }
  }
  for (const [from, to] of Array.from(extra?.entries() ?? [])) {
    const source = from.trim()
    const target = to.trim()
    if (!source || !target || map.has(source)) continue
    map.set(source, target)
  }
  return map
}

/** membership id -> best Bungie global name known for that Guardian. */
export function globalNamesByMembership(
  rows: Array<{ membershipId?: string; name?: string }>,
  aliases?: ReadonlyMap<string, string>
): Map<string, string> {
  const names = new Map<string, string>()
  for (const row of rows) {
    const id = (row.membershipId ?? '').trim()
    const name = (row.name ?? '').trim()
    if (!id || !isBungieGlobalName(name)) continue
    const primary = primaryMembershipId(id, aliases)
    names.set(primary, preferBungieGlobalName(names.get(primary), name))
    if (primary !== id) names.set(id, preferBungieGlobalName(names.get(id), name))
  }
  return names
}

export function globalNameForMembership(
  membershipId: string | undefined,
  names: ReadonlyMap<string, string>,
  aliases?: ReadonlyMap<string, string>
): string | undefined {
  const id = (membershipId ?? '').trim()
  if (!id) return undefined
  const primary = primaryMembershipId(id, aliases)
  const name = names.get(primary) || names.get(id)
  return isBungieGlobalName(name) ? name : undefined
}
