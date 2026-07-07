/**
 * Match meta build gear to a guardian's Bungie inventory for in-game apply.
 */

import { getCharacterLoadoutProfile } from '@/lib/destiny/bungieClient'
import { scoreArmorStatSimilarity } from '@/lib/destiny/armorStatSimilarity'
import { ARMOR_STAT_HASH_LABEL, type ArmorStatKey } from '@/lib/destiny/armorStats'
import { resolveInventoryItem } from '@/lib/destiny/manifest'
import { catalogLookup } from '@/lib/destiny/itemsCatalog'
import { assignMetaWeaponSlots } from '@/lib/destiny/metaWeaponSlots'
import { resolveItemHash } from '@/lib/destiny/itemExternalLinks'
import type { ArmorSlotLabel, DestinyCharacterClass, DestinyIconRef, ExternalBuildSource } from '@/lib/destiny/types'

const WEAPON_BUCKETS = new Set([1498876634, 2465295065, 953998645])
const ARMOR_BUCKETS: Record<number, ArmorSlotLabel> = {
  14239492: 'helmet',
  3551918588: 'gauntlets',
  20886954: 'chest',
  1585787867: 'legs',
  2280036563: 'class',
}

export type InventoryLocation = 'character' | 'vault' | 'other_character'

export interface InventoryItemMatch {
  slot: 'kinetic' | 'energy' | 'power' | ArmorSlotLabel | 'exotic_armor'
  label: string
  itemHash?: number
  itemInstanceId?: string
  location?: InventoryLocation
  ownerCharacterId?: string
  equipped?: boolean
  matched: boolean
}

export interface MetaBuildInventoryPlan {
  characterId: string
  characterClass: DestinyCharacterClass
  items: InventoryItemMatch[]
  readyCount: number
  totalCount: number
}

type ProfileItem = {
  itemHash?: number
  bucketHash?: number
  itemInstanceId?: string
}

function hashForName(name?: string, ref?: DestinyIconRef): number | undefined {
  return resolveItemHash(ref, name) ?? (name ? catalogLookup(name)?.hash : undefined)
}

function indexItems(
  equipment: ProfileItem[],
  inventory: ProfileItem[],
  characterId: string,
  location: InventoryLocation
) {
  const out: Array<ProfileItem & { location: InventoryLocation; ownerCharacterId: string; equipped: boolean }> = []
  for (const item of equipment) {
    if (!item.itemInstanceId) continue
    out.push({ ...item, location, ownerCharacterId: characterId, equipped: true })
  }
  for (const item of inventory) {
    if (!item.itemInstanceId) continue
    out.push({ ...item, location, ownerCharacterId: characterId, equipped: false })
  }
  return out
}

function findBestMatch(
  items: Array<ProfileItem & { location: InventoryLocation; ownerCharacterId: string; equipped: boolean }>,
  targetHash: number | undefined
): string | undefined {
  if (!targetHash) return undefined
  const candidates = items.filter((item) => item.itemHash === targetHash)
  const onChar = candidates.find((c) => c.location === 'character' && !c.equipped)
  if (onChar?.itemInstanceId) return onChar.itemInstanceId
  const equipped = candidates.find((c) => c.equipped)
  if (equipped?.itemInstanceId) return equipped.itemInstanceId
  const vault = candidates.find((c) => c.location === 'vault')
  if (vault?.itemInstanceId) return vault.itemInstanceId
  return candidates[0]?.itemInstanceId
}

function findMatchMeta(
  items: Array<ProfileItem & { location: InventoryLocation; ownerCharacterId: string; equipped: boolean }>,
  targetHash: number | undefined,
  instanceId?: string
): Pick<InventoryItemMatch, 'itemInstanceId' | 'location' | 'ownerCharacterId' | 'equipped' | 'matched'> {
  if (!targetHash) return { matched: false }
  const hit = items.find((item) => item.itemInstanceId === instanceId && item.itemHash === targetHash)
  if (hit) {
    return {
      itemInstanceId: hit.itemInstanceId,
      location: hit.location,
      ownerCharacterId: hit.ownerCharacterId,
      equipped: hit.equipped,
      matched: true,
    }
  }
  const bestId = findBestMatch(items, targetHash)
  const best = items.find((i) => i.itemInstanceId === bestId)
  return best
    ? {
        itemInstanceId: best.itemInstanceId,
        location: best.location,
        ownerCharacterId: best.ownerCharacterId,
        equipped: best.equipped,
        matched: true,
      }
    : { matched: false }
}

export async function buildMetaInventoryPlan(
  membershipType: number,
  membershipId: string,
  characterId: string,
  characterClass: DestinyCharacterClass,
  build: ExternalBuildSource,
  armorSelections: Partial<Record<ArmorSlotLabel, string>> = {},
  accessToken: string
): Promise<MetaBuildInventoryPlan> {
  const profile = (await getCharacterLoadoutProfile(membershipType, membershipId, accessToken)) as {
    characterEquipment?: { data?: Record<string, { items?: ProfileItem[] }> }
    characterInventories?: { data?: Record<string, { items?: ProfileItem[] }> }
    profileInventories?: { data?: Record<string, { items?: ProfileItem[] }> }
    profileInventory?: { data?: { items?: ProfileItem[] } }
  }

  const allItems: Array<
    ProfileItem & { location: InventoryLocation; ownerCharacterId: string; equipped: boolean }
  > = []

  for (const [cid, row] of Object.entries(profile.characterEquipment?.data ?? {})) {
    allItems.push(...indexItems(row.items ?? [], [], cid, cid === characterId ? 'character' : 'other_character'))
  }
  for (const [cid, row] of Object.entries(profile.characterInventories?.data ?? {})) {
    allItems.push(...indexItems([], row.items ?? [], cid, cid === characterId ? 'character' : 'other_character'))
  }
  for (const row of Object.values(profile.profileInventories?.data ?? {})) {
    for (const item of row.items ?? []) {
      if (!item.itemInstanceId) continue
      allItems.push({
        ...item,
        location: 'vault',
        ownerCharacterId: characterId,
        equipped: false,
      })
    }
  }
  for (const item of profile.profileInventory?.data?.items ?? []) {
    if (!item.itemInstanceId) continue
    allItems.push({
      ...item,
      location: 'vault',
      ownerCharacterId: characterId,
      equipped: false,
    })
  }

  const weaponAssignment = assignMetaWeaponSlots(build)
  const inventorySlots: InventoryItemMatch[] = []

  const weaponSlots: Array<{ slot: 'kinetic' | 'energy' | 'power'; label: string; hash?: number }> = [
    {
      slot: 'kinetic',
      label: weaponAssignment.kinetic,
      hash: hashForName(weaponAssignment.kinetic, weaponAssignment.kineticRef),
    },
    {
      slot: 'energy',
      label: weaponAssignment.energy,
      hash: hashForName(weaponAssignment.energy, weaponAssignment.energyRef),
    },
    {
      slot: 'power',
      label: weaponAssignment.power,
      hash: hashForName(weaponAssignment.power, weaponAssignment.powerRef),
    },
  ]

  for (const w of weaponSlots) {
    const meta = findMatchMeta(allItems, w.hash)
    inventorySlots.push({ slot: w.slot, label: w.label, itemHash: w.hash, ...meta })
  }

  if (build.exoticArmor) {
    const hash = hashForName(build.exoticArmor, build.exoticArmorRef)
    inventorySlots.push({
      slot: 'exotic_armor',
      label: build.exoticArmor,
      itemHash: hash,
      ...findMatchMeta(allItems, hash),
    })
  }

  const armorSlots: ArmorSlotLabel[] = ['helmet', 'gauntlets', 'chest', 'legs']
  for (const slot of armorSlots) {
    const selectedName = armorSelections[slot] ?? build.legendaryArmor?.[slot]
    if (!selectedName) continue
    const hash = hashForName(selectedName, build.legendaryArmorRefs?.[slot])
    inventorySlots.push({
      slot,
      label: selectedName,
      itemHash: hash,
      ...findMatchMeta(allItems, hash),
    })
  }

  const readyCount = inventorySlots.filter((s) => s.matched && s.itemInstanceId).length
  return {
    characterId,
    characterClass,
    items: inventorySlots,
    readyCount,
    totalCount: inventorySlots.length,
  }
}

export interface OwnedArmorOption {
  name: string
  hash: number
  itemInstanceId: string
  location: InventoryLocation
  stats: Record<string, number>
  iconUrl?: string
  tierLabel?: string
  similarityScore: number
  matchesRecommended: boolean
}

function parseArmorStats(
  itemInstanceId: string,
  statsData?: Record<string, { stats?: Record<string, { value?: number }> }>
): Partial<Record<ArmorStatKey, number>> {
  const row = statsData?.[itemInstanceId]?.stats
  if (!row) return {}
  const stats: Partial<Record<ArmorStatKey, number>> = {}
  for (const [hash, val] of Object.entries(row)) {
    const label = ARMOR_STAT_HASH_LABEL[Number(hash)]
    if (label) stats[label] = val.value ?? 0
  }
  return stats
}

export async function listOwnedArmorForSlot(
  membershipType: number,
  membershipId: string,
  characterId: string,
  characterClass: DestinyCharacterClass,
  slot: ArmorSlotLabel,
  accessToken: string,
  opts?: { statPriorities?: string[]; recommendedHash?: number }
): Promise<OwnedArmorOption[]> {
  const profile = (await getCharacterLoadoutProfile(membershipType, membershipId, accessToken)) as {
    characterEquipment?: { data?: Record<string, { items?: ProfileItem[] }> }
    characterInventories?: { data?: Record<string, { items?: ProfileItem[] }> }
    profileInventories?: { data?: Record<string, { items?: ProfileItem[] }> }
    profileInventory?: { data?: { items?: ProfileItem[] } }
    characters?: { data?: Record<string, { classType?: number }> }
    itemComponents?: {
      stats?: {
        data?: Record<string, { stats?: Record<string, { value?: number }> }>
      }
    }
  }

  const classMap: Record<number, DestinyCharacterClass> = { 0: 'titan', 1: 'hunter', 2: 'warlock' }
  const hits: OwnedArmorOption[] = []
  const seen = new Set<string>()
  const statsData = profile.itemComponents?.stats?.data
  const priorities = opts?.statPriorities ?? []
  const recommendedHash = opts?.recommendedHash

  async function consider(item: ProfileItem, location: InventoryLocation, ownerId: string) {
    if (!item.itemHash || !item.itemInstanceId || !item.bucketHash) return
    const slotBucket = Object.entries(ARMOR_BUCKETS).find(([, s]) => s === slot)?.[0]
    if (!slotBucket || item.bucketHash !== Number(slotBucket)) return
    if (WEAPON_BUCKETS.has(item.bucketHash)) return

    const ownerClass = classMap[profile.characters?.data?.[ownerId]?.classType ?? -1]
    if (ownerClass && ownerClass !== characterClass && location !== 'vault') return

    const info = await resolveInventoryItem(item.itemHash)
    if ((info.tierLabel ?? '').toLowerCase().includes('exotic')) return

    const key = String(item.itemInstanceId)
    if (seen.has(key)) return
    seen.add(key)

    const statMap = parseArmorStats(key, statsData)
    const stats: Record<string, number> = {}
    for (const [label, value] of Object.entries(statMap)) {
      stats[label] = value
    }

    const similarityScore = scoreArmorStatSimilarity(statMap, priorities, {
      recommendedHash,
      itemHash: item.itemHash,
    })

    hits.push({
      name: info.name,
      hash: item.itemHash,
      itemInstanceId: key,
      location,
      stats,
      iconUrl: info.iconUrl,
      tierLabel: info.tierLabel,
      similarityScore,
      matchesRecommended: Boolean(recommendedHash && item.itemHash === recommendedHash),
    })
  }

  for (const [cid, row] of Object.entries(profile.characterEquipment?.data ?? {})) {
    for (const item of row.items ?? []) {
      await consider(item, cid === characterId ? 'character' : 'other_character', cid)
    }
  }
  for (const [cid, row] of Object.entries(profile.characterInventories?.data ?? {})) {
    for (const item of row.items ?? []) {
      await consider(item, cid === characterId ? 'character' : 'other_character', cid)
    }
  }
  for (const row of Object.values(profile.profileInventories?.data ?? {})) {
    for (const item of row.items ?? []) {
      await consider(item, 'vault', characterId)
    }
  }
  for (const item of profile.profileInventory?.data?.items ?? []) {
    await consider(item, 'vault', characterId)
  }

  return hits.sort((a, b) => {
    if (b.similarityScore !== a.similarityScore) return b.similarityScore - a.similarityScore
    if (a.location === 'vault' && b.location !== 'vault') return 1
    if (b.location === 'vault' && a.location !== 'vault') return -1
    return a.name.localeCompare(b.name)
  })
}
