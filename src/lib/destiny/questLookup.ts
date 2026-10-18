import { getDestinyEntityDefinition, getPlayerProfile, searchDestinyEntities } from '@/lib/destiny/bungieClient'
import {
  applyQuestProgress,
  classifyQuestDefinition,
  collectQuestProgress,
  filterQuestEntries,
  isQuestKind,
  type QuestKind,
  type QuestWithProgress,
} from '@/lib/destiny/questCatalog'

export async function searchQuestCatalog(input: {
  query: string
  kind?: string
  membershipType?: number
  membershipId?: string
  accessToken?: string
}): Promise<QuestWithProgress[]> {
  const query = input.query.trim()
  if (query.length < 2) return []
  const hits = await searchDestinyEntities('DestinyInventoryItemDefinition', query, 0)
  const definitions = await Promise.all(
    hits.slice(0, 12).map(async (hit) => {
      try {
        const def = (await getDestinyEntityDefinition('DestinyInventoryItemDefinition', hit.hash)) as { hash?: number }
        return classifyQuestDefinition({ ...def, hash: def?.hash ?? hit.hash })
      } catch {
        return null
      }
    })
  )
  const entries = definitions.filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
  const kind = input.kind && isQuestKind(input.kind) ? (input.kind as QuestKind) : 'all'
  const filtered = filterQuestEntries(entries, kind)

  if (!input.accessToken || !input.membershipType || !input.membershipId) {
    return applyQuestProgress(filtered, new Map())
  }

  try {
    const profile = await getPlayerProfile(
      input.membershipType,
      input.membershipId,
      [102, 201, 301],
      input.accessToken
    )
    return applyQuestProgress(filtered, collectQuestProgress(profile))
  } catch {
    return applyQuestProgress(filtered, new Map())
  }
}
