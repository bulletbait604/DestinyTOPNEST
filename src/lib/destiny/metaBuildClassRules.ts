import type { ArmorSlotLabel, DestinyCharacterClass, ExternalBuildSource } from '@/lib/destiny/types'

/** Which class can equip each exotic armor piece (June 2026 meta research). */
export const EXOTIC_ARMOR_CLASS: Record<string, DestinyCharacterClass> = {
  'getaway artist': 'warlock',
  'ophidian aspect': 'warlock',
  'starfire protocol': 'warlock',
  'contraverse hold': 'warlock',
  'phoenix protocol': 'warlock',
  'stronghold': 'titan',
  'cuirass of the falling star': 'titan',
  'wormgod caress': 'titan',
  'peacekeepers': 'titan',
  'hallowfire heart': 'titan',
  'gyrfalcon': 'hunter',
  'gifted conviction': 'hunter',
  'raiden flux': 'hunter',
  'star-eater scales': 'hunter',
  'omnioculus': 'hunter',
  'mantle of battle harmony': 'hunter',
}

/** Which armor slot the exotic occupies (legendary slot left empty). */
export const EXOTIC_ARMOR_SLOT: Record<string, ArmorSlotLabel> = {
  'getaway artist': 'gauntlets',
  'ophidian aspect': 'gauntlets',
  'contraverse hold': 'gauntlets',
  'stronghold': 'gauntlets',
  'gyrfalcon': 'chest',
  'gifted conviction': 'chest',
  'cuirass of the falling star': 'chest',
  'wormgod caress': 'chest',
  'starfire protocol': 'chest',
  'raiden flux': 'chest',
  'star-eater scales': 'chest',
  'peacekeepers': 'legs',
  'omnioculus': 'chest',
  'mantle of battle harmony': 'chest',
  'hallowfire heart': 'chest',
  'phoenix protocol': 'chest',
}

/** Default legendary layouts inspired by Blueberries / light.gg dual 2-piece + exotic. */
export const CLASS_LEGENDARY_ARMOR_TEMPLATES: Record<
  DestinyCharacterClass,
  Partial<Record<ArmorSlotLabel, string>>
> = {
  warlock: {
    helmet: 'Resonant Fury Plate',
    gauntlets: 'Fused Aurum Plate',
    chest: 'Promised Reign Vest',
    legs: 'Untethered Edge Plate',
    class: "Temptation's Bond",
  },
  titan: {
    helmet: 'Moonfang-X7 Rig',
    gauntlets: 'Bushido Plate',
    chest: "Willbreaker's Resolve",
    legs: 'Untethered Edge Plate',
    class: 'Mark of the Unassailable',
  },
  hunter: {
    helmet: 'Twofold Crown Plate',
    gauntlets: 'Bushido Plate',
    chest: "Willbreaker's Resolve",
    legs: 'Untethered Edge Plate',
    class: 'Reverie Dawn Plate',
  },
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase()
}

export function exoticArmorClass(exoticName?: string): DestinyCharacterClass | undefined {
  if (!exoticName?.trim()) return undefined
  return EXOTIC_ARMOR_CLASS[normalizeKey(exoticName)]
}

export function exoticArmorOccupiesSlot(exoticName?: string, slot?: ArmorSlotLabel): boolean {
  if (!exoticName?.trim() || !slot) return false
  return EXOTIC_ARMOR_SLOT[normalizeKey(exoticName)] === slot
}

export function inferArmorSlotFromName(name: string): ArmorSlotLabel | undefined {
  const n = name.toLowerCase()
  if (/\bbond\b/.test(n)) return 'class'
  if (/\bmark\b/.test(n)) return 'class'
  if (/\bcloak\b/.test(n)) return 'class'
  if (/rig\b|crown|helm|hood|mask|cover/.test(n)) return 'helmet'
  if (/vest|cuirass|robe|chestrig|mail|chest|resolve/.test(n)) return 'chest'
  if (/greave|boot|edge plate|stride|tasset|leg/.test(n)) return 'legs'
  if (/glove|gauntlet|plate\b|grasp|wraps|aurum/.test(n)) return 'gauntlets'
  return undefined
}

export function isClassItemForClass(name: string, characterClass: DestinyCharacterClass): boolean {
  const n = name.toLowerCase()
  if (characterClass === 'warlock') return /\bbond\b/.test(n)
  if (characterClass === 'titan') return /\bmark\b/.test(n)
  if (characterClass === 'hunter') return /\bcloak\b/.test(n) || /reverie dawn plate/i.test(n)
  return true
}

export function isArmorNameValidForClass(
  name: string,
  characterClass: DestinyCharacterClass,
  slot: ArmorSlotLabel
): boolean {
  const inferred = inferArmorSlotFromName(name)
  if (inferred && inferred !== slot) return false

  if (slot === 'class' && !isClassItemForClass(name, characterClass)) return false
  if (slot !== 'class') {
    if (/\bbond\b/.test(name.toLowerCase()) && characterClass !== 'warlock') return false
    if (/\bmark\b/.test(name.toLowerCase()) && characterClass !== 'titan') return false
    if (/\bcloak\b/.test(name.toLowerCase()) && characterClass !== 'hunter') return false
  }

  return true
}

/** Assign class-correct legendary armor; skip the slot taken by exotic armor. */
export function legendaryArmorForMetaBuild(
  build: Pick<ExternalBuildSource, 'class' | 'exoticArmor' | 'id' | 'legendaryArmor'>
): Partial<Record<ArmorSlotLabel, string>> {
  const template = { ...CLASS_LEGENDARY_ARMOR_TEMPLATES[build.class] }
  const patch = build.legendaryArmor ?? {}
  const exoticSlot = build.exoticArmor ? EXOTIC_ARMOR_SLOT[normalizeKey(build.exoticArmor)] : undefined

  const merged: Partial<Record<ArmorSlotLabel, string>> = { ...template }

  for (const [slot, name] of Object.entries(patch) as [ArmorSlotLabel, string][]) {
    if (!name?.trim()) continue
    if (isArmorNameValidForClass(name, build.class, slot)) {
      merged[slot] = name
    }
  }

  if (exoticSlot) delete merged[exoticSlot]

  const sanitized: Partial<Record<ArmorSlotLabel, string>> = {}
  for (const [slot, name] of Object.entries(merged) as [ArmorSlotLabel, string][]) {
    if (!name?.trim()) continue
    if (isArmorNameValidForClass(name, build.class, slot)) {
      sanitized[slot] = name
    }
  }

  return sanitized
}

export function validateMetaBuildIntegrity(build: ExternalBuildSource): string[] {
  const issues: string[] = []
  const exoticClass = exoticArmorClass(build.exoticArmor)
  if (exoticClass && exoticClass !== build.class) {
    issues.push(`${build.exoticArmor} is ${exoticClass} exotic armor — cannot equip on ${build.class}.`)
  }

  for (const [slot, name] of Object.entries(build.legendaryArmor ?? {}) as [ArmorSlotLabel, string][]) {
    if (!name?.trim()) continue
    if (!isArmorNameValidForClass(name, build.class, slot)) {
      issues.push(`${name} is not valid ${build.class} ${slot} armor.`)
    }
  }

  return issues
}

export function isValidMetaBuild(build: ExternalBuildSource): boolean {
  return validateMetaBuildIntegrity(build).length === 0
}
