import { RECOMMENDED_ARMOR_SETS } from '@/lib/destiny/destinyBuildKnowledge'
import { getDestinyEntityDefinition } from '@/lib/destiny/bungieClient'
import { destinyApiConfigured } from '@/lib/destiny/env'
import { resolveDefinition, resolveInventoryItem } from '@/lib/destiny/manifest'
import type { ArmorPiece, ArmorSetBonusGroup, DestinyIconRef } from '@/lib/destiny/types'

const ARMOR_SLOT_SUFFIX =
  /\s+(helmet|hood|mask|helm|gauntlets|gloves|arms|plate|chest|cuirass|robe|vest|legs|greaves|strides|boots|bond|mark|cloak|chestrig|rig)$/i

interface EquipableSetPerkTier {
  requiredSetCount: number
  sandboxPerkHash: number
}

interface ResolvedSetDefinition {
  hash: number
  name: string
  iconUrl?: string
  description?: string
  perks: EquipableSetPerkTier[]
}

function inferSetNameFromPiece(name: string): string | undefined {
  const trimmed = name.replace(ARMOR_SLOT_SUFFIX, '').trim()
  return trimmed.length >= 2 ? trimmed : undefined
}

function knowledgeBonuses(setName: string): Array<{ requiredCount: number; name: string; description?: string }> {
  const key = Object.keys(RECOMMENDED_ARMOR_SETS).find(
    (candidate) => candidate.toLowerCase() === setName.toLowerCase()
  )
  if (!key) return []
  const set = RECOMMENDED_ARMOR_SETS[key]
  const tiers: Array<{ requiredCount: number; name: string; description?: string }> = [
    { requiredCount: 2, name: set.twoPiece.split('—')[0]?.trim() || set.twoPiece, description: set.twoPiece },
  ]
  if (set.fourPiece) {
    tiers.push({
      requiredCount: 4,
      name: set.fourPiece.split('—')[0]?.trim() || set.fourPiece,
      description: set.fourPiece,
    })
  }
  return tiers
}

async function resolveSandboxPerkRef(
  hash: number
): Promise<{ ref: DestinyIconRef; description?: string } | undefined> {
  try {
    const info = await resolveDefinition('DestinySandboxPerkDefinition', hash, `Perk ${hash}`)
    return {
      ref: {
        name: info.name,
        hash: info.hash,
        iconUrl: info.iconUrl,
        entityType: 'DestinySandboxPerkDefinition',
      },
      description: info.description,
    }
  } catch {
    return undefined
  }
}

async function resolveEquipableItemSet(setHash: number): Promise<ResolvedSetDefinition | null> {
  try {
    const info = await resolveDefinition(
      'DestinyEquipableItemSetDefinition',
      setHash,
      `Set ${setHash}`
    )
    if (!destinyApiConfigured()) {
      return {
        hash: setHash,
        name: info.name,
        iconUrl: info.iconUrl,
        description: info.description,
        perks: [],
      }
    }

    const def = await getDestinyEntityDefinition('DestinyEquipableItemSetDefinition', setHash)
    const setPerks =
      (def as { setPerks?: EquipableSetPerkTier[] }).setPerks?.filter(
        (tier) => typeof tier?.requiredSetCount === 'number' && typeof tier?.sandboxPerkHash === 'number'
      ) ?? []

    return {
      hash: setHash,
      name: info.name,
      iconUrl: info.iconUrl,
      description: info.description,
      perks: setPerks,
    }
  } catch {
    return null
  }
}

async function buildGroupFromSetHash(
  setHash: number,
  pieceCount: number
): Promise<ArmorSetBonusGroup | null> {
  const setDef = await resolveEquipableItemSet(setHash)
  if (!setDef) return null

  const knowledge = knowledgeBonuses(setDef.name)
  const perkTiers =
    setDef.perks.length > 0
      ? setDef.perks
      : knowledge.map((tier) => ({
          requiredSetCount: tier.requiredCount,
          sandboxPerkHash: 0,
        }))

  const bonuses: ArmorSetBonusGroup['bonuses'] = []

  for (const tier of perkTiers.sort((a, b) => a.requiredSetCount - b.requiredSetCount)) {
    let perkRef: DestinyIconRef | undefined
    let name = `${tier.requiredSetCount}-piece bonus`
    let description: string | undefined

    if (tier.sandboxPerkHash > 0) {
      const perk = await resolveSandboxPerkRef(tier.sandboxPerkHash)
      if (perk) {
        perkRef = perk.ref
        name = perk.ref.name ?? name
        description = perk.description
      }
    }

    const fallback = knowledge.find((k) => k.requiredCount === tier.requiredSetCount)
    if (fallback) {
      name = fallback.name
      description = description ?? fallback.description
    }

    bonuses.push({
      requiredCount: tier.requiredSetCount,
      name,
      description,
      active: pieceCount >= tier.requiredSetCount,
      perkRef,
    })
  }

  if (!bonuses.length && knowledge.length) {
    for (const tier of knowledge) {
      bonuses.push({
        requiredCount: tier.requiredCount,
        name: tier.name,
        description: tier.description,
        active: pieceCount >= tier.requiredCount,
      })
    }
  }

  return {
    setName: setDef.name,
    pieceCount,
    setRef: {
      name: setDef.name,
      hash: setDef.hash,
      iconUrl: setDef.iconUrl,
      entityType: 'DestinyEquipableItemSetDefinition',
    },
    bonuses,
  }
}

async function buildGroupFromInferredName(
  setName: string,
  pieceCount: number
): Promise<ArmorSetBonusGroup | null> {
  const knowledge = knowledgeBonuses(setName)
  if (!knowledge.length) return null

  return {
    setName,
    pieceCount,
    bonuses: knowledge.map((tier) => ({
      requiredCount: tier.requiredCount,
      name: tier.name,
      description: tier.description,
      active: pieceCount >= tier.requiredCount,
    })),
  }
}

/** Count legendary armor per equipable set and resolve active 2pc / 4pc bonuses. */
export async function resolveArmorSetBonusesFromPieces(
  pieces: ArmorPiece[] | undefined
): Promise<ArmorSetBonusGroup[]> {
  if (!pieces?.length) return []

  const legendary = pieces.filter((piece) => !piece.isExotic && piece.slot !== 'class')
  if (!legendary.length) return []

  const setHashCounts = new Map<number, number>()
  const inferredCounts = new Map<string, number>()

  for (const piece of legendary) {
    const itemHash = piece.itemHash ?? piece.ref?.hash
    let setHash = piece.equipableItemSetHash

    if (itemHash) {
      const itemInfo = await resolveInventoryItem(itemHash, piece.name)
      setHash = setHash ?? itemInfo.equipableItemSetHash
    }

    if (setHash) {
      setHashCounts.set(setHash, (setHashCounts.get(setHash) ?? 0) + 1)
      continue
    }

    const inferred = inferSetNameFromPiece(piece.name)
    if (inferred) {
      inferredCounts.set(inferred, (inferredCounts.get(inferred) ?? 0) + 1)
    }
  }

  const groups: ArmorSetBonusGroup[] = []

  for (const [setHash, count] of Array.from(setHashCounts.entries())) {
    const group = await buildGroupFromSetHash(setHash, count)
    if (group) groups.push(group)
  }

  for (const [setName, count] of Array.from(inferredCounts.entries())) {
    const alreadyCovered = groups.some(
      (group) => group.setName.toLowerCase() === setName.toLowerCase()
    )
    if (alreadyCovered) continue
    const group = await buildGroupFromInferredName(setName, count)
    if (group) groups.push(group)
  }

  return groups.sort((a, b) => b.pieceCount - a.pieceCount || a.setName.localeCompare(b.setName))
}
