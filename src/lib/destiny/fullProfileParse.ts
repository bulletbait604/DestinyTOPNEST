/** Pure parsers for the full player profile (characters, gear, vault, stats, seals). */

export interface RawItem {
  itemHash: number
  itemInstanceId?: string
  quantity?: number
  bucketHash?: number
  location?: number
}

export interface ProfileItem {
  itemHash: number
  instanceId?: string
  quantity: number
  power?: number
  name: string
  iconUrl?: string
  tier?: string
  itemType?: string
  location: 'vault' | 'character' | 'equipped'
  characterId?: string
}

export const VAULT_BUCKET_HASH = 138197802

export const CLASS_NAMES: Record<number, string> = { 0: 'Titan', 1: 'Hunter', 2: 'Warlock' }

export interface CharacterSummary {
  characterId: string
  className: string
  light: number
  emblemPath?: string
  emblemBackgroundPath?: string
  titleRecordHash?: number
  minutesPlayedTotal: number
  dateLastPlayed?: string
}

export function parseCharacters(characters: Record<string, Record<string, unknown>> | undefined): CharacterSummary[] {
  if (!characters) return []
  return Object.values(characters)
    .map((c) => ({
      characterId: String(c.characterId),
      className: CLASS_NAMES[Number(c.classType)] ?? 'Guardian',
      light: Number(c.light ?? 0),
      emblemPath: c.emblemPath ? `https://www.bungie.net${c.emblemPath}` : undefined,
      emblemBackgroundPath: c.emblemBackgroundPath ? `https://www.bungie.net${c.emblemBackgroundPath}` : undefined,
      titleRecordHash: c.titleRecordHash ? Number(c.titleRecordHash) : undefined,
      minutesPlayedTotal: Number(c.minutesPlayedTotal ?? 0),
      dateLastPlayed: c.dateLastPlayed ? String(c.dateLastPlayed) : undefined,
    }))
    .sort((a, b) => (b.dateLastPlayed ?? '').localeCompare(a.dateLastPlayed ?? ''))
}

/** Lifetime PvE stats from Account/Stats (allPvE.allTime). */
export interface LifetimeStats {
  activitiesCleared: number
  kills: number
  deaths: number
  kd: number
  publicEventsCompleted: number
  secondsPlayed: number
  raidClears: number
  dungeonClears: number
  fastestRaidSeconds?: number
}

function basic(map: Record<string, { basic?: { value?: number } }> | undefined, key: string): number {
  return Number(map?.[key]?.basic?.value ?? 0)
}

/**
 * @param stats   Account/Stats (mergedAllCharacters.results.allPvE.allTime)
 * @param modes   Character/0/Stats/?modes=4,82 (results.raid / results.dungeon .allTime)
 */
export function parseLifetimeStats(stats: unknown, modes: unknown): LifetimeStats {
  const merged = (stats as { mergedAllCharacters?: { results?: Record<string, { allTime?: Record<string, { basic?: { value?: number } }> }> } })
    ?.mergedAllCharacters?.results
  const pve = merged?.allPvE?.allTime
  const byMode = (modes as Record<string, { allTime?: Record<string, { basic?: { value?: number } }> }> | undefined) ?? {}
  const kills = basic(pve, 'kills')
  const deaths = basic(pve, 'deaths')
  const fastestMs = basic(byMode.raid?.allTime, 'fastestCompletionMs')
  return {
    activitiesCleared: basic(pve, 'activitiesCleared'),
    kills,
    deaths,
    kd: deaths > 0 ? Math.round((kills / deaths) * 100) / 100 : kills,
    publicEventsCompleted: basic(pve, 'publicEventsCompleted'),
    secondsPlayed: basic(pve, 'secondsPlayed'),
    raidClears: basic(byMode.raid?.allTime, 'activitiesCleared'),
    dungeonClears: basic(byMode.dungeon?.allTime, 'activitiesCleared'),
    fastestRaidSeconds: fastestMs > 0 ? Math.round(fastestMs / 1000) : undefined,
  }
}

/** Flatten vault + character inventories + equipment into one list. */
export function collectItems(profile: {
  profileInventory?: { data?: { items?: RawItem[] } }
  characterInventories?: { data?: Record<string, { items?: RawItem[] }> }
  characterEquipment?: { data?: Record<string, { items?: RawItem[] }> }
}): Array<RawItem & { where: ProfileItem['location']; characterId?: string }> {
  const out: Array<RawItem & { where: ProfileItem['location']; characterId?: string }> = []
  for (const item of profile.profileInventory?.data?.items ?? []) {
    if (item.bucketHash === VAULT_BUCKET_HASH) out.push({ ...item, where: 'vault' })
  }
  for (const [characterId, inv] of Object.entries(profile.characterInventories?.data ?? {})) {
    for (const item of inv.items ?? []) out.push({ ...item, where: 'character', characterId })
  }
  for (const [characterId, inv] of Object.entries(profile.characterEquipment?.data ?? {})) {
    for (const item of inv.items ?? []) out.push({ ...item, where: 'equipped', characterId })
  }
  return out
}

/** Case-insensitive vault search over name / type / tier. */
export function searchItems<T extends Pick<ProfileItem, 'name' | 'itemType' | 'tier'>>(items: T[], query: string): T[] {
  const q = query.trim().toLowerCase()
  if (!q) return items
  const terms = q.split(/\s+/)
  return items.filter((item) => {
    const hay = `${item.name} ${item.itemType ?? ''} ${item.tier ?? ''}`.toLowerCase()
    return terms.every((t) => hay.includes(t))
  })
}

export interface SealProgress {
  hash: number
  name: string
  iconUrl?: string
  title?: string
  progress: number
  total: number
  complete: boolean
}

export function sealFromNode(
  nodeHash: number,
  def: { displayProperties?: { name?: string; icon?: string }; completionRecordHash?: number } | null,
  nodeState: { progressValue?: number; completionValue?: number } | undefined,
  titleName?: string
): SealProgress {
  const progress = Number(nodeState?.progressValue ?? 0)
  const total = Number(nodeState?.completionValue ?? 0)
  return {
    hash: nodeHash,
    name: def?.displayProperties?.name ?? `Seal ${nodeHash}`,
    iconUrl: def?.displayProperties?.icon ? `https://www.bungie.net${def.displayProperties.icon}` : undefined,
    title: titleName,
    progress,
    total,
    complete: total > 0 && progress >= total,
  }
}
