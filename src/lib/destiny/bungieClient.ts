/**
 * Server-side Bungie / Destiny 2 API client.
 * All requests use DESTINY_API (X-API-Key). Never expose the key to the browser.
 * Endpoint catalog: https://bungie-net.github.io/  Root: https://www.bungie.net/Platform
 */

import { BUNGIE_API_BASE, DESTINY_MANIFEST_PATH, destinyApiKey } from '@/lib/destiny/env'

export class BungieApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public bungieErrorCode?: number
  ) {
    super(message)
    this.name = 'BungieApiError'
  }
}

interface BungieEnvelope<T> {
  ErrorCode: number
  ErrorStatus: string
  Message: string
  MessageData: Record<string, string>
  Response: T
}

async function bungieFetch<T>(
  path: string,
  options: RequestInit & { accessToken?: string } = {}
): Promise<T> {
  const apiKey = destinyApiKey()
  if (!apiKey) {
    throw new BungieApiError('DESTINY_API is not configured', 503)
  }

  const { accessToken, ...fetchOptions } = options
  const headers: Record<string, string> = {
    'X-API-Key': apiKey,
    ...(fetchOptions.headers as Record<string, string>),
  }
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`
  }

  const res = await fetch(`${BUNGIE_API_BASE}${path}`, {
    ...fetchOptions,
    headers,
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new BungieApiError(`Bungie HTTP ${res.status}`, res.status)
  }

  const body = (await res.json()) as BungieEnvelope<T>
  if (body.ErrorCode !== 1) {
    throw new BungieApiError(body.Message || body.ErrorStatus, 502, body.ErrorCode)
  }

  return body.Response
}

export interface ManifestDisplayProperties {
  name?: string
  icon?: string
  description?: string
  hasIcon?: boolean
}

/** Single entity definition from live manifest table (item, activity, perk, etc.). */
export async function getDestinyEntityDefinition(entityType: string, hash: number) {
  return bungieFetch<unknown>(`${DESTINY_MANIFEST_PATH}${entityType}/${hash}/`)
}

export interface DestinyManifestInfo {
  version?: string
  mobileAssetContentPath?: string
  mobileGearAssetContentPaths?: Record<string, string>
  jsonWorldContentPaths?: Record<string, string>
  jsonWorldComponentContentPaths?: Record<string, Record<string, string>>
}

/** Manifest index at https://www.bungie.net/Platform/Destiny2/Manifest/ */
export async function getDestinyManifest(): Promise<DestinyManifestInfo> {
  return bungieFetch<DestinyManifestInfo>(DESTINY_MANIFEST_PATH)
}

export interface ArmorySearchResult {
  hash: number
  name: string
  icon?: string
}

/** Search Bungie armory for manifest entities by name. */
export async function searchDestinyEntities(
  entityType: string,
  searchTerm: string,
  page = 0
): Promise<ArmorySearchResult[]> {
  const encoded = encodeURIComponent(searchTerm)
  const response = await bungieFetch<{
    searchResults?: Array<{
      entityType?: string
      hash?: number
      displayProperties?: ManifestDisplayProperties
    }>
  }>(`/Destiny2/Armory/Search/${entityType}/${encoded}/?page=${page}`)

  const results = response?.searchResults ?? []
  return results
    .filter((r) => r.hash != null)
    .map((r) => ({
      hash: r.hash as number,
      name: r.displayProperties?.name ?? searchTerm,
      icon: r.displayProperties?.icon,
    }))
}

/** Public — no OAuth required. Health check + manifest version probe. */
export async function getDestinyManifestHealth(): Promise<DestinyManifestInfo> {
  return getDestinyManifest()
}

/** Resolve a player by Bungie global display name + code. */
export async function searchPlayer(displayName: string, displayNameCode: number) {
  const encoded = encodeURIComponent(displayName)
  return bungieFetch<
    Array<{
      membershipId: string
      membershipType: number
      displayName: string
    }>
  >(`/User/Search/GlobalName/${encoded}/${displayNameCode}/`)
}

/** Profile + characters — requires membershipType + membershipId. */
export async function getPlayerProfile(
  membershipType: number,
  membershipId: string,
  components: number[] = [100, 200],
  accessToken?: string
) {
  const componentQuery = components.join(',')
  return bungieFetch(
    `/Destiny2/${membershipType}/Profile/${membershipId}/?components=${componentQuery}`,
    { accessToken }
  )
}

/** Character equipment + inventories + in-game saved loadouts. */
export async function getCharacterLoadoutProfile(
  membershipType: number,
  membershipId: string,
  accessToken?: string
) {
  return bungieFetch(
    `/Destiny2/${membershipType}/Profile/${membershipId}/?components=200,205,102,206,300,304,305`,
    { accessToken }
  )
}

/** Character equipment + item sockets/stats for live build parsing. */
export async function getCharacterLoadout(
  membershipType: number,
  membershipId: string,
  _characterId: string,
  accessToken?: string
) {
  return getCharacterLoadoutProfile(membershipType, membershipId, accessToken)
}

/** Activity history for a character. */
export async function getActivityHistory(
  membershipType: number,
  membershipId: string,
  characterId: string,
  mode: number,
  count = 25,
  accessToken?: string
) {
  return bungieFetch(
    `/Destiny2/${membershipType}/Account/${membershipId}/Character/${characterId}/Stats/Activities/?mode=${mode}&count=${count}`,
    { accessToken }
  )
}

/** Post-game carnage report — core for run verification. */
export async function getPostGameCarnageReport(activityId: string, accessToken?: string) {
  return bungieFetch(`/Destiny2/Stats/PostGameCarnageReport/${activityId}/`, { accessToken })
}

/** Clan info. */
export async function getClan(clanId: string) {
  return bungieFetch(`/GroupV2/${clanId}/`)
}

/** Clan members. */
export async function getClanMembers(clanId: string, page = 1) {
  return bungieFetch<{ results?: ClanMemberPresenceRow[]; hasMore?: boolean }>(
    `/GroupV2/${clanId}/Members/${page}/`
  )
}

/** Fetch every clan member page (50 per page) for accurate online presence. */
export async function getAllClanMembersWithPresence(clanId: string): Promise<ClanMemberPresenceRow[]> {
  const all: ClanMemberPresenceRow[] = []
  let page = 1
  let hasMore = true

  while (hasMore && page <= 40) {
    const res = await getClanMembers(clanId, page)
    all.push(...(res.results ?? []))
    hasMore = Boolean(res.hasMore)
    page += 1
  }

  return all
}

/** Groups/clans a member belongs to. filter=0 all, groupType=1 clan. */
export async function getGroupsForMember(membershipType: number, membershipId: string) {
  return bungieFetch<{
    results?: Array<{
      group?: {
        groupId?: string
        name?: string
        clanInfo?: { clanCallsign?: string }
      }
    }>
  }>(`/GroupV2/User/${membershipType}/${membershipId}/0/1/`)
}

/** Fireteam / group roster for an activity instance (when available). */
export async function getActivityHistoryInstance(
  membershipType: number,
  membershipId: string,
  instanceId: string
) {
  return bungieFetch(
    `/Destiny2/Stats/PostGameCarnageReport/${instanceId}/`
  )
}

/**
 * Equip loadout — requires Bungie OAuth with MoveEquipDestinyItems scope.
 */
export async function transferDestinyItem(
  membershipType: number,
  itemInstanceId: string,
  characterId: string,
  transferToVault: boolean,
  accessToken: string,
  stackSize = 1,
  itemReferenceHash = 0
): Promise<void> {
  await bungieFetch<{ TransferStatus: number }>('/Destiny2/Actions/Items/TransferItems/', {
    method: 'POST',
    accessToken,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      itemReferenceHash,
      stackSize,
      transferToVault,
      itemId: itemInstanceId,
      characterId,
      membershipType,
    }),
  })
}

export async function equipDestinyItems(
  membershipType: number,
  characterId: string,
  itemInstanceIds: string[],
  accessToken: string
): Promise<void> {
  if (!itemInstanceIds.length) return
  await bungieFetch('/Destiny2/Actions/Items/EquipItems/', {
    method: 'POST',
    accessToken,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      itemIds: itemInstanceIds,
      characterId,
      membershipType,
    }),
  })
}

export async function applyMetaBuildToCharacter(
  membershipType: number,
  membershipId: string,
  characterId: string,
  plan: {
    items: Array<{
      itemInstanceId?: string
      location?: 'character' | 'vault' | 'other_character'
      ownerCharacterId?: string
    }>
  },
  accessToken: string
): Promise<{ equipped: number; transferred: number }> {
  let transferred = 0
  let equipped = 0

  for (const item of plan.items) {
    if (!item.itemInstanceId) continue
    if (item.location === 'vault') {
      await transferDestinyItem(membershipType, item.itemInstanceId, characterId, false, accessToken)
      transferred += 1
    } else if (item.location === 'other_character' && item.ownerCharacterId) {
      await transferDestinyItem(
        membershipType,
        item.itemInstanceId,
        item.ownerCharacterId,
        true,
        accessToken
      )
      await transferDestinyItem(membershipType, item.itemInstanceId, characterId, false, accessToken)
      transferred += 2
    }
  }

  const ids = plan.items.map((i) => i.itemInstanceId).filter(Boolean) as string[]
  if (ids.length) {
    await equipDestinyItems(membershipType, characterId, ids, accessToken)
    equipped = ids.length
  }

  return { equipped, transferred }
}

export function bungieMembershipTypeLabel(type: number): string {
  switch (type) {
    case 1:
      return 'xbox'
    case 2:
      return 'playstation'
    case 3:
      return 'steam'
    case 4:
      return 'battle.net'
    case 5:
      return 'stadia'
    case 6:
      return 'epic'
    default:
      return 'unknown'
  }
}

/** Bungie Fireteam platform enum from membership type. */
export function membershipTypeToFireteamPlatform(membershipType: number): number {
  switch (membershipType) {
    case 1:
      return 2
    case 2:
      return 1
    case 3:
      return 4
    case 6:
      return 6
    default:
      return 0
  }
}

export interface BungieFriendRow {
  lastSeenAsMembershipId?: string | number
  lastSeenAsBungieMembershipType?: number
  bungieGlobalDisplayName?: string
  bungieGlobalDisplayNameCode?: number
  onlineStatus?: number
  onlineTitle?: number
  bungieNetUser?: { membershipId?: string | number; displayName?: string }
}

export interface ClanMemberPresenceRow {
  memberType?: number
  isOnline?: boolean
  destinyUserInfo?: {
    membershipId?: string | number
    membershipType?: number
    displayName?: string
    LastSeenDisplayName?: string
    iconPath?: string
    bungieGlobalDisplayName?: string
    bungieGlobalDisplayNameCode?: number
  }
  bungieNetUserInfo?: {
    membershipId?: string | number
    displayName?: string
    iconPath?: string
    bungieGlobalDisplayName?: string
    bungieGlobalDisplayNameCode?: number
  }
}

export async function getBungieFriends(accessToken: string) {
  return bungieFetch<{ friends?: BungieFriendRow[] }>('/Social/Friends/', { accessToken })
}

export async function getClanMembersWithPresence(clanId: string) {
  const results = await getAllClanMembersWithPresence(clanId)
  return { results, hasMore: false }
}

export async function getMyClanFireteams(
  groupId: string,
  platform: number,
  accessToken: string,
  includeClosed = false,
  page = 0
) {
  return bungieFetch<{
    results?: Array<{ fireteamId?: string | number; id?: string | number; isClosed?: boolean }>
  }>(`/Fireteam/Clan/${groupId}/My/${platform}/${includeClosed}/${page}/`, { accessToken })
}

export interface BungieFireteamSummaryRow {
  fireteamId?: string | number
  title?: string
  ownerMembershipId?: string | number
  playerSlotCount?: number
  availablePlayerSlotCount?: number
  activityType?: number
}

export interface BungieFireteamMemberRow {
  destinyUserInfo?: {
    membershipId?: string | number
    membershipType?: number
    displayName?: string
    iconPath?: string
    bungieGlobalDisplayName?: string
    bungieGlobalDisplayNameCode?: number
  }
}

export async function getAvailableClanFireteams(
  groupId: string,
  platform: number,
  accessToken: string,
  page = 0
) {
  // activityType 0 = all, dateRange 1 = today, slotFilter 0 = any, publicOnly 0 = all
  return bungieFetch<{
    results?: BungieFireteamSummaryRow[]
    hasMore?: boolean
  }>(
    `/Fireteam/Clan/${groupId}/Available/${platform}/0/1/0/0/${page}/`,
    { accessToken }
  )
}

export async function getClanFireteam(
  groupId: string,
  fireteamId: string,
  accessToken: string
) {
  return bungieFetch<{
    summary?: BungieFireteamSummaryRow
    members?: BungieFireteamMemberRow[]
    alternates?: BungieFireteamMemberRow[]
  }>(`/Fireteam/Clan/${groupId}/Summary/${fireteamId}/`, { accessToken })
}

/**
 * Best-effort Bungie.net fireteam platform invite (undocumented endpoint used by bungie.net).
 * Returns ok:false when Bungie does not accept the invite.
 */
export async function sendFireteamPlatformInvite(
  groupId: string,
  fireteamId: string,
  membershipType: number,
  membershipId: string,
  accessToken: string
): Promise<{ ok: boolean; result?: number; message?: string }> {
  const paths = [
    `/Fireteam/Clan/${groupId}/PlatformInvite/${fireteamId}/${membershipType}/${membershipId}/`,
    `/Fireteam/Clan/${groupId}/IndividualInvite/${fireteamId}/${membershipType}/${membershipId}/`,
  ]

  let lastMessage = 'Platform invite unavailable'
  for (const path of paths) {
    try {
      const result = await bungieFetch<number | boolean>(path, {
        method: 'POST',
        accessToken,
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      })
      return { ok: true, result: typeof result === 'number' ? result : undefined }
    } catch (err) {
      lastMessage = err instanceof BungieApiError ? err.message : lastMessage
    }
  }

  return { ok: false, message: lastMessage }
}

export async function checkBungieApiHealth(): Promise<{
  configured: boolean
  reachable: boolean
  message: string
}> {
  if (!destinyApiKey()) {
    return {
      configured: false,
      reachable: false,
      message: 'DESTINY_API is not set. Add your Bungie API key in Vercel env vars.',
    }
  }
  try {
    await getDestinyManifestHealth()
    return {
      configured: true,
      reachable: true,
      message: 'Bungie API connected.',
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return {
      configured: true,
      reachable: false,
      message: `Bungie API key set but request failed: ${msg}`,
    }
  }
}
