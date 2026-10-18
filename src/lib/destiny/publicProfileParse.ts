import { buildBungieIconUrl } from '@/lib/destiny/bungieUrls'
import type { GuardianCharacterCard } from '@/lib/destiny/guardianDirectory'

const CLASS_BY_TYPE: Record<number, string> = {
  0: 'titan',
  1: 'hunter',
  2: 'warlock',
}

/** Kinetic, energy, and power weapon buckets. */
const WEAPON_BUCKETS = new Set([1498876634, 2465295065, 953998645])

interface RawItem {
  itemHash?: number | string
  bucketHash?: number | string
}

interface RawCharacter {
  characterId?: string
  classType?: number
  light?: number
  emblemPath?: string
  dateLastPlayed?: string
}

export interface ParsedWeaponSlot {
  characterId: string
  itemHash: number
}

export interface ParsedPublicPresentation {
  displayName?: string
  characters: GuardianCharacterCard[]
  equippedHashes: ParsedWeaponSlot[]
  vaultHashes: number[]
}

function asNumber(value: number | string | undefined): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && /^\d+$/.test(value)) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

function itemsOf(value: unknown): RawItem[] {
  if (!value || typeof value !== 'object') return []
  const items = (value as { items?: RawItem[] }).items
  return Array.isArray(items) ? items : []
}

/** Pull public character cards and gear hashes out of a Bungie profile response. */
export function parsePublicPresentation(profile: unknown): ParsedPublicPresentation {
  const root = (profile ?? {}) as {
    profile?: { data?: { userInfo?: { bungieGlobalDisplayName?: string; displayName?: string } } }
    characters?: { data?: Record<string, RawCharacter> }
    characterEquipment?: { data?: Record<string, { items?: RawItem[] }> }
    profileInventory?: { data?: { items?: RawItem[] } }
  }

  const userInfo = root.profile?.data?.userInfo
  const displayName = userInfo?.bungieGlobalDisplayName || userInfo?.displayName
  const charactersRaw = root.characters?.data ?? {}
  const characters: GuardianCharacterCard[] = Object.entries(charactersRaw)
    .map(([id, character]) => ({
      characterId: character.characterId || id,
      className: CLASS_BY_TYPE[character.classType ?? -1] ?? 'guardian',
      power: typeof character.light === 'number' ? character.light : undefined,
      emblemUrl: buildBungieIconUrl(character.emblemPath),
      lastPlayed: character.dateLastPlayed,
    }))
    .sort((a, b) => (b.power ?? 0) - (a.power ?? 0))

  const equippedHashes: ParsedWeaponSlot[] = []
  const equipment = root.characterEquipment?.data ?? {}
  for (const [characterId, block] of Object.entries(equipment)) {
    for (const item of itemsOf(block)) {
      const bucket = asNumber(item.bucketHash)
      const hash = asNumber(item.itemHash)
      if (!bucket || !hash || !WEAPON_BUCKETS.has(bucket)) continue
      equippedHashes.push({ characterId, itemHash: hash })
    }
  }

  const vaultHashes: number[] = []
  for (const item of itemsOf(root.profileInventory?.data)) {
    const hash = asNumber(item.itemHash)
    if (!hash || vaultHashes.includes(hash)) continue
    vaultHashes.push(hash)
    if (vaultHashes.length >= 6) break
  }

  return { displayName, characters, equippedHashes, vaultHashes }
}

/** Historical raid/dungeon clears from GetHistoricalStats, with or without a results wrapper. */
export function readModeClears(modes: unknown, mode: 'raid' | 'dungeon'): number | undefined {
  if (!modes || typeof modes !== 'object') return undefined
  const root = modes as { results?: Record<string, unknown> }
  const table = (root.results ?? modes) as Record<string, { allTime?: { activitiesCleared?: { basic?: { value?: number } } } }>
  const value = table[mode]?.allTime?.activitiesCleared?.basic?.value
  return typeof value === 'number' ? value : undefined
}
