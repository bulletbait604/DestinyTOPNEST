/**
 * Mongo-backed Armor 3.0 stats + armor/weapon mod catalog (synced from Bungie manifest).
 */

import clientPromise from '@/lib/mongodb'
import { getMongoDbName } from '@/lib/database'
import { DESTINY_COLLECTIONS } from '@/lib/destiny/collections'
import type { ArmorStatKey } from '@/lib/destiny/armorStats'
import { chooseGearMod } from '@/lib/destiny/gearIconPick'
import type { DestinyIconRef } from '@/lib/destiny/types'

export type GearModKind = 'armor' | 'weapon' | 'ghost' | 'weapon-perk' | 'armor-perk'

export const GEAR_MOD_KINDS: GearModKind[] = ['armor', 'weapon', 'ghost', 'weapon-perk', 'armor-perk']

export interface GearModDoc {
  _id: string
  hash: number
  kind: GearModKind
  name: string
  description: string
  itemTypeDisplayName: string
  plugCategoryIdentifier: string
  family: string
  armorSlot?: string | null
  energyCost?: number | null
  energyTypeHash?: number | null
  investmentStats?: Array<{ statHash: number; value: number }>
  iconPath?: string | null
  iconUrl?: string | null
  isDeprecated?: boolean
  sandboxPerkHash?: number | null
  updatedAt: string
}

export interface ArmorStatCatalogDoc {
  _id: string
  key: ArmorStatKey
  legacyKey: string
  hash: number
  order: number
  name: string
  description: string
  iconPath?: string | null
  iconUrl?: string | null
  benefits: { base: string[]; bonus: string[] }
  updatedAt: string
}

export interface ArmorArchetypeDoc {
  _id: string
  name: string
  primary: ArmorStatKey | string
  secondary: ArmorStatKey | string
  updatedAt: string
}

export interface GearCatalogMeta {
  _id: string
  manifestVersion: string
  syncedAt: string
  counts: Record<string, number>
  notes?: string
}

async function db() {
  const client = await clientPromise
  return client.db(getMongoDbName())
}

export async function getGearCatalogMeta(): Promise<GearCatalogMeta | null> {
  try {
    const doc = await (await db())
      .collection(DESTINY_COLLECTIONS.gearCatalogMeta)
      .findOne({ _id: 'armor_mod_catalog' })
    return doc as GearCatalogMeta | null
  } catch {
    return null
  }
}

export async function listArmorStatsFromCatalog(): Promise<ArmorStatCatalogDoc[]> {
  try {
    const rows = await (await db())
      .collection(DESTINY_COLLECTIONS.armorStats)
      .find({})
      .sort({ order: 1 })
      .toArray()
    return rows as unknown as ArmorStatCatalogDoc[]
  } catch {
    return []
  }
}

export async function listArmorArchetypesFromCatalog(): Promise<ArmorArchetypeDoc[]> {
  try {
    const rows = await (await db())
      .collection(DESTINY_COLLECTIONS.armorArchetypes)
      .find({})
      .sort({ name: 1 })
      .toArray()
    return rows as unknown as ArmorArchetypeDoc[]
  } catch {
    return []
  }
}

export async function listGearMods(opts?: {
  kind?: GearModKind | GearModKind[]
  family?: string
  q?: string
  limit?: number
}): Promise<GearModDoc[]> {
  try {
    const filter: Record<string, unknown> = {}
    if (opts?.kind) {
      filter.kind = Array.isArray(opts.kind) ? { $in: opts.kind } : opts.kind
    }
    if (opts?.family) filter.family = opts.family
    if (opts?.q?.trim()) {
      filter.$text = { $search: opts.q.trim() }
    }

    const limit = Math.min(Math.max(opts?.limit ?? 500, 1), 2000)
    const cursor = (await db())
      .collection(DESTINY_COLLECTIONS.gearMods)
      .find(filter)
      .sort(opts?.q ? { score: { $meta: 'textScore' } } : { name: 1 })
      .limit(limit)

    return (await cursor.toArray()) as unknown as GearModDoc[]
  } catch {
    return []
  }
}

export async function findGearModByHash(hash: number): Promise<GearModDoc | null> {
  if (!hash) return null
  try {
    const row = await (await db()).collection(DESTINY_COLLECTIONS.gearMods).findOne({ hash })
    return row as GearModDoc | null
  } catch {
    return null
  }
}

export async function findGearModByName(name: string): Promise<GearModDoc | null> {
  const trimmed = name.trim()
  if (!trimmed) return null
  try {
    const rows = (await (await db())
      .collection(DESTINY_COLLECTIONS.gearMods)
      .find({
        name: { $regex: `^${trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
      })
      .limit(40)
      .toArray()) as unknown as GearModDoc[]
    return chooseGearMod(trimmed, rows) ?? null
  } catch {
    return null
  }
}

export function gearModToIconRef(mod: GearModDoc): DestinyIconRef {
  return {
    hash: mod.hash,
    name: mod.name,
    iconUrl: mod.iconUrl ?? undefined,
    entityType: 'DestinyInventoryItemDefinition',
    tierLabel: mod.itemTypeDisplayName || undefined,
  }
}

/** Resolve mod icon refs from catalog first, then fall back via caller. */
export async function resolveModIconRefs(
  names: string[]
): Promise<Array<DestinyIconRef | undefined>> {
  return Promise.all(
    names.map(async (name) => {
      const mod = await findGearModByName(name)
      return mod ? gearModToIconRef(mod) : undefined
    })
  )
}
