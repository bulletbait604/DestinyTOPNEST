import type { PassportFrameId, SeasonTierStatus, WeeklyContractDefinition } from '@/lib/destiny/types'

/**
 * Built-in weekly goals. The admin console saves a replacement list in MongoDB.
 * An environment list is only a fallback when nothing has been saved.
 *
 * Points are season tier points only — they do not change leaderboard scores.
 * Rewards stay non-monetary: titles, frames, and tiers.
 */
export const DEFAULT_WEEKLY_CONTRACTS: WeeklyContractDefinition[] = [
  {
    id: 'featured-dungeon-new-guardians',
    title: 'Featured dungeon, new faces',
    description: 'Clear a featured dungeon with 2 Guardians you have never cleared with before.',
    tierPoints: 15,
    rule: { kind: 'featured_dungeon_new_guardians', minNewGuardians: 2 },
  },
  {
    id: 'raid-clan-and-outsider',
    title: 'Open the raid',
    description: 'Clear any raid with at least one clanmate and one Guardian from outside your clan.',
    tierPoints: 15,
    rule: { kind: 'raid_mixed_clan' },
  },
  {
    id: 'help-first-timer',
    title: 'Guide a first clear',
    description: 'Finish an activity with a Guardian who has no earlier verified full clear of that activity.',
    tierPoints: 20,
    rule: { kind: 'help_first_timer' },
  },
]

export interface SeasonTierDefinition {
  tier: number
  minPoints: number
  title: string
  frame: PassportFrameId
}

/** Non-monetary season ladder. Thresholds are season tier points from weekly contracts. */
export const SEASON_TIER_LADDER: SeasonTierDefinition[] = [
  { tier: 1, minPoints: 0, title: 'Fireteam Recruit', frame: 'recruit' },
  { tier: 2, minPoints: 15, title: 'Contract Runner', frame: 'bronze' },
  { tier: 3, minPoints: 40, title: 'Nest Regular', frame: 'silver' },
  { tier: 4, minPoints: 80, title: 'Fireteam Legend', frame: 'gold' },
  { tier: 5, minPoints: 140, title: 'Oathkeeper', frame: 'prismatic' },
]

export function isWeeklyContractDefinition(value: unknown): value is WeeklyContractDefinition {
  if (!value || typeof value !== 'object') return false
  const contract = value as WeeklyContractDefinition
  if (typeof contract.id !== 'string' || !contract.id.trim()) return false
  if (typeof contract.title !== 'string' || !contract.title.trim()) return false
  if (typeof contract.description !== 'string') return false
  if (typeof contract.tierPoints !== 'number' || !Number.isFinite(contract.tierPoints) || contract.tierPoints < 0) {
    return false
  }
  const rule = contract.rule
  if (!rule || typeof rule !== 'object') return false
  if (rule.kind === 'featured_dungeon_new_guardians') {
    return typeof rule.minNewGuardians === 'number' && rule.minNewGuardians >= 1
  }
  return rule.kind === 'raid_mixed_clan' || rule.kind === 'help_first_timer'
}

/** Catalog for this process. Invalid JSON falls back to the built-in list. */
export function resolveWeeklyContractCatalog(
  contracts?: WeeklyContractDefinition[]
): WeeklyContractDefinition[] {
  if (contracts?.length) return contracts

  const raw = process.env.FIRETEAM_HQ_WEEKLY_CONTRACTS_JSON?.trim()
  if (!raw) return DEFAULT_WEEKLY_CONTRACTS

  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed) || parsed.length === 0 || !parsed.every(isWeeklyContractDefinition)) {
      return DEFAULT_WEEKLY_CONTRACTS
    }
    return parsed
  } catch {
    return DEFAULT_WEEKLY_CONTRACTS
  }
}

export function resolveSeasonTier(points: number): SeasonTierStatus {
  const safePoints = Number.isFinite(points) ? Math.max(0, points) : 0
  const sorted = [...SEASON_TIER_LADDER].sort((a, b) => a.minPoints - b.minPoints)
  let current = sorted[0]!
  for (const step of sorted) {
    if (safePoints >= step.minPoints) current = step
  }
  const next = sorted.find((step) => step.minPoints > safePoints) ?? null
  return {
    tier: current.tier,
    title: current.title,
    frame: current.frame,
    points: safePoints,
    nextTierPoints: next?.minPoints ?? null,
    pointsToNext: next ? next.minPoints - safePoints : null,
  }
}

export const PASSPORT_FRAME_LABELS: Record<PassportFrameId, string> = {
  recruit: 'Recruit frame',
  bronze: 'Bronze frame',
  silver: 'Silver frame',
  gold: 'Gold frame',
  prismatic: 'Prismatic frame',
}
