const CLASS_BY_TYPE: Record<number, string> = {
  0: 'titan',
  1: 'hunter',
  2: 'warlock',
}

const BUCKETS: Record<number, string> = {
  1498876634: 'kinetic',
  2465295065: 'energy',
  953998645: 'power',
  3284755031: 'subclass',
  14239492: 'helmet',
  3551918588: 'gauntlets',
  20886954: 'chest',
  1585787867: 'legs',
  2280036563: 'class',
}

export interface EquippedSlot {
  bucket: string
  itemHash: number
}

export interface EquippedCharacter {
  characterId: string
  className: string
  power?: number
  slots: EquippedSlot[]
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && /^\d+$/.test(value)) return Number(value)
  return undefined
}

/** Pull weapon, armor, and subclass hashes from a public character-equipment profile. */
export function parseEquippedCharacters(profile: unknown): EquippedCharacter[] {
  const root = (profile ?? {}) as {
    characters?: { data?: Record<string, { characterId?: string; classType?: number; light?: number }> }
    characterEquipment?: {
      data?: Record<string, { items?: Array<{ itemHash?: number | string; bucketHash?: number | string }> }>
    }
  }
  const characters = root.characters?.data ?? {}
  const equipment = root.characterEquipment?.data ?? {}
  return Object.entries(characters)
    .map(([id, character]) => {
      const slots: EquippedSlot[] = []
      for (const item of equipment[id]?.items ?? []) {
        const bucket = BUCKETS[asNumber(item.bucketHash) ?? -1]
        const itemHash = asNumber(item.itemHash)
        if (!bucket || !itemHash) continue
        slots.push({ bucket, itemHash })
      }
      return {
        characterId: character.characterId || id,
        className: CLASS_BY_TYPE[character.classType ?? -1] ?? 'guardian',
        power: character.light,
        slots,
      }
    })
    .filter((character) => character.slots.length > 0)
    .sort((a, b) => (b.power ?? 0) - (a.power ?? 0))
}
