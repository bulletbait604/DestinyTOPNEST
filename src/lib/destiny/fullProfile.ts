import {
  getAccountHistoricalStats,
  getCommonSettings,
  getDestinyEntityDefinition,
  getPlayerProfile,
  getRaidDungeonModeStats,
} from '@/lib/destiny/bungieClient'
import { resolveInventoryItem } from '@/lib/destiny/manifest'
import { listPlayersMet, type PlayerMet } from '@/lib/destiny/bondStore'
import {
  collectItems,
  parseCharacters,
  parseLifetimeStats,
  sealFromNode,
  type CharacterSummary,
  type LifetimeStats,
  type ProfileItem,
  type SealProgress,
} from '@/lib/destiny/fullProfileParse'

export interface FullProfile {
  characters: Array<CharacterSummary & { title?: string; equipped: ProfileItem[] }>
  vault: ProfileItem[]
  inventory: ProfileItem[]
  lifetime: LifetimeStats | null
  triumphs: { activeScore: number; legacyScore: number; lifetimeScore: number } | null
  seals: SealProgress[]
  playersMet: PlayerMet[]
  itemCount: number
  truncated: boolean
  generatedAt: string
}

/** Max distinct item hashes resolved per request (manifest lookups are cached in Mongo). */
const MAX_RESOLVE = 450

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let i = 0
  async function worker() {
    while (i < items.length) {
      const idx = i++
      out[idx] = await fn(items[idx]!)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return out
}

const titleCache = new Map<number, string | undefined>()
async function titleName(recordHash?: number): Promise<string | undefined> {
  if (!recordHash) return undefined
  if (titleCache.has(recordHash)) return titleCache.get(recordHash)
  try {
    const def = (await getDestinyEntityDefinition('DestinyRecordDefinition', recordHash)) as {
      titleInfo?: { titlesByGender?: Record<string, string> }
    }
    const name = def?.titleInfo?.titlesByGender?.Male ?? Object.values(def?.titleInfo?.titlesByGender ?? {})[0]
    titleCache.set(recordHash, name)
    return name
  } catch {
    return undefined
  }
}

async function loadSeals(nodes: Record<string, { progressValue?: number; completionValue?: number }> | undefined): Promise<SealProgress[]> {
  if (!nodes) return []
  try {
    const settings = await getCommonSettings()
    const core = (settings?.destiny2CoreSettings ?? {}) as Record<string, number>
    const roots = [core.activeSealsRootNodeHash, core.legacySealsRootNodeHash].filter(Boolean)
    const childHashes: number[] = []
    for (const root of roots) {
      const def = (await getDestinyEntityDefinition('DestinyPresentationNodeDefinition', root)) as {
        children?: { presentationNodes?: { presentationNodeHash: number }[] }
      }
      for (const c of def?.children?.presentationNodes ?? []) childHashes.push(c.presentationNodeHash)
    }
    const seals = await mapLimit(childHashes, 8, async (hash) => {
      const def = (await getDestinyEntityDefinition('DestinyPresentationNodeDefinition', hash).catch(() => null)) as {
        displayProperties?: { name?: string; icon?: string }
        completionRecordHash?: number
      } | null
      return sealFromNode(hash, def, nodes[String(hash)], await titleName(def?.completionRecordHash))
    })
    return seals.filter((s) => s.total > 0).sort((a, b) => Number(b.complete) - Number(a.complete) || b.progress / b.total - a.progress / a.total)
  } catch (err) {
    console.warn('[fullProfile] seals unavailable', err)
    return []
  }
}

export async function buildFullProfile(
  membershipType: number,
  membershipId: string,
  accessToken: string
): Promise<FullProfile> {
  const [profile, accountStats, modeStats, playersMet] = await Promise.all([
    getPlayerProfile(membershipType, membershipId, [100, 102, 200, 201, 205, 300, 700, 900], accessToken) as Promise<
      Record<string, any>
    >,
    getAccountHistoricalStats(membershipType, membershipId, accessToken).catch(() => null),
    getRaidDungeonModeStats(membershipType, membershipId, accessToken).catch(() => null),
    listPlayersMet(membershipId, 60).catch(() => []),
  ])

  const characters = parseCharacters(profile?.characters?.data)
  const instances: Record<string, { primaryStat?: { value?: number } }> = profile?.itemComponents?.instances?.data ?? {}
  const raw = collectItems(profile ?? {})
  const uniqueHashes = Array.from(new Set(raw.map((r) => r.itemHash)))
  const truncated = uniqueHashes.length > MAX_RESOLVE
  const defs = new Map<number, Awaited<ReturnType<typeof resolveInventoryItem>>>()
  await mapLimit(uniqueHashes.slice(0, MAX_RESOLVE), 12, async (hash) => {
    defs.set(hash, await resolveInventoryItem(hash))
  })

  const items: ProfileItem[] = raw.map((r) => {
    const def = defs.get(r.itemHash)
    return {
      itemHash: r.itemHash,
      instanceId: r.itemInstanceId,
      quantity: r.quantity ?? 1,
      power: r.itemInstanceId ? instances[r.itemInstanceId]?.primaryStat?.value : undefined,
      name: def?.name ?? `Item ${r.itemHash}`,
      iconUrl: def?.iconUrl,
      tier: def?.tierLabel,
      itemType: def?.itemTypeDisplayName,
      location: r.where,
      characterId: r.characterId,
    }
  })

  const records = profile?.profileRecords?.data
  const nodes = profile?.profilePresentationNodes?.data?.nodes
  const seals = await loadSeals(nodes)

  return {
    characters: await Promise.all(
      characters.map(async (c) => ({
        ...c,
        title: await titleName(c.titleRecordHash),
        equipped: items.filter((i) => i.location === 'equipped' && i.characterId === c.characterId),
      }))
    ),
    vault: items.filter((i) => i.location === 'vault'),
    inventory: items.filter((i) => i.location === 'character'),
    lifetime: accountStats ? parseLifetimeStats(accountStats, (modeStats as any) ?? undefined) : null,
    triumphs: records
      ? {
          activeScore: Number(records.activeScore ?? 0),
          legacyScore: Number(records.legacyScore ?? 0),
          lifetimeScore: Number(records.lifetimeScore ?? records.score ?? 0),
        }
      : null,
    seals,
    playersMet,
    itemCount: items.length,
    truncated,
    generatedAt: new Date().toISOString(),
  }
}
