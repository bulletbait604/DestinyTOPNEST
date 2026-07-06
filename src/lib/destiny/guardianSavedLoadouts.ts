/**
 * Parse in-game saved loadouts from Bungie CharacterLoadouts component (206).
 */

import { getCharacterLoadoutProfile } from '@/lib/destiny/bungieClient'
import { resolveDefinition, resolveInventoryItem, type ManifestDefinitionInfo } from '@/lib/destiny/manifest'
import type { ArmorPiece, ArmorSlotLabel, BuildSnapshot, DestinyCharacterClass, DestinyIconRef } from '@/lib/destiny/types'

const CLASS_MAP: Record<number, DestinyCharacterClass> = {
  0: 'titan',
  1: 'hunter',
  2: 'warlock',
}

const WEAPON_BUCKETS: Record<number, 'kinetic' | 'energy' | 'power'> = {
  1498876634: 'kinetic',
  2465295065: 'energy',
  953998645: 'power',
}

const SUBCLASS_BUCKET = 3284755031
const ARMOR_BUCKETS: Record<number, ArmorSlotLabel> = {
  14239492: 'helmet',
  3551918588: 'gauntlets',
  20886954: 'chest',
  1585787867: 'legs',
  2280036563: 'class',
}

type ProfileItem = { itemHash?: number; bucketHash?: number; itemInstanceId?: string }

function iconRef(info: ManifestDefinitionInfo): DestinyIconRef {
  return {
    name: info.name,
    hash: info.hash,
    iconUrl: info.iconUrl,
    tierLabel: info.tierLabel,
    entityType: info.entityType,
  }
}

function indexProfileItems(
  equipment: ProfileItem[],
  inventory: ProfileItem[]
): Map<string, ProfileItem> {
  const map = new Map<string, ProfileItem>()
  for (const item of [...equipment, ...inventory]) {
    if (item.itemInstanceId) map.set(item.itemInstanceId, item)
  }
  return map
}

function inferArmorSlot(info: ManifestDefinitionInfo): ArmorSlotLabel | undefined {
  const type = (info.itemTypeDisplayName ?? '').toLowerCase()
  if (/helmet|helm|hood|mask|hat\b/.test(type)) return 'helmet'
  if (/gauntlet|glove/.test(type)) return 'gauntlets'
  if (/chest|vest|plate|robe|mail/.test(type)) return 'chest'
  if (/leg|boot|greave|tasset/.test(type)) return 'legs'
  if (/class item|mark|bond|cloak|cape/.test(type)) return 'class'
  return undefined
}

function inferWeaponSlot(
  info: ManifestDefinitionInfo,
  filled: Partial<Record<'kinetic' | 'energy' | 'power', boolean>>
): 'kinetic' | 'energy' | 'power' | undefined {
  const type = (info.itemTypeDisplayName ?? '').toLowerCase()
  if (/subclass|emblem|ghost|shader|ornament|consumable|material|mod\b|armor mod/.test(type)) return undefined
  if (!/weapon|rifle|bow|launcher|shotgun|sidearm|machine gun|sword|glaive|cannon|trace|scout|pulse|hand cannon|auto rifle|submachine|linear|rocket|grenade|sniper|fusion|heavy|power|smg|lmg|sniper rifle|fusion rifle|trace rifle|linear fusion|rocket launcher|grenade launcher|machine gun|combat bow|hand cannon|sidearm|scout rifle|pulse rifle|auto rifle|submachine gun|sword|glaive|drum|staff|axe|hammer|blade|staff|spear|staff|staff/i.test(type)) {
    return undefined
  }
  if (!filled.kinetic) return 'kinetic'
  if (!filled.energy) return 'energy'
  if (!filled.power) return 'power'
  return undefined
}

function isSubclassItem(info: ManifestDefinitionInfo): boolean {
  const type = (info.itemTypeDisplayName ?? '').toLowerCase()
  return type.includes('subclass') || type.includes('guardian subclass')
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

async function buildFromLoadoutItems(
  items: Array<{ itemInstanceId?: string; itemHash?: number }>,
  itemIndex: Map<string, ProfileItem>,
  characterClass: DestinyCharacterClass,
  userId: string,
  loadoutName: string,
  loadoutIndex: number
): Promise<BuildSnapshot | null> {
  const weapons: Record<string, string> = {}
  let exoticArmor = '—'
  let exoticArmorRef: DestinyIconRef | undefined
  let exoticWeapon: string | undefined
  let exoticWeaponRef: DestinyIconRef | undefined
  let subclass = 'Subclass'
  let subclassRef: DestinyIconRef | undefined
  const armorPieces: ArmorPiece[] = []
  const weaponRefs: Partial<Record<'kinetic' | 'energy' | 'power', DestinyIconRef>> = {}

  const weaponFilled: Partial<Record<'kinetic' | 'energy' | 'power', boolean>> = {}

  for (const entry of items) {
    const resolved = entry.itemInstanceId
      ? itemIndex.get(entry.itemInstanceId)
      : entry.itemHash
        ? { itemHash: entry.itemHash }
        : undefined
    const hash = resolved?.itemHash ?? entry.itemHash
    if (!hash) continue

    const info = await resolveInventoryItem(hash)
    const ref = iconRef(info)
    let bucket = resolved?.bucketHash
    const isExotic = (info.tierLabel ?? '').toLowerCase().includes('exotic')

    if (!bucket && isSubclassItem(info)) {
      subclass = info.name
      subclassRef = ref
      continue
    }

    if (!bucket) {
      const armorSlot = inferArmorSlot(info)
      if (armorSlot) {
        if (isExotic && armorSlot !== 'class') {
          exoticArmor = info.name
          exoticArmorRef = ref
        }
        armorPieces.push({
          slot: armorSlot,
          name: info.name,
          ref,
          mods: [],
          isExotic,
          itemHash: hash,
        })
        continue
      }

      const weaponSlot = inferWeaponSlot(info, weaponFilled)
      if (weaponSlot) {
        weapons[weaponSlot] = info.name
        weaponRefs[weaponSlot] = ref
        weaponFilled[weaponSlot] = true
        if (isExotic) {
          exoticWeapon = info.name
          exoticWeaponRef = ref
        }
        continue
      }
    }

    if (bucket === SUBCLASS_BUCKET) {
      subclass = info.name
      subclassRef = ref
      continue
    }

    if (bucket && WEAPON_BUCKETS[bucket]) {
      const slot = WEAPON_BUCKETS[bucket]
      weapons[slot] = info.name
      weaponRefs[slot] = ref
      weaponFilled[slot] = true
      if (isExotic) {
        exoticWeapon = info.name
        exoticWeaponRef = ref
      }
      continue
    }

    if (bucket && ARMOR_BUCKETS[bucket]) {
      const slot = ARMOR_BUCKETS[bucket]
      if (isExotic && slot !== 'class') {
        exoticArmor = info.name
        exoticArmorRef = ref
      }
      armorPieces.push({ slot, name: info.name, ref, mods: [], isExotic, itemHash: hash })
    }
  }

  if (!Object.keys(weapons).length && !armorPieces.length && subclass === 'Subclass') {
    return null
  }

  const slotOrder: ArmorSlotLabel[] = ['helmet', 'gauntlets', 'chest', 'legs', 'class']
  armorPieces.sort((a, b) => slotOrder.indexOf(a.slot) - slotOrder.indexOf(b.slot))

  return {
    id: `saved-${loadoutIndex}`,
    runId: '',
    userId,
    characterClass,
    subclass,
    super: '—',
    aspects: [],
    fragments: [],
    abilities: [],
    exoticArmor,
    exoticWeapon,
    armorPieces,
    kineticWeapon: weapons.kinetic ?? '—',
    energyWeapon: weapons.energy ?? '—',
    powerWeapon: weapons.power ?? '—',
    exoticArmorRef,
    exoticWeaponRef,
    kineticWeaponRef: weaponRefs.kinetic,
    energyWeaponRef: weaponRefs.energy,
    powerWeaponRef: weaponRefs.power,
    subclassRef,
    armorMods: [],
    artifactPerks: [],
    stats: {},
    activityId: 0,
    activityName: loadoutName,
    difficulty: 'normal',
    completedAt: new Date().toISOString(),
    durationSeconds: 0,
    deaths: 0,
    fireteamComposition: 'solo',
    loadoutName,
    loadoutIndex,
    loadoutSource: 'saved',
  }
}

export async function fetchSavedLoadouts(
  membershipType: number,
  membershipId: string,
  accessToken: string,
  characterId: string,
  userId: string
): Promise<BuildSnapshot[]> {
  const profile = (await getCharacterLoadoutProfile(membershipType, membershipId, accessToken)) as {
    characters?: { data?: Record<string, { classType?: number }> }
    characterEquipment?: { data?: Record<string, { items?: ProfileItem[] }> }
    characterInventories?: { data?: Record<string, { items?: ProfileItem[] }> }
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
  }

  const classType = profile.characters?.data?.[characterId]?.classType ?? 1
  const characterClass = CLASS_MAP[classType] ?? 'hunter'

  const equipment = profile.characterEquipment?.data?.[characterId]?.items ?? []
  const inventory = profile.characterInventories?.data?.[characterId]?.items ?? []
  const itemIndex = indexProfileItems(equipment, inventory)

  const loadouts = profile.characterLoadouts?.data?.[characterId]?.loadouts ?? []
  const snapshots: BuildSnapshot[] = []

  for (let i = 0; i < loadouts.length; i++) {
    const loadout = loadouts[i]
    const items = loadout?.items ?? []
    if (!items.length) continue

    const name = await resolveLoadoutName(loadout.nameHash, i)
    const snapshot = await buildFromLoadoutItems(items, itemIndex, characterClass, userId, name, i)
    if (snapshot) snapshots.push(snapshot)
  }

  return snapshots
}
