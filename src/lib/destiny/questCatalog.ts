import { buildBungieIconUrl } from '@/lib/destiny/bungieUrls'

export const QUEST_KINDS = ['quest', 'pursuit', 'exotic_quest', 'catalyst'] as const
export type QuestKind = (typeof QUEST_KINDS)[number]

export interface QuestCatalogEntry {
  hash: number
  name: string
  description: string
  iconUrl?: string
  kind: QuestKind
  tier?: string
}

export interface QuestObjectiveProgress {
  progress: number
  completion: number
}

export interface QuestProgress {
  state: 'not_started' | 'in_progress' | 'complete'
  objectives: QuestObjectiveProgress[]
}

export interface QuestWithProgress extends QuestCatalogEntry {
  progress: QuestProgress
}

interface RawDefinition {
  hash?: number
  displayProperties?: { name?: string; description?: string; icon?: string }
  itemTypeDisplayName?: string
  inventory?: { tierTypeName?: string }
}

/** Keep manifest items that are quests, pursuits, exotic quests, or catalysts. */
export function classifyQuestDefinition(raw: unknown): QuestCatalogEntry | null {
  const def = (raw ?? {}) as RawDefinition
  const name = def.displayProperties?.name?.trim() ?? ''
  const hash = def.hash
  if (!name || typeof hash !== 'number') return null

  const type = (def.itemTypeDisplayName ?? '').toLowerCase()
  const tier = (def.inventory?.tierTypeName ?? '').toLowerCase()
  const nameLower = name.toLowerCase()
  let kind: QuestKind | null = null

  if (type.includes('catalyst') || /\bcatalyst\b/.test(nameLower)) kind = 'catalyst'
  else if (
    tier === 'exotic' &&
    (type.includes('quest') || type.includes('pursuit') || type.includes('mission') || type.includes('bounty'))
  ) {
    kind = 'exotic_quest'
  } else if (type.includes('pursuit') || type.includes('bounty')) kind = 'pursuit'
  else if (type.includes('quest') || type.includes('mission')) kind = 'quest'

  if (!kind) return null
  return {
    hash,
    name,
    description: (def.displayProperties?.description ?? '').trim(),
    iconUrl: buildBungieIconUrl(def.displayProperties?.icon),
    kind,
    tier: def.inventory?.tierTypeName,
  }
}

export function isQuestKind(value: string): value is QuestKind {
  return (QUEST_KINDS as readonly string[]).includes(value)
}

interface RawItem {
  itemHash?: number | string
  itemInstanceId?: string
}

interface RawObjective {
  progress?: number
  completionValue?: number
  complete?: boolean
}

/** Read quest item hashes and objective bars from a profile payload. */
export function collectQuestProgress(profile: unknown): Map<number, QuestObjectiveProgress[]> {
  const root = (profile ?? {}) as {
    profileInventory?: { data?: { items?: RawItem[] } }
    characterInventories?: { data?: Record<string, { items?: RawItem[] }> }
    itemComponents?: {
      objectives?: { data?: Record<string, { objectives?: RawObjective[] }> }
    }
  }
  const items: RawItem[] = [...(root.profileInventory?.data?.items ?? [])]
  for (const block of Object.values(root.characterInventories?.data ?? {})) {
    items.push(...(block.items ?? []))
  }
  const objectives = root.itemComponents?.objectives?.data ?? {}
  const byHash = new Map<number, QuestObjectiveProgress[]>()

  for (const item of items) {
    const hash = typeof item.itemHash === 'number' ? item.itemHash : Number(item.itemHash)
    if (!Number.isFinite(hash)) continue
    const rows = item.itemInstanceId ? objectives[item.itemInstanceId]?.objectives ?? [] : []
    const parsed = rows.map((row) => ({
      progress: row.progress ?? 0,
      completion: row.completionValue ?? (row.complete ? 1 : 0),
    }))
    const existing = byHash.get(hash) ?? []
    byHash.set(hash, existing.concat(parsed))
  }
  return byHash
}

export function applyQuestProgress(
  entries: QuestCatalogEntry[],
  owned: Map<number, QuestObjectiveProgress[]>
): QuestWithProgress[] {
  return entries.map((entry) => {
    const objectives = owned.get(entry.hash) ?? []
    if (!owned.has(entry.hash)) {
      return { ...entry, progress: { state: 'not_started', objectives: [] } }
    }
    const complete =
      objectives.length > 0 && objectives.every((row) => row.completion > 0 && row.progress >= row.completion)
    return {
      ...entry,
      progress: { state: complete ? 'complete' : 'in_progress', objectives },
    }
  })
}

export function filterQuestEntries<T extends QuestCatalogEntry>(entries: T[], kind: QuestKind | 'all'): T[] {
  if (kind === 'all') return entries
  return entries.filter((entry) => entry.kind === kind)
}
