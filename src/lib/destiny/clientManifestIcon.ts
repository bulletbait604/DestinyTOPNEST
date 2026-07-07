/**
 * Client-side icon resolution: static catalog paths first, then manifest API.
 */

import { activityIconUrlForName } from '@/lib/destiny/activityIconPaths'
import { buildBungieIconUrl } from '@/lib/destiny/bungieUrls'
import { classIconUrlForClass } from '@/lib/destiny/classIconPaths'
import { itemIconPathFallback } from '@/lib/destiny/itemIconPaths'
import { catalogLookup } from '@/lib/destiny/itemsCatalog'
import type { DestinyIconRef } from '@/lib/destiny/types'

/** Resolve icon URL from static class, activity, and item catalog paths (no network). */
export function staticIconUrlForLabel(label: string): string | undefined {
  const trimmed = label.trim()
  if (!trimmed) return undefined

  const classUrl = classIconUrlForClass(trimmed)
  if (classUrl) return classUrl

  const activityUrl = activityIconUrlForName(trimmed)
  if (activityUrl) return activityUrl

  const catalog = catalogLookup(trimmed)
  if (catalog?.iconPath) return buildBungieIconUrl(catalog.iconPath)

  const path = itemIconPathFallback(trimmed)
  return path ? buildBungieIconUrl(path) : undefined
}

/** Fetch icon URL: static fallbacks, then authenticated manifest resolve API. */
export async function fetchManifestIconUrl(
  item?: DestinyIconRef,
  name?: string
): Promise<string | undefined> {
  const label = item?.name ?? name
  if (label) {
    const staticUrl = staticIconUrlForLabel(label)
    if (staticUrl) return staticUrl
  }

  const params = new URLSearchParams()
  if (item?.hash) params.set('hash', String(item.hash))
  if (item?.entityType) params.set('entity', item.entityType)
  if (label) params.set('name', label)
  if (!params.get('name') && !params.get('hash')) return undefined

  try {
    const res = await fetch(`/api/destiny/manifest/resolve?${params.toString()}`, { cache: 'no-store' })
    if (!res.ok) return label ? staticIconUrlForLabel(label) : undefined
    const json = (await res.json()) as { iconUrl?: string }
    return json.iconUrl ?? (label ? staticIconUrlForLabel(label) : undefined)
  } catch {
    return label ? staticIconUrlForLabel(label) : undefined
  }
}
