/**
 * Parse live character build from Bungie (subclass, aspects, fragments, abilities, armor stats).
 */

import { getCharacterLoadout } from '@/lib/destiny/bungieClient'
import { buildBungieIconUrl } from '@/lib/destiny/bungieUrls'
import { resolveInventoryItem, resolveDefinition, type ManifestDefinitionInfo } from '@/lib/destiny/manifest'
import type { ArmorPiece, ArmorSlotLabel, BuildSnapshot, DestinyCharacterClass, DestinyIconRef } from '@/lib/destiny/types'
import { ARMOR_STAT_HASH_LABEL } from '@/lib/destiny/armorStats'

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

type PlugCategory = 'super' | 'class' | 'jump' | 'melee' | 'grenade' | 'aspect' | 'fragment' | 'other'

function iconRefFromInfo(info: ManifestDefinitionInfo): DestinyIconRef {
  return {
    name: info.name,
    hash: info.hash,
    iconUrl: info.iconUrl,
    tierLabel: info.tierLabel,
    entityType: info.entityType,
  }
}

const WEAPON_PERK_SKIP =
  /shader|ornament|weapon mod|mod socket|masterwork|intrinsic|tracker|default|ghost|emote|projection/i

function isWeaponPerkPlug(info: ManifestDefinitionInfo): boolean {
  const type = (info.itemTypeDisplayName ?? '').toLowerCase()
  const name = info.name.toLowerCase()
  if (!type && !name) return false
  if (WEAPON_PERK_SKIP.test(type) || WEAPON_PERK_SKIP.test(name)) return false
  return /perk|trait/i.test(type)
}

function isArmorModPlug(info: ManifestDefinitionInfo): boolean {
  const type = (info.itemTypeDisplayName ?? '').toLowerCase()
  const name = info.name.toLowerCase()
  if (WEAPON_PERK_SKIP.test(type) || WEAPON_PERK_SKIP.test(name)) return false
  return /armor mod|combat style|activity mod|raid mod|dungeon mod|ghost mod|^mod\b/i.test(type)
}

async function resolveArmorMods(
  itemInstanceId: string | undefined,
  socketsData?: Record<
    string,
    { sockets?: Array<{ plugHash?: number; isEnabled?: boolean; isVisible?: boolean }> }
  >
): Promise<DestinyIconRef[]> {
  if (!itemInstanceId) return []
  const sockets = socketsData?.[itemInstanceId]?.sockets ?? []
  const mods: DestinyIconRef[] = []

  for (const socket of sockets) {
    if (!socket.plugHash || socket.isEnabled === false) continue
    const info = await resolveInventoryItem(socket.plugHash, 'Mod')
    if (!isArmorModPlug(info)) continue
    mods.push(iconRefFromInfo(info))
  }

  return mods
}

async function resolveWeaponPerks(
  itemInstanceId: string | undefined,
  socketsData?: Record<
    string,
    { sockets?: Array<{ plugHash?: number; isEnabled?: boolean; isVisible?: boolean }> }
  >
): Promise<DestinyIconRef[]> {
  if (!itemInstanceId) return []
  const sockets = socketsData?.[itemInstanceId]?.sockets ?? []
  const perks: DestinyIconRef[] = []

  for (const socket of sockets) {
    if (!socket.plugHash || socket.isEnabled === false) continue
    const info = await resolveInventoryItem(socket.plugHash, 'Perk')
    if (!isWeaponPerkPlug(info)) continue
    perks.push(iconRefFromInfo(info))
  }

  return perks
}

function categorizePlug(info: ManifestDefinitionInfo): PlugCategory {
  const type = (info.itemTypeDisplayName ?? '').toLowerCase()
  const name = info.name.toLowerCase()
  if (type.includes('super') || /\bsuper\b/.test(name)) return 'super'
  if (type.includes('aspect') || name.includes('aspect')) return 'aspect'
  if (type.includes('fragment') || name.includes('fragment')) return 'fragment'
  if (type.includes('melee') || type.includes('melee ability')) return 'melee'
  if (type.includes('grenade') || type.includes('grenade ability')) return 'grenade'
  if (
    type.includes('class ability') ||
    type.includes('barricade') ||
    type.includes('rift') ||
    type.includes('dodge')
  ) {
    return 'class'
  }
  if (
    type.includes('movement') ||
    type.includes('jump') ||
    type.includes('lift') ||
    type.includes('glide') ||
    type.includes('stride')
  ) {
    return 'jump'
  }
  if (/barricade|rift|dodge|sentinel shield|healing rift/i.test(name)) return 'class'
  if (/hammer|knife|palm|staff|axe|glaive|throwing knife/i.test(name)) return 'melee'
  if (/grenade|flashbang|tripmine|incendiary|vortex|void wall|duskfield|storm/i.test(name)) return 'grenade'
  if (/high lift|strafe|triple|burst|balanced|strafe glide|controlled/i.test(name)) return 'jump'
  return 'other'
}

async function resolvePlug(plugHash: number): Promise<{ ref: DestinyIconRef; category: PlugCategory }> {
  let info = await resolveInventoryItem(plugHash, 'Ability')
  if (!info.iconUrl) {
    try {
      const perkInfo = await resolveDefinition('DestinySandboxPerkDefinition', plugHash, info.name)
      if (perkInfo.iconUrl) info = perkInfo
    } catch {
      /* keep inventory resolution */
    }
  }
  return { ref: iconRefFromInfo(info), category: categorizePlug(info) }
}

function isSubclassItem(info: ManifestDefinitionInfo): boolean {
  const type = (info.itemTypeDisplayName ?? '').toLowerCase()
  return type.includes('subclass') || type.includes('guardian subclass')
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
  if (
    !/weapon|rifle|bow|launcher|shotgun|sidearm|machine gun|sword|glaive|cannon|trace|scout|pulse|hand cannon|auto rifle|submachine|linear|rocket|grenade|sniper|fusion|heavy|power|smg|lmg|sniper rifle|fusion rifle|trace rifle|linear fusion|rocket launcher|grenade launcher|machine gun|combat bow|hand cannon|sidearm|scout rifle|pulse rifle|auto rifle|submachine gun|sword|glaive|drum|staff|axe|hammer|blade|spear/i.test(
      type
    )
  ) {
    return undefined
  }
  if (!filled.kinetic) return 'kinetic'
  if (!filled.energy) return 'energy'
  if (!filled.power) return 'power'
  return undefined
}

function bucketForArmorSlot(slot: ArmorSlotLabel): number | undefined {
  const entry = Object.entries(ARMOR_BUCKETS).find(([, label]) => label === slot)
  return entry ? Number(entry[0]) : undefined
}

function bucketForWeaponSlot(slot: 'kinetic' | 'energy' | 'power'): number | undefined {
  const entry = Object.entries(WEAPON_BUCKETS).find(([, label]) => label === slot)
  return entry ? Number(entry[0]) : undefined
}

export type ProfileItemEntry = {
  itemHash?: number
  bucketHash?: number
  itemInstanceId?: string
}

export type BuildProfileComponents = {
  stats?: { data?: Record<string, { stats?: Record<string, { value?: number }> }> }
  sockets?: {
    data?: Record<
      string,
      { sockets?: Array<{ plugHash?: number; isEnabled?: boolean; isVisible?: boolean }> }
    >
  }
}

/** Build a full snapshot (stats, mods, abilities) from profile item entries. */
export async function buildSnapshotFromItemEntries(
  items: ProfileItemEntry[],
  options: {
    itemComponents?: BuildProfileComponents
    characterClass: DestinyCharacterClass
    userId: string
    id: string
    activityName: string
    loadoutName?: string
    loadoutIndex?: number
    loadoutSource?: BuildSnapshot['loadoutSource']
  }
): Promise<BuildSnapshot | null> {
  const weapons: Record<string, string> = {}
  let exoticArmor = '—'
  let exoticArmorRef: DestinyIconRef | undefined
  let exoticWeapon: string | undefined
  let exoticWeaponRef: DestinyIconRef | undefined
  let kineticWeaponRef: DestinyIconRef | undefined
  let energyWeaponRef: DestinyIconRef | undefined
  let powerWeaponRef: DestinyIconRef | undefined
  let kineticInstanceId: string | undefined
  let energyInstanceId: string | undefined
  let powerInstanceId: string | undefined
  let subclass = 'Subclass'
  let subclassRef: DestinyIconRef | undefined
  const aspects: string[] = []
  const aspectRefs: DestinyIconRef[] = []
  const fragments: string[] = []
  const fragmentRefs: DestinyIconRef[] = []
  const plugsByCategory: Partial<Record<PlugCategory, DestinyIconRef>> = {}
  const stats: Record<string, number> = {}
  const armorPieces: ArmorPiece[] = []
  const armorModNames: string[] = []
  const weaponFilled: Partial<Record<'kinetic' | 'energy' | 'power', boolean>> = {}
  const socketsData = options.itemComponents?.sockets?.data
  const statsData = options.itemComponents?.stats?.data

  for (const item of items) {
    if (!item.itemHash) continue
    const itemInfo = await resolveInventoryItem(item.itemHash, `Item ${item.itemHash}`)
    let bucket = item.bucketHash

    if (!bucket) {
      if (isSubclassItem(itemInfo)) {
        bucket = SUBCLASS_BUCKET
      } else {
        const armorSlot = inferArmorSlot(itemInfo)
        if (armorSlot) bucket = bucketForArmorSlot(armorSlot)
        else {
          const weaponSlot = inferWeaponSlot(itemInfo, weaponFilled)
          if (weaponSlot) {
            bucket = bucketForWeaponSlot(weaponSlot)
            weaponFilled[weaponSlot] = true
          }
        }
      }
    }

    if (!bucket) continue

    const name = itemInfo.name
    const ref = iconRefFromInfo(itemInfo)
    const isExotic = (itemInfo.tierLabel ?? '').toLowerCase().includes('exotic')

    if (bucket === SUBCLASS_BUCKET) {
      subclass = name
      subclassRef = ref

      const socketRow = socketsData?.[item.itemInstanceId ?? '']
      for (const socket of socketRow?.sockets ?? []) {
        if (!socket.plugHash) continue
        const { ref: plugRef, category } = await resolvePlug(socket.plugHash)
        if (category === 'aspect') {
          const clean = plugRef.name.replace(/ aspect$/i, '')
          aspects.push(clean)
          aspectRefs.push({ ...plugRef, name: clean })
        } else if (category === 'fragment') {
          const clean = plugRef.name.replace(/ fragment$/i, '')
          fragments.push(clean)
          fragmentRefs.push({ ...plugRef, name: clean })
        } else if (category !== 'other' && !plugsByCategory[category]) {
          plugsByCategory[category] = plugRef
        }
      }
    } else if (WEAPON_BUCKETS[bucket]) {
      const slot = WEAPON_BUCKETS[bucket]
      weapons[slot] = name
      weaponFilled[slot] = true
      if (slot === 'kinetic') {
        kineticWeaponRef = ref
        kineticInstanceId = item.itemInstanceId
      }
      if (slot === 'energy') {
        energyWeaponRef = ref
        energyInstanceId = item.itemInstanceId
      }
      if (slot === 'power') {
        powerWeaponRef = ref
        powerInstanceId = item.itemInstanceId
      }
      if (isExotic) {
        exoticWeapon = name
        exoticWeaponRef = ref
      }
    } else if (ARMOR_BUCKETS[bucket]) {
      const slot = ARMOR_BUCKETS[bucket]
      if (isExotic && slot !== 'class') {
        exoticArmor = name
        exoticArmorRef = ref
      }
      const pieceMods = await resolveArmorMods(item.itemInstanceId, socketsData)
      for (const mod of pieceMods) {
        if (!armorModNames.includes(mod.name)) armorModNames.push(mod.name)
      }
      armorPieces.push({
        slot,
        name,
        ref,
        mods: pieceMods,
        isExotic,
        itemHash: item.itemHash,
      })
      const statRow = statsData?.[item.itemInstanceId ?? '']
      if (statRow?.stats) {
        for (const [hash, val] of Object.entries(statRow.stats)) {
          const label = ARMOR_STAT_HASH_LABEL[Number(hash)] ?? hash
          stats[label] = (stats[label] ?? 0) + (val.value ?? 0)
        }
      }
    }
  }

  if (!Object.keys(weapons).length && !armorPieces.length && subclass === 'Subclass') {
    return null
  }

  const slotOrder: ArmorSlotLabel[] = ['helmet', 'gauntlets', 'chest', 'legs', 'class']
  armorPieces.sort((a, b) => slotOrder.indexOf(a.slot) - slotOrder.indexOf(b.slot))

  const [kineticWeaponPerks, energyWeaponPerks, powerWeaponPerks] = await Promise.all([
    resolveWeaponPerks(kineticInstanceId, socketsData),
    resolveWeaponPerks(energyInstanceId, socketsData),
    resolveWeaponPerks(powerInstanceId, socketsData),
  ])

  const superRef = plugsByCategory.super
  const classAbilityRef = plugsByCategory.class
  const jumpRef = plugsByCategory.jump
  const meleeRef = plugsByCategory.melee
  const grenadeRef = plugsByCategory.grenade

  const superAbility = superRef?.name ?? '—'
  const classAbility = classAbilityRef?.name ?? '—'
  const jump = jumpRef?.name ?? '—'
  const melee = meleeRef?.name ?? '—'
  const grenade = grenadeRef?.name ?? '—'

  return {
    id: options.id,
    runId: '',
    userId: options.userId,
    characterClass: options.characterClass,
    subclass,
    super: superAbility,
    aspects: aspects.slice(0, 2),
    fragments: fragments.slice(0, 5),
    abilities: [superAbility, classAbility, jump, melee, grenade].filter((a) => a !== '—'),
    exoticArmor,
    exoticWeapon,
    armorPieces,
    kineticWeapon: weapons.kinetic ?? '—',
    energyWeapon: weapons.energy ?? '—',
    powerWeapon: weapons.power ?? '—',
    exoticArmorRef,
    exoticWeaponRef,
    kineticWeaponRef,
    energyWeaponRef,
    powerWeaponRef,
    kineticWeaponPerks,
    energyWeaponPerks,
    powerWeaponPerks,
    armorMods: armorModNames,
    artifactPerks: [],
    stats,
    activityId: 0,
    activityName: options.activityName,
    difficulty: 'normal',
    completedAt: new Date().toISOString(),
    durationSeconds: 0,
    deaths: 0,
    fireteamComposition: 'solo',
    subclassRef,
    aspectRefs,
    fragmentRefs,
    superRef,
    classAbilityRef,
    jumpRef,
    meleeRef,
    grenadeRef,
    loadoutName: options.loadoutName,
    loadoutIndex: options.loadoutIndex,
    loadoutSource: options.loadoutSource,
  }
}

export async function fetchCharacterBuild(
  membershipType: number,
  membershipId: string,
  accessToken: string,
  userId: string,
  preferredCharacterId?: string
): Promise<BuildSnapshot | null> {
  const profile = (await getCharacterLoadout(
    membershipType,
    membershipId,
    preferredCharacterId ?? '',
    accessToken
  )) as {
    characters?: { data?: Record<string, { classType?: number; light?: number }> }
    characterEquipment?: {
      data?: Record<string, { items?: Array<{ itemHash?: number; bucketHash?: number; itemInstanceId?: string }> }>
    }
    itemComponents?: {
      stats?: {
        data?: Record<string, { stats?: Record<string, { value?: number }> }>
      }
      sockets?: {
        data?: Record<
          string,
          { sockets?: Array<{ plugHash?: number; isEnabled?: boolean; isVisible?: boolean }> }
        >
      }
    }
  }

  const chars = profile.characters?.data ?? {}
  const characterId =
    preferredCharacterId && chars[preferredCharacterId]
      ? preferredCharacterId
      : Object.entries(chars).sort(([, a], [, b]) => (b.light ?? 0) - (a.light ?? 0))[0]?.[0]

  if (!characterId) return null

  const classType = chars[characterId]?.classType ?? 1
  const characterClass = CLASS_MAP[classType] ?? 'hunter'

  const items = profile.characterEquipment?.data?.[characterId]?.items ?? []
  return buildSnapshotFromItemEntries(items, {
    itemComponents: profile.itemComponents,
    characterClass,
    userId,
    id: `live-${characterId}`,
    activityName: 'Current build',
  })
}

/** Resolve emblem URLs for the active character from a profile payload. */
export function emblemUrlsFromProfile(
  profile: {
    characters?: {
      data?: Record<
        string,
        {
          light?: number
          emblemPath?: string
          emblemBackgroundPath?: string
          emblemColor?: { red?: number; green?: number; blue?: number; alpha?: number }
        }
      >
    }
  },
  characterId: string
): { emblemUrl?: string; emblemBackgroundUrl?: string; emblemColor?: string } {
  const character = profile.characters?.data?.[characterId]
  if (!character) return {}
  const emblemColor = character.emblemColor
    ? `rgba(${character.emblemColor.red ?? 0}, ${character.emblemColor.green ?? 0}, ${character.emblemColor.blue ?? 0}, ${(character.emblemColor.alpha ?? 255) / 255})`
    : undefined
  return {
    emblemUrl: buildBungieIconUrl(character.emblemPath),
    emblemBackgroundUrl: buildBungieIconUrl(character.emblemBackgroundPath),
    emblemColor,
  }
}
