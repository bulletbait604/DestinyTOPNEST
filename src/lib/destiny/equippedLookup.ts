import { getPlayerProfile, searchPlayer } from '@/lib/destiny/bungieClient'
import { parseEquippedCharacters } from '@/lib/destiny/equippedSlots'
import { fetchCharacterBuild } from '@/lib/destiny/guardianBuild'
import { splitBungieNameQuery, isMembershipId } from '@/lib/destiny/guardianDirectory'
import { loadoutSideFromSnapshot, type LoadoutSide } from '@/lib/destiny/loadoutCompare'
import { resolveInventoryItem } from '@/lib/destiny/manifest'

export interface EquippedLookupResult {
  displayName: string
  membershipId: string
  membershipType: number
  loadouts: LoadoutSide[]
}

const WEAPON_BUCKETS = new Set(['kinetic', 'energy', 'power'])
const ARMOR_BUCKETS = new Set(['helmet', 'gauntlets', 'chest', 'legs', 'class'])

async function itemName(hash: number): Promise<{ name: string; exotic: boolean }> {
  try {
    const item = await resolveInventoryItem(hash)
    return { name: item.name || `Item ${hash}`, exotic: (item.tierLabel ?? '').toLowerCase().includes('exotic') }
  } catch {
    return { name: `Item ${hash}`, exotic: false }
  }
}

/** Public equipped weapons, armor, and subclass. A token adds aspects and fragments. */
export async function lookupEquippedLoadout(input: {
  query?: string
  membershipId?: string
  membershipType?: number
  accessToken?: string
}): Promise<EquippedLookupResult | null> {
  let membershipId = input.membershipId?.trim() ?? ''
  let membershipType = input.membershipType
  let displayName = input.query?.trim() || 'Guardian'

  if (!isMembershipId(membershipId)) {
    const parsed = splitBungieNameQuery(input.query ?? '')
    if (!parsed) return null
    const hits = await searchPlayer(parsed.displayName, parsed.code)
    const hit = hits?.[0]
    if (!hit || !isMembershipId(String(hit.membershipId))) return null
    membershipId = String(hit.membershipId)
    membershipType = hit.membershipType
    displayName = hit.displayName?.includes('#')
      ? hit.displayName
      : `${parsed.displayName}#${String(parsed.code).padStart(4, '0')}`
  }
  if (!membershipType) membershipType = 3

  const profile = await getPlayerProfile(membershipType, membershipId, [100, 200, 205], input.accessToken)
  const characters = parseEquippedCharacters(profile)
  const userInfo = (profile as { profile?: { data?: { userInfo?: { bungieGlobalDisplayName?: string; displayName?: string } } } })
    .profile?.data?.userInfo
  displayName = userInfo?.bungieGlobalDisplayName || userInfo?.displayName || displayName

  if (input.accessToken && characters[0]) {
    const live = await fetchCharacterBuild(
      membershipType,
      membershipId,
      input.accessToken,
      'lookup',
      characters[0].characterId
    ).catch(() => null)
    if (live) {
      return {
        displayName,
        membershipId,
        membershipType,
        loadouts: [loadoutSideFromSnapshot(live, displayName)],
      }
    }
  }

  const loadouts: LoadoutSide[] = []
  for (const character of characters.slice(0, 3)) {
    const named = await Promise.all(character.slots.map(async (slot) => ({ slot, item: await itemName(slot.itemHash) })))
    const byBucket = new Map(named.map((row) => [row.slot.bucket, row.item]))
    const weapons = ['kinetic', 'energy', 'power'].map((bucket) => byBucket.get(bucket)?.name).filter(Boolean) as string[]
    const exoticWeapon = named.find((row) => WEAPON_BUCKETS.has(row.slot.bucket) && row.item.exotic)?.item.name
    const exoticArmor = named.find((row) => ARMOR_BUCKETS.has(row.slot.bucket) && row.item.exotic)?.item.name
    loadouts.push({
      id: character.characterId,
      title: `${byBucket.get('subclass')?.name ?? 'Equipped'} ${character.className}`.trim(),
      source: 'equipped',
      ownerName: displayName,
      characterClass: character.className,
      subclass: byBucket.get('subclass')?.name ?? '—',
      exoticArmor: exoticArmor ?? '—',
      exoticWeapon: exoticWeapon ?? '—',
      aspects: '—',
      fragments: '—',
      mods: '—',
      statFocus: '—',
      tags: character.power ? `${character.power} power` : 'equipped',
      weapons: weapons.join(', ') || '—',
    })
  }

  if (!loadouts.length) return null
  return { displayName, membershipId, membershipType, loadouts }
}
