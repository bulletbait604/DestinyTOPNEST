import { catalogLookup } from '@/lib/destiny/itemsCatalog'
import type { DestinyIconRef } from '@/lib/destiny/types'
import {
  activityWalkthroughLinkTitle,
  activityWalkthroughUrl,
} from '@/lib/destiny/activityWalkthroughLinks'

const LIGHT_GG = 'https://www.light.gg'
const BLUEBERRIES = 'https://www.blueberries.gg'

/** Resolve a Bungie definition hash from icon ref or catalog name fallback. */
export function resolveItemHash(item?: DestinyIconRef, name?: string): number | undefined {
  if (item?.hash) return item.hash
  const label = item?.name ?? name
  if (!label) return undefined
  return catalogLookup(label)?.hash
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function lightGgSearchUrl(path: string, query: string): string {
  return `${LIGHT_GG}${path}?search=${encodeURIComponent(query)}`
}

/** light.gg item page — sources tab shows how to obtain. */
export function lightGgItemUrl(item?: DestinyIconRef, name?: string): string | undefined {
  const hash = resolveItemHash(item, name)
  const label = item?.name ?? name
  if (hash) return `${LIGHT_GG}/db/items/${hash}/`
  if (label) return lightGgSearchUrl('/db/items/', label)
  return undefined
}

/** Blueberries.gg weapon or armor guide — acquisition-focused. */
export function blueberriesItemUrl(name: string, kind: 'weapon' | 'armor' | 'auto' = 'auto'): string {
  const slug = slugify(name)
  const lower = name.toLowerCase()
  const isArmor =
    kind === 'armor' ||
    (kind === 'auto' &&
      /\b(helm|helmet|gauntlets|gloves|greaves|boots|chest|plate|robe|bond|cloak|mark|class item|cuirass|mantle|greaves|boots|hood|mask)\b/i.test(
        lower
      ))
  const section = isArmor ? 'armor' : 'weapons'
  return `${BLUEBERRIES}/${section}/${slug}/`
}

/** Best external detail URL for weapons, armor, perks, mods, and aspects. */
export function itemAcquisitionUrl(item?: DestinyIconRef, name?: string): string | undefined {
  const label = item?.name ?? name
  if (!label && !item?.hash) return undefined

  if (item?.entityType === 'DestinyActivityDefinition') {
    return undefined
  }

  const light = lightGgItemUrl(item, label)
  if (light) return light
  if (label) return blueberriesItemUrl(label)
  return undefined
}

/** Activity walkthrough on YouTube. */
export function activityExternalUrl(item?: DestinyIconRef, name?: string): string | undefined {
  const label = item?.name ?? name
  if (!label) return undefined
  return activityWalkthroughUrl(label).url
}

/** Best external detail URL for a manifest-backed ref. */
export function itemExternalUrl(item?: DestinyIconRef, name?: string): string | undefined {
  const label = item?.name ?? name
  if (!label && !item?.hash) return undefined

  if (item?.entityType === 'DestinyActivityDefinition') {
    return activityExternalUrl(item, label)
  }

  return itemAcquisitionUrl(item, label)
}

export function itemExternalLinkTitle(item?: DestinyIconRef, name?: string): string {
  const label = item?.name ?? name ?? 'Item'

  if (item?.entityType === 'DestinyActivityDefinition') {
    return activityWalkthroughLinkTitle(label)
  }

  return `How to get ${label} — light.gg sources & Blueberries guide`
}

/** Secondary Blueberries link for acquisition guides. */
export function itemBlueberriesUrl(item?: DestinyIconRef, name?: string): string | undefined {
  const label = item?.name ?? name
  if (!label || item?.entityType === 'DestinyActivityDefinition') return undefined
  return blueberriesItemUrl(label)
}
