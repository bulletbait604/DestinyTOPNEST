/**
 * Pick the right mod/perk icon when several catalog rows share a name,
 * and drop empty-socket placeholders from loadout previews.
 */

export interface GearIconCandidate {
  name: string
  hash?: number
  itemTypeDisplayName?: string | null
  iconUrl?: string | null
  isDeprecated?: boolean
}

const PLACEHOLDER_GEAR_NAME =
  /^(empty(?:\s+mod)?\s+socket|empty\s+socket|default(?:\s+ornament|\s+shader)?|hidden|locked|classified)$/i

export function isPlaceholderGearName(name?: string | null): boolean {
  const trimmed = name?.trim()
  if (!trimmed) return false
  return PLACEHOLDER_GEAR_NAME.test(trimmed)
}

/** Exact-name match. Base mods win over the enhanced variant unless the query says Enhanced. */
export function chooseGearMod<T extends GearIconCandidate>(query: string, rows: T[]): T | undefined {
  const q = query.trim().toLowerCase()
  if (!q || isPlaceholderGearName(query)) return undefined

  const wantsEnhanced = /\benhanced\b/i.test(query)
  const exact = rows.filter(
    (row) => row.name.trim().toLowerCase() === q && !isPlaceholderGearName(row.name)
  )
  if (!exact.length) return undefined

  const ranked = exact
    .map((row) => {
      const type = (row.itemTypeDisplayName ?? '').toLowerCase()
      const enhanced = type.includes('enhanced')
      const legacy = Boolean(row.isDeprecated) || type.includes('deprecated') || type.includes('legacy')
      let score = 0
      if (row.iconUrl) score += 10
      if (enhanced === wantsEnhanced) score += 20
      else score -= 20
      if (legacy && !/\blegacy\b/i.test(query)) score -= 6
      return { row, score }
    })
    .sort((a, b) => b.score - a.score || (a.row.hash ?? 0) - (b.row.hash ?? 0))

  return ranked[0]?.row
}

export function withoutPlaceholderPlugs<T extends { name?: string }>(refs?: T[]): T[] | undefined {
  if (!refs?.length) return refs
  return refs.filter((ref) => !isPlaceholderGearName(ref.name))
}
