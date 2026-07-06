/**
 * Parse in-game saved loadouts from Bungie CharacterLoadouts component (206).
 */

import { getCharacterLoadoutProfile } from '@/lib/destiny/bungieClient'
import {
  buildSnapshotFromItemEntries,
  type BuildProfileComponents,
  type ProfileItemEntry,
} from '@/lib/destiny/guardianBuild'
import { filterDisplayableSavedLoadouts } from '@/lib/destiny/loadoutCompleteness'
import { resolveDefinition } from '@/lib/destiny/manifest'
import type { BuildSnapshot, DestinyCharacterClass } from '@/lib/destiny/types'

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
  characterLoadouts?: {
    data?: Record<
      string,
      {
        loadouts?: Array<{
          nameHash?: number
          items?: Array<{ itemInstanceId?: string; itemHash?: number }>
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

  return map
}

async function resolveLoadoutName(nameHash?: number, index?: number): Promise<string> {
  if (!nameHash) return `Saved loadout ${(index ?? 0) + 1}`
  try {
    const def = await resolveDefinition('DestinyLoadoutNameDefinition', nameHash, 'Loadout')
    if (def.name && def.name !== 'Loadout') return def.name
  } catch {
    /* fallback */
  }
  return `Saved loadout ${(index ?? 0) + 1}`
}

function resolveLoadoutEntries(
  items: Array<{ itemInstanceId?: string; itemHash?: number }>,
  itemIndex: Map<string, ProfileItem>
): ProfileItemEntry[] {
  const entries: ProfileItemEntry[] = []

  for (const entry of items) {
    const indexed = entry.itemInstanceId ? itemIndex.get(entry.itemInstanceId) : undefined
    const itemHash = indexed?.itemHash ?? entry.itemHash
    if (!itemHash) continue

    entries.push({
      itemHash,
      bucketHash: indexed?.bucketHash,
      itemInstanceId: entry.itemInstanceId ?? indexed?.itemInstanceId,
    })
  }

  return entries
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
    const items = loadout?.items ?? []
    if (!items.length) continue

    const name = await resolveLoadoutName(loadout.nameHash, i)
    const entries = resolveLoadoutEntries(items, itemIndex)
    const snapshot = await buildSnapshotFromItemEntries(entries, {
      itemComponents: profile.itemComponents,
      characterClass,
      userId,
      id: `saved-${characterId}-${i}`,
      activityName: name,
      loadoutName: name,
      loadoutIndex: i,
      loadoutSource: 'saved',
    })

    if (snapshot) snapshots.push(snapshot)
  }

  return filterDisplayableSavedLoadouts(snapshots)
}
