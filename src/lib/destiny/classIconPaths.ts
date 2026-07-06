import { buildBungieIconUrl } from '@/lib/destiny/bungieUrls'
import type { DestinyCharacterClass } from '@/lib/destiny/types'

/** Bungie presentation-node class symbols (DestinyClassDefinition has no icon). */
export const CLASS_ICON_PATHS: Record<DestinyCharacterClass, string> = {
  titan: '/common/destiny2_content/icons/46a19ddd00d0f6ca822230943103b54a.png',
  hunter: '/common/destiny2_content/icons/05e32a388d9a65a0ef59b2193eee2db4.png',
  warlock: '/common/destiny2_content/icons/e4006d9a8fe167bd7e83193d7601c89a.png',
}

export const CLASS_DEFINITION_HASHES: Record<DestinyCharacterClass, number> = {
  titan: 3655393761,
  hunter: 671679327,
  warlock: 2271682572,
}

function normalizeClassKey(value: string): DestinyCharacterClass | undefined {
  const key = value.trim().toLowerCase()
  if (key === 'titan' || key === 'hunter' || key === 'warlock') return key
  return undefined
}

export function classIconPathForClass(value: string): string | undefined {
  const key = normalizeClassKey(value)
  return key ? CLASS_ICON_PATHS[key] : undefined
}

export function classIconUrlForClass(value: string): string | undefined {
  const path = classIconPathForClass(value)
  return path ? buildBungieIconUrl(path) : undefined
}

export function classIconRefForClass(value: string) {
  const key = normalizeClassKey(value)
  if (!key) return undefined
  return {
    name: key.charAt(0).toUpperCase() + key.slice(1),
    hash: CLASS_DEFINITION_HASHES[key],
    entityType: 'DestinyClassDefinition' as const,
    iconUrl: buildBungieIconUrl(CLASS_ICON_PATHS[key]),
  }
}
