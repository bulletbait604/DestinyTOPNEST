import type {
  CharacterSummary,
  DestinyCharacterClass,
  InGameLoadoutSummary,
  InventoryItemSummary,
} from '@/lib/destiny/types'

const CLASS_LABEL = ['Titan', 'Hunter', 'Warlock'] as const
const CLASS_KEY: DestinyCharacterClass[] = ['titan', 'hunter', 'warlock']

/** Equipment bucket hashes from DestinyInventoryBucketDefinition, plus aliases already used in this app. */
const SLOT_BY_BUCKET: Record<number, string> = {
  1498876634: 'kinetic',
  2465295065: 'energy',
  953998645: 'power',
  3284755031: 'subclass',
  3448274439: 'helmet',
  3551918588: 'gauntlets',
  14239492: 'chest',
  20886954: 'legs',
  1585787867: 'class',
  2280036563: 'class',
}

const WEAPON_SLOTS = new Set(['kinetic', 'energy', 'power'])
const ARMOR_SLOTS = new Set(['helmet', 'gauntlets', 'chest', 'legs', 'class'])

export interface SnapshotItemDef {
  name: string
  iconUrl?: string
  tier?: string
  itemType?: string
  exotic?: boolean
}

export interface ProfileSnapshotCatalogs {
  loadoutNames?: Record<number, string>
  items?: Record<number, SnapshotItemDef>
}

type RawItem = {
  itemHash?: unknown
  itemInstanceId?: unknown
  bucketHash?: unknown
  plugItemHashes?: unknown
}

type RawProfile = {
  characters?: { data?: Record<string, { classType?: unknown; light?: unknown; emblemPath?: unknown }> }
  characterEquipment?: { data?: Record<string, { items?: RawItem[] }> }
  characterInventories?: { data?: Record<string, { items?: RawItem[] }> }
  profileInventories?: { data?: Record<string, { items?: RawItem[] }> }
  profileInventory?: { data?: { items?: RawItem[] } }
  characterLoadouts?: {
    data?: Record<
      string,
      {
        loadouts?: Array<{
          nameHash?: unknown
          iconHash?: unknown
          colorHash?: unknown
          items?: Array<{ itemInstanceId?: unknown; itemHash?: unknown; plugItemHashes?: unknown }>
        }>
      }
    >
  }
  itemComponents?: {
    sockets?: { data?: Record<string, { sockets?: Array<{ plugHash?: unknown }> }> }
  }
}

export interface EquippedLoadoutCard {
  characterId: string
  classType: InGameLoadoutSummary['classType']
  name: string
  subclass?: string
  exoticArmor?: string
  exoticWeapon?: string
  weapons: string[]
  armor: string[]
  aspects?: string[]
  fragments?: string[]
  mods?: string[]
  items: InventoryItemSummary[]
}

export interface DestinyProfileSnapshot {
  characters: Array<CharacterSummary & { equipped?: EquippedLoadoutCard; inGameLoadouts: InGameLoadoutSummary[] }>
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && /^\d+$/.test(value)) return Number(value)
  return undefined
}

function asText(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function itemDef(hash: number, catalogs?: ProfileSnapshotCatalogs): SnapshotItemDef {
  return catalogs?.items?.[hash] ?? { name: `Item ${hash}` }
}

function plugKind(def: SnapshotItemDef): 'aspect' | 'fragment' | 'mod' | null {
  const kind = `${def.itemType ?? ''} ${def.name}`.toLowerCase()
  if (kind.includes('aspect')) return 'aspect'
  if (kind.includes('fragment')) return 'fragment'
  if (kind.includes('mod')) return 'mod'
  return null
}

function indexItems(profile: RawProfile): Map<string, RawItem> {
  const map = new Map<string, RawItem>()
  const add = (items?: RawItem[]) => {
    for (const item of items ?? []) {
      const id = asText(item.itemInstanceId).trim()
      if (id && !map.has(id)) map.set(id, item)
    }
  }
  for (const row of Object.values(profile.characterEquipment?.data ?? {})) add(row.items)
  for (const row of Object.values(profile.characterInventories?.data ?? {})) add(row.items)
  for (const row of Object.values(profile.profileInventories?.data ?? {})) add(row.items)
  add(profile.profileInventory?.data?.items)
  return map
}

function plugHashes(
  entry: { itemInstanceId?: unknown; plugItemHashes?: unknown },
  profile: RawProfile
): number[] {
  const listed = Array.isArray(entry.plugItemHashes) ? entry.plugItemHashes : []
  const hashes = listed.map(asNumber).filter((hash): hash is number => Boolean(hash))
  if (hashes.length) return hashes
  const instanceId = asText(entry.itemInstanceId).trim()
  const sockets = instanceId ? profile.itemComponents?.sockets?.data?.[instanceId]?.sockets : undefined
  return (sockets ?? []).map((socket) => asNumber(socket.plugHash)).filter((hash): hash is number => Boolean(hash))
}

function summarizeItems(
  entries: Array<{ itemInstanceId?: unknown; itemHash?: unknown; plugItemHashes?: unknown }>,
  items: Map<string, RawItem>,
  profile: RawProfile,
  catalogs?: ProfileSnapshotCatalogs
): { items: InventoryItemSummary[]; aspects: string[]; fragments: string[]; mods: string[] } {
  const summarized: InventoryItemSummary[] = []
  const aspects: string[] = []
  const fragments: string[] = []
  const mods: string[] = []
  for (const entry of entries) {
    const instanceId = asText(entry.itemInstanceId).trim()
    const indexed = instanceId ? items.get(instanceId) : undefined
    const itemHash = asNumber(indexed?.itemHash) ?? asNumber(entry.itemHash)
    if (!itemHash) continue
    const bucket = asNumber(indexed?.bucketHash)
    const slot = bucket != null ? SLOT_BY_BUCKET[bucket] : undefined
    const def = itemDef(itemHash, catalogs)
    const exotic = Boolean(def.exotic) || (def.tier ?? '').toLowerCase() === 'exotic'
    summarized.push({
      itemHash,
      itemInstanceId: instanceId || undefined,
      name: def.name,
      iconUrl: def.iconUrl,
      slot,
      tier: def.tier,
      exotic,
    })
    for (const plugHash of plugHashes(entry, profile)) {
      const plug = itemDef(plugHash, catalogs)
      const kind = plugKind(plug)
      if (kind === 'aspect') aspects.push(plug.name)
      else if (kind === 'fragment') fragments.push(plug.name)
      else if (kind === 'mod') mods.push(plug.name)
    }
  }
  return { items: summarized, aspects, fragments, mods }
}

function namesFor(items: InventoryItemSummary[], slots: Set<string>): string[] {
  return items.filter((item) => item.slot && slots.has(item.slot)).map((item) => item.name)
}

function exoticNamed(items: InventoryItemSummary[], slots: Set<string>): string | undefined {
  return items.find((item) => item.exotic && item.slot && slots.has(item.slot))?.name
}

function loadoutName(nameHash: number | undefined, index: number, catalogs?: ProfileSnapshotCatalogs): string {
  const resolved = nameHash ? catalogs?.loadoutNames?.[nameHash]?.trim() : ''
  if (resolved && !/^loadout$/i.test(resolved)) return resolved
  return `Loadout ${index + 1}`
}

/** Characters plus every non-empty in-game loadout. Item names come from `catalogs` when the manifest is not consulted. */
export function buildProfileSnapshot(profile: unknown, catalogs?: ProfileSnapshotCatalogs): DestinyProfileSnapshot {
  const root = (profile ?? {}) as RawProfile
  const items = indexItems(root)
  const characters = Object.entries(root.characters?.data ?? {}).map(([id, character]) => {
    const characterId = id
    const classIndex = asNumber(character.classType) ?? 1
    const classType = CLASS_LABEL[classIndex] ?? 'Hunter'
    const characterClass = CLASS_KEY[classIndex] ?? 'hunter'
    const equippedItems = root.characterEquipment?.data?.[characterId]?.items ?? []
    const equippedSummary = summarizeItems(equippedItems, items, root, catalogs)
    const equipped: EquippedLoadoutCard | undefined = equippedSummary.items.length
      ? {
          characterId,
          classType,
          name: 'Currently Equipped',
          subclass: equippedSummary.items.find((item) => item.slot === 'subclass')?.name,
          exoticArmor: exoticNamed(equippedSummary.items, ARMOR_SLOTS),
          exoticWeapon: exoticNamed(equippedSummary.items, WEAPON_SLOTS),
          weapons: namesFor(equippedSummary.items, WEAPON_SLOTS),
          armor: namesFor(equippedSummary.items, ARMOR_SLOTS),
          aspects: equippedSummary.aspects,
          fragments: equippedSummary.fragments,
          mods: equippedSummary.mods,
          items: equippedSummary.items,
        }
      : undefined

    const slots = root.characterLoadouts?.data?.[characterId]?.loadouts ?? []
    const inGameLoadouts: InGameLoadoutSummary[] = []
    slots.forEach((slot, index) => {
      const summarized = summarizeItems(slot.items ?? [], items, root, catalogs)
      if (!summarized.items.length) return
      const subclass = summarized.items.find((item) => item.slot === 'subclass')?.name
      inGameLoadouts.push({
        index,
        name: loadoutName(asNumber(slot.nameHash), index, catalogs),
        characterId,
        classType,
        subclass,
        exoticArmor: exoticNamed(summarized.items, ARMOR_SLOTS),
        exoticWeapon: exoticNamed(summarized.items, WEAPON_SLOTS),
        weapons: namesFor(summarized.items, WEAPON_SLOTS),
        armor: namesFor(summarized.items, ARMOR_SLOTS),
        aspects: summarized.aspects,
        fragments: summarized.fragments,
        mods: summarized.mods,
        items: summarized.items,
      })
    })

    return {
      characterId,
      characterClass,
      powerLevel: asNumber(character.light) ?? 0,
      equipped,
      inGameLoadouts,
    }
  })

  return { characters }
}

/** Publishable shape for the equipped card, using the same fields as a saved in-game slot. */
export function equippedToInGameLoadout(card: EquippedLoadoutCard): InGameLoadoutSummary {
  return {
    index: 0,
    name: card.name || 'Currently Equipped',
    characterId: card.characterId,
    classType: card.classType,
    subclass: card.subclass,
    exoticArmor: card.exoticArmor,
    exoticWeapon: card.exoticWeapon,
    weapons: card.weapons,
    armor: card.armor,
    aspects: card.aspects,
    fragments: card.fragments,
    mods: card.mods,
    items: card.items,
  }
}

/** Hashes the snapshot still needs from the manifest. */
export function unresolvedSnapshotHashes(profile: unknown): { items: number[]; loadoutNames: number[] } {
  const root = (profile ?? {}) as RawProfile
  const items = new Set<number>()
  const loadoutNames = new Set<number>()
  const consider = (item: RawItem) => {
    const hash = asNumber(item.itemHash)
    if (hash) items.add(hash)
    for (const plug of Array.isArray(item.plugItemHashes) ? item.plugItemHashes : []) {
      const plugHash = asNumber(plug)
      if (plugHash) items.add(plugHash)
    }
  }
  for (const row of Object.values(root.characterEquipment?.data ?? {})) for (const item of row.items ?? []) consider(item)
  for (const row of Object.values(root.characterInventories?.data ?? {})) for (const item of row.items ?? []) consider(item)
  for (const row of Object.values(root.profileInventories?.data ?? {})) for (const item of row.items ?? []) consider(item)
  for (const item of root.profileInventory?.data?.items ?? []) consider(item)
  for (const row of Object.values(root.itemComponents?.sockets?.data ?? {})) {
    for (const socket of row.sockets ?? []) {
      const plugHash = asNumber(socket.plugHash)
      if (plugHash) items.add(plugHash)
    }
  }
  for (const row of Object.values(root.characterLoadouts?.data ?? {})) {
    for (const slot of row.loadouts ?? []) {
      const nameHash = asNumber(slot.nameHash)
      if (nameHash) loadoutNames.add(nameHash)
      for (const entry of slot.items ?? []) {
        const listed = Array.isArray(entry.plugItemHashes) ? entry.plugItemHashes : []
        for (const plug of listed) {
          const plugHash = asNumber(plug)
          if (plugHash) items.add(plugHash)
        }
      }
    }
  }
  return { items: Array.from(items), loadoutNames: Array.from(loadoutNames) }
}
