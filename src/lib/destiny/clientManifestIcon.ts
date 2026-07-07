/**
 * Client-side icon resolution: static catalog paths first, then manifest API.
 */

import { activityIconUrlForName } from '@/lib/destiny/activityIconPaths'
import { buildBungieIconUrl } from '@/lib/destiny/bungieUrls'
import { classIconUrlForClass } from '@/lib/destiny/classIconPaths'
import { isUsableIconUrl } from '@/lib/destiny/iconUtils'
import { itemIconPathFallback } from '@/lib/destiny/itemIconPaths'
import { itemNameLookupCandidates } from '@/lib/destiny/itemNameAliases'
import { catalogLookup } from '@/lib/destiny/itemsCatalog'
import type { DestinyIconRef } from '@/lib/destiny/types'

/** Resolve icon URL from static class, activity, and item catalog paths (no network). */
export function staticIconUrlForLabel(label: string): string | undefined {
  const trimmed = label.trim()
  if (!trimmed) return undefined

  const classUrl = classIconUrlForClass(trimmed)
  if (classUrl && isUsableIconUrl(classUrl)) return classUrl

  for (const candidate of itemNameLookupCandidates(trimmed)) {
    const activityUrl = activityIconUrlForName(candidate)
    if (activityUrl && isUsableIconUrl(activityUrl)) return activityUrl

    const catalog = catalogLookup(candidate)
    if (catalog?.iconPath) {
      const url = buildBungieIconUrl(catalog.iconPath)
      if (isUsableIconUrl(url)) return url
    }

    const path = itemIconPathFallback(candidate)
    if (path) {
      const url = buildBungieIconUrl(path)
      if (isUsableIconUrl(url)) return url
    }
  }

  return undefined
}

/** Fetch icon URL: static fallbacks, then authenticated manifest resolve API. */
export async function fetchManifestIconUrl(
  item?: DestinyIconRef,
  name?: string
): Promise<string | undefined> {
  const label = item?.name ?? name
  const existing = item?.iconUrl
  if (existing && isUsableIconUrl(existing)) return existing

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
    const resolved = json.iconUrl
    if (resolved && isUsableIconUrl(resolved)) return resolved
    return label ? staticIconUrlForLabel(label) : undefined
  } catch {
    return label ? staticIconUrlForLabel(label) : undefined
  }
}
