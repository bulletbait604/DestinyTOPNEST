/**
 * Load every character's equipped gear and non-empty in-game loadouts from a Bungie profile.
 * Component 206 is CharacterLoadouts. Component 102 is the vault.
 */

import { BungieApiError, getDestinyProfile, searchPlayer } from '@/lib/destiny/bungieClient'
import { destinyApiConfigured } from '@/lib/destiny/env'
import { isMembershipId, splitBungieNameQuery } from '@/lib/destiny/guardianDirectory'
import { resolveDefinition, resolveInventoryItem } from '@/lib/destiny/manifest'
import {
  buildProfileSnapshot,
  unresolvedSnapshotHashes,
  type DestinyProfileSnapshot,
  type ProfileSnapshotCatalogs,
  type SnapshotItemDef,
} from '@/lib/destiny/profileSnapshot'

export interface InGameLoadoutLookup {
  displayName: string
  membershipId: string
  membershipType: number
  snapshot: DestinyProfileSnapshot
}

function profileDisplayName(profile: unknown, fallback: string): string {
  const info = (
    profile as {
      profile?: {
        data?: {
          userInfo?: {
            bungieGlobalDisplayName?: string
            bungieGlobalDisplayNameCode?: number
            displayName?: string
          }
        }
      }
    }
  ).profile?.data?.userInfo
  const name = info?.bungieGlobalDisplayName?.trim()
  if (name && info?.bungieGlobalDisplayNameCode != null) {
    return `${name}#${String(info.bungieGlobalDisplayNameCode).padStart(4, '0')}`
  }
  return info?.displayName?.trim() || fallback
}

export async function hydrateProfileSnapshot(profile: unknown): Promise<DestinyProfileSnapshot> {
  const pending = unresolvedSnapshotHashes(profile)
  const items: Record<number, SnapshotItemDef> = {}
  const loadoutNames: Record<number, string> = {}

  await Promise.all([
    ...pending.items.map(async (hash) => {
      try {
        const info = await resolveInventoryItem(hash)
        const tier = info.tierLabel
        items[hash] = {
          name: info.name || `Item ${hash}`,
          iconUrl: info.iconUrl,
          tier,
          itemType: info.itemTypeDisplayName,
          exotic: (tier ?? '').toLowerCase().includes('exotic'),
        }
      } catch {
        items[hash] = { name: `Item ${hash}` }
      }
    }),
    ...pending.loadoutNames.map(async (hash) => {
      try {
        const def = await resolveDefinition('DestinyLoadoutNameDefinition', hash, 'Loadout')
        if (def.name) loadoutNames[hash] = def.name
      } catch {
        /* fallback name is applied by the parser */
      }
    }),
  ])

  const catalogs: ProfileSnapshotCatalogs = { items, loadoutNames }
  return buildProfileSnapshot(profile, catalogs)
}

/** Public name lookup, or a signed-in profile when membershipId and a token are already known. */
export async function lookupInGameLoadouts(input: {
  query?: string
  membershipId?: string
  membershipType?: number
  accessToken?: string
}): Promise<InGameLoadoutLookup> {
  if (!destinyApiConfigured()) {
    throw new BungieApiError('Bungie sign-in is not ready on this site yet.', 503)
  }

  let membershipId = input.membershipId?.trim() ?? ''
  let membershipType = input.membershipType
  let displayName = input.query?.trim() || 'Guardian'

  if (!isMembershipId(membershipId)) {
    const parsed = splitBungieNameQuery(input.query ?? '')
    if (!parsed) {
      throw new BungieApiError('Use a Bungie name and code, like Name#1234.', 400)
    }
    const hits = await searchPlayer(parsed.displayName, parsed.code)
    const hit = hits?.[0]
    if (!hit || !isMembershipId(String(hit.membershipId))) {
      throw new BungieApiError('No Bungie profile matched that name.', 404)
    }
    membershipId = String(hit.membershipId)
    membershipType = hit.membershipType
    displayName = hit.displayName?.includes('#')
      ? hit.displayName
      : `${parsed.displayName}#${String(parsed.code).padStart(4, '0')}`
  }
  if (!membershipType) membershipType = 3

  const profile = await getDestinyProfile(membershipType, membershipId, input.accessToken)
  const snapshot = await hydrateProfileSnapshot(profile)
  return {
    displayName: profileDisplayName(profile, displayName),
    membershipId,
    membershipType,
    snapshot,
  }
}
