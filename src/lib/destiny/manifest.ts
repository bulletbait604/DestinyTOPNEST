/**
 * Bungie Destiny 2 manifest resolution.
 * Index: https://www.bungie.net/Platform/Destiny2/Manifest/
 * Per-entity: /Destiny2/Manifest/{EntityType}/{hash}/
 */

import clientPromise from '@/lib/mongodb'
import { getMongoDbName } from '@/lib/database'
import {
  getDestinyEntityDefinition,
  getDestinyManifest,
  searchDestinyEntities,
  type ManifestDisplayProperties,
} from '@/lib/destiny/bungieClient'
import { activityCatalogLookup } from '@/lib/destiny/activityCatalog'
import { activityIconPathFallback } from '@/lib/destiny/activityIconPaths'
import { itemIconPathFallback } from '@/lib/destiny/itemIconPaths'
import { catalogLookup, type ManifestEntityType } from '@/lib/destiny/itemsCatalog'
import { DESTINY_MANIFEST_URL, destinyApiConfigured } from '@/lib/destiny/env'

const CACHE_COLLECTION = 'destiny_manifest_cache'
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000

export interface DestinyIconRef {
  name: string
  hash?: number
  iconUrl?: string
  tierLabel?: string
  entityType?: ManifestEntityType
}

/** Full definition metadata resolved from the live manifest. */
export interface ManifestDefinitionInfo {
  hash: number
  entityType: ManifestEntityType
  name: string
  iconUrl?: string
  tierLabel?: string
  description?: string
  itemTypeDisplayName?: string
}

interface CacheDoc {
  _id: string
  hash: number
  entityType: ManifestEntityType
  name: string
  iconPath?: string
  iconUrl?: string
  tierLabel?: string
  description?: string
  itemTypeDisplayName?: string
  cachedAt: string
}

import { buildBungieIconUrl } from '@/lib/destiny/bungieUrls'

export { buildBungieIconUrl, DESTINY_MANIFEST_URL }

function cacheId(entityType: ManifestEntityType, hash: number): string {
  return `${entityType}:${hash}`
}

async function readCache(entityType: ManifestEntityType, hash: number): Promise<CacheDoc | null> {
  try {
    const client = await clientPromise
    const doc = await client.db(getMongoDbName()).collection(CACHE_COLLECTION).findOne({ _id: cacheId(entityType, hash) })
    if (!doc) return null
    const age = Date.now() - new Date(doc.cachedAt as string).getTime()
    if (age > CACHE_TTL_MS) return null
    return doc as unknown as CacheDoc
  } catch {
    return null
  }
}

async function writeCache(entry: CacheDoc): Promise<void> {
  try {
    const client = await clientPromise
    await client.db(getMongoDbName()).collection(CACHE_COLLECTION).updateOne(
      { _id: entry._id },
      { $set: entry },
      { upsert: true }
    )
  } catch {
    /* non-fatal */
  }
}

function propsFromDefinition(def: unknown): ManifestDisplayProperties | undefined {
  if (!def || typeof def !== 'object') return undefined
  return (def as { displayProperties?: ManifestDisplayProperties }).displayProperties
}

function tierFromDefinition(def: unknown): string | undefined {
  if (!def || typeof def !== 'object') return undefined
  return (def as { inventory?: { tierTypeName?: string } }).inventory?.tierTypeName
}

function itemTypeFromDefinition(def: unknown): string | undefined {
  if (!def || typeof def !== 'object') return undefined
  return (def as { itemTypeDisplayName?: string }).itemTypeDisplayName
}

function cacheToInfo(doc: CacheDoc): ManifestDefinitionInfo {
  return {
    hash: doc.hash,
    entityType: doc.entityType,
    name: doc.name,
    iconUrl: doc.iconUrl,
    tierLabel: doc.tierLabel,
    description: doc.description,
    itemTypeDisplayName: doc.itemTypeDisplayName,
  }
}

function iconRefFromInfo(info: ManifestDefinitionInfo): DestinyIconRef {
  return {
    name: info.name,
    hash: info.hash,
    iconUrl: info.iconUrl,
    tierLabel: info.tierLabel,
    entityType: info.entityType,
  }
}

function catalogIconUrl(name: string): string | undefined {
  const activity = activityCatalogLookup(name)
  if (activity?.iconPath) return buildBungieIconUrl(activity.iconPath)
  const activityFallback = activityIconPathFallback(name)
  if (activityFallback) return buildBungieIconUrl(activityFallback)
  const item = catalogLookup(name)
  if (item?.iconPath) return buildBungieIconUrl(item.iconPath)
  const itemFallback = itemIconPathFallback(name)
  return itemFallback ? buildBungieIconUrl(itemFallback) : undefined
}

function withCatalogIcon(ref: DestinyIconRef, name: string): DestinyIconRef {
  if (ref.iconUrl) return ref
  const iconUrl = catalogIconUrl(name)
  return iconUrl ? { ...ref, iconUrl } : ref
}

/** Current manifest version string from Bungie (updates each content patch). */
export async function getLiveManifestVersion(): Promise<string | undefined> {
  if (!destinyApiConfigured()) return undefined
  try {
    const manifest = await getDestinyManifest()
    return manifest.version
  } catch {
    return undefined
  }
}

/** Resolve any manifest definition hash â†’ name, icon, tier, description. */
export async function resolveDefinition(
  entityType: ManifestEntityType,
  hash: number,
  fallbackName = `Hash ${hash}`
): Promise<ManifestDefinitionInfo> {
  const cached = await readCache(entityType, hash)
  if (cached?.name) return cacheToInfo(cached)

  if (!destinyApiConfigured()) {
    const iconUrl = catalogIconUrl(fallbackName)
    return { hash, entityType, name: fallbackName, iconUrl }
  }

  try {
    const def = await getDestinyEntityDefinition(entityType, hash)
    const props = propsFromDefinition(def)
    let iconUrl = buildBungieIconUrl(props?.icon)
    if (!iconUrl) iconUrl = catalogIconUrl(fallbackName)
    const name = props?.name || fallbackName
    const tierLabel = tierFromDefinition(def)
    const description = props?.description
    const itemTypeDisplayName = itemTypeFromDefinition(def)

    await writeCache({
      _id: cacheId(entityType, hash),
      hash,
      entityType,
      name,
      iconPath: props?.icon,
      iconUrl,
      tierLabel,
      description,
      itemTypeDisplayName,
      cachedAt: new Date().toISOString(),
    })

    return { hash, entityType, name, iconUrl, tierLabel, description, itemTypeDisplayName }
  } catch {
    const iconUrl = catalogIconUrl(fallbackName)
    return { hash, entityType, name: fallbackName, iconUrl }
  }
}

export async function resolveInventoryItem(hash: number, fallbackName?: string): Promise<ManifestDefinitionInfo> {
  return resolveDefinition('DestinyInventoryItemDefinition', hash, fallbackName ?? `Item ${hash}`)
}

export async function resolveActivityByHash(hash: number, fallbackName?: string): Promise<ManifestDefinitionInfo> {
  return resolveDefinition('DestinyActivityDefinition', hash, fallbackName ?? `Activity ${hash}`)
}

export async function resolveManifestHash(
  entityType: ManifestEntityType,
  hash: number,
  fallbackName: string
): Promise<DestinyIconRef> {
  const info = await resolveDefinition(entityType, hash, fallbackName)
  return withCatalogIcon(iconRefFromInfo(info), fallbackName)
}

export async function resolveByName(
  name: string,
  preferredEntity: ManifestEntityType = 'DestinyInventoryItemDefinition'
): Promise<DestinyIconRef> {
  const catalog = catalogLookup(name)
  if (catalog) {
    return resolveManifestHash(catalog.entity, catalog.hash, name)
  }

  if (!destinyApiConfigured()) {
    return { name, entityType: preferredEntity }
  }

  try {
    const results = await searchDestinyEntities(preferredEntity, name)
    const first = results[0]
    if (first?.hash) {
      return resolveManifestHash(preferredEntity, first.hash, first.name || name)
    }
  } catch {
    /* fall through */
  }

  return { name, entityType: preferredEntity }
}

export async function resolveActivity(name: string): Promise<DestinyIconRef> {
  const catalog = activityCatalogLookup(name) ?? catalogLookup(name)
  if (catalog?.entity === 'DestinyActivityDefinition') {
    return withCatalogIcon(await resolveManifestHash(catalog.entity, catalog.hash, name), name)
  }
  return withCatalogIcon(await resolveByName(name, 'DestinyActivityDefinition'), name)
}

/** Prefer activity hash when available (PGCR / run records), fall back to name lookup. */
export async function resolveActivityRef(name: string, hash?: number): Promise<DestinyIconRef> {
  if (hash && hash > 0) {
    return withCatalogIcon(iconRefFromInfo(await resolveActivityByHash(hash, name)), name)
  }
  return resolveActivity(name)
}

export async function resolveSubclass(name: string): Promise<DestinyIconRef> {
  const key = name.trim().toLowerCase()
  const damageKey = ['prismatic', 'arc', 'solar', 'void', 'strand', 'stasis'].find((k) => key.includes(k))
  if (damageKey) {
    const catalog = catalogLookup(damageKey)
    if (catalog) return resolveManifestHash(catalog.entity, catalog.hash, name)
  }
  return resolveByName(name, 'DestinyDamageTypeDefinition')
}

export async function resolveClassIcon(characterClass: string): Promise<DestinyIconRef> {
  const catalog = catalogLookup(characterClass)
  if (catalog) return resolveManifestHash(catalog.entity, catalog.hash, characterClass)
  return { name: characterClass }
}

export async function resolveMany(names: string[], entity?: ManifestEntityType): Promise<DestinyIconRef[]> {
  return Promise.all(names.map((n) => resolveByName(n, entity)))
}
