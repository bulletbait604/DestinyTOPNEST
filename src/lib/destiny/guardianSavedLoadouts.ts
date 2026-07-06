/**
 * Parse in-game saved loadouts from Bungie CharacterLoadouts component (206).
 */

import { getCharacterLoadoutProfile } from '@/lib/destiny/bungieClient'
import {
  buildSnapshotFromItemEntries,
  resolveInventoryBucketHash,
  type BuildProfileComponents,
  type ProfileItemEntry,
} from '@/lib/destiny/guardianBuild'
import { tagLoadoutCompleteness } from '@/lib/destiny/loadoutCompleteness'
import { resolveDefinition } from '@/lib/destiny/manifest'
import type { BuildSnapshot, DestinyCharacterClass, DestinyIconRef } from '@/lib/destiny/types'

const CLASS_MAP: Record<number, DestinyCharacterClass> = {
  0: 'titan',
  1: 'hunter',
  2: 'warlock',
}

type ProfileItem = ProfileItemEntry

type LoadoutProfile = {
  characters?: { data?: Record<string, { classType?: number }> }
  characterEquipment?: { data?: Record<string, { items?: ProfileItem[] }> }
  characterInventories?: { data?: Record<string, { items?: ProfileItem[] }> }
  profileInventories?: { data?: Record<string, { items?: ProfileItem[] }> }
  profileInventory?: { data?: { items?: ProfileItem[] } }
  characterLoadouts?: {
    data?: Record<
      string,
      {
        loadouts?: Array<{
          colorHash?: number
          nameHash?: number
          items?: Array<{ itemInstanceId?: string; itemHash?: number; bucketHash?: number }>
        }>
      }
    >
  }
  itemComponents?: BuildProfileComponents
}

function indexAllProfileItems(profile: LoadoutProfile): Map<string, ProfileItem> {
  const map = new Map<string, ProfileItem>()

  const addItems = (items?: ProfileItem[]) => {
    for (const item of items ?? []) {
      if (item.itemInstanceId) map.set(item.itemInstanceId, item)
    }
  }

  for (const bucket of Object.values(profile.characterEquipment?.data ?? {})) {
    addItems(bucket.items)
  }
  for (const bucket of Object.values(profile.characterInventories?.data ?? {})) {
    addItems(bucket.items)
  }
  for (const bucket of Object.values(profile.profileInventories?.data ?? {})) {
    addItems(bucket.items)
  }
  addItems(profile.profileInventory?.data?.items)

  return map
}

async function resolveLoadoutName(nameHash?: number, index?: number): Promise<string> {
  if (!nameHash) return `Loadout ${(index ?? 0) + 1}`
  try {
    const def = await resolveDefinition('DestinyLoadoutNameDefinition', nameHash, 'Loadout')
    if (def.name && def.name !== 'Loadout') return def.name
  } catch {
    /* fallback */
  }
  return `Loadout ${(index ?? 0) + 1}`
}

async function resolveLoadoutColor(colorHash?: number): Promise<DestinyIconRef | undefined> {
  if (!colorHash) return undefined
  try {
    const def = await resolveDefinition('DestinyLoadoutColorDefinition', colorHash, 'Loadout')
    if (!def.iconUrl) return undefined
    return {
      name: def.name,
      hash: def.hash,
      iconUrl: def.iconUrl,
      entityType: 'DestinyLoadoutColorDefinition',
    }
  } catch {
    return undefined
  }
}

async function resolveLoadoutEntries(
  items: Array<{ itemInstanceId?: string; itemHash?: number; bucketHash?: number }>,
  itemIndex: Map<string, ProfileItem>
): Promise<ProfileItemEntry[]> {
  const entries: ProfileItemEntry[] = []

  for (const entry of items) {
    const indexed = entry.itemInstanceId ? itemIndex.get(entry.itemInstanceId) : undefined
    const itemHash = indexed?.itemHash ?? entry.itemHash
    if (!itemHash) continue

    let bucketHash = indexed?.bucketHash ?? entry.bucketHash
    if (!bucketHash) {
      bucketHash = await resolveInventoryBucketHash(itemHash)
    }

    entries.push({
      itemHash,
      bucketHash,
      itemInstanceId: entry.itemInstanceId ?? indexed?.itemInstanceId,
    })
  }

  return entries
}

function emptySavedLoadoutSnapshot(input: {
  characterClass: DestinyCharacterClass
  userId: string
  id: string
  name: string
  loadoutIndex: number
  loadoutColorRef?: DestinyIconRef
}): BuildSnapshot {
  return tagLoadoutCompleteness({
    id: input.id,
    runId: '',
    userId: input.userId,
    characterClass: input.characterClass,
    subclass: '—',
    super: '—',
    aspects: [],
    fragments: [],
    abilities: [],
    exoticArmor: '—',
    armorPieces: [],
    kineticWeapon: '—',
    energyWeapon: '—',
    powerWeapon: '—',
    armorMods: [],
    artifactPerks: [],
    stats: {},
    activityId: 0,
    activityName: input.name,
    difficulty: 'normal',
    completedAt: new Date().toISOString(),
    durationSeconds: 0,
    deaths: 0,
    fireteamComposition: 'solo',
    loadoutName: input.name,
    loadoutIndex: input.loadoutIndex,
    loadoutSource: 'saved',
    loadoutColorRef: input.loadoutColorRef,
    loadoutIncomplete: true,
    missingLoadoutSlots: 9,
  })
}

export async function fetchSavedLoadouts(
  membershipType: number,
  membershipId: string,
  accessToken: string,
  characterId: string,
  userId: string
): Promise<BuildSnapshot[]> {
  const profile = (await getCharacterLoadoutProfile(
    membershipType,
    membershipId,
    accessToken
  )) as LoadoutProfile

  const classType = profile.characters?.data?.[characterId]?.classType ?? 1
  const characterClass = CLASS_MAP[classType] ?? 'hunter'
  const itemIndex = indexAllProfileItems(profile)
  const loadouts = profile.characterLoadouts?.data?.[characterId]?.loadouts ?? []
  const snapshots: BuildSnapshot[] = []

  for (let i = 0; i < loadouts.length; i++) {
    const loadout = loadouts[i]
    const name = await resolveLoadoutName(loadout?.nameHash, i)
    const loadoutColorRef = await resolveLoadoutColor(loadout?.colorHash)
    const items = loadout?.items ?? []

    if (!items.length) {
      snapshots.push(
        emptySavedLoadoutSnapshot({
          characterClass,
          userId,
          id: `saved-${characterId}-${i}`,
          name,
          loadoutIndex: i,
          loadoutColorRef,
        })
      )
      continue
    }

    const entries = await resolveLoadoutEntries(items, itemIndex)
    const snapshot = await buildSnapshotFromItemEntries(entries, {
      itemComponents: profile.itemComponents,
      characterClass,
      userId,
      id: `saved-${characterId}-${i}`,
      activityName: name,
      loadoutName: name,
      loadoutIndex: i,
      loadoutSource: 'saved',
      allowPartial: true,
    })

    if (snapshot) {
      snapshots.push(
        tagLoadoutCompleteness({
          ...snapshot,
          loadoutColorRef,
        })
      )
    } else {
      snapshots.push(
        emptySavedLoadoutSnapshot({
          characterClass,
          userId,
          id: `saved-${characterId}-${i}`,
          name,
          loadoutIndex: i,
          loadoutColorRef,
        })
      )
    }
  }

  return snapshots
}
