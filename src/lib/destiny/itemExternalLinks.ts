import { catalogLookup } from '@/lib/destiny/itemsCatalog'
import type { DestinyIconRef } from '@/lib/destiny/types'

const LIGHT_GG = 'https://www.light.gg'

/** Resolve a Bungie definition hash from icon ref or catalog name fallback. */
export function resolveItemHash(item?: DestinyIconRef, name?: string): number | undefined {
  if (item?.hash) return item.hash
  const label = item?.name ?? name
  if (!label) return undefined
  return catalogLookup(label)?.hash
}

function lightGgSearchUrl(path: string, query: string): string {
  return `${LIGHT_GG}${path}?search=${encodeURIComponent(query)}`
}

/** light.gg item/perk/aspect page — hash preferred, name search as fallback. */
export function lightGgItemUrl(item?: DestinyIconRef, name?: string): string | undefined {
  const hash = resolveItemHash(item, name)
  const label = item?.name ?? name
  if (hash) return `${LIGHT_GG}/db/items/${hash}/`
  if (label) return lightGgSearchUrl('/db/items/', label)
  return undefined
}

/** light.gg activity page. */
export function lightGgActivityUrl(hash?: number, name?: string): string | undefined {
  if (hash) return `${LIGHT_GG}/db/activities/${hash}/`
  if (name) return lightGgSearchUrl('/db/activities/', name)
  return undefined
}

/** Best external detail URL for a manifest-backed ref. */
export function itemExternalUrl(item?: DestinyIconRef, name?: string): string | undefined {
  const label = item?.name ?? name
  if (!label && !item?.hash) return undefined

  if (item?.entityType === 'DestinyActivityDefinition') {
    return lightGgActivityUrl(item.hash, label)
  }

  return lightGgItemUrl(item, label)
}

export function itemExternalLinkTitle(item?: DestinyIconRef, name?: string): string {
  const label = item?.name ?? name ?? 'Item'
  return `View ${label} on light.gg`
}
