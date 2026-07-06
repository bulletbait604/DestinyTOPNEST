import type { TrustRankSummary, TrustReview, VibesLabel } from '@/lib/destiny/types'

export type KnowledgeScore = 1 | 2 | 3 | 4 | 5

export type { VibesLabel }

export const KNOWLEDGE_VOTE_LABELS: Record<KnowledgeScore, string> = {
  1: "Didn't know anything about the run",
  2: 'Picked up basics slowly',
  3: 'Knew some mechanics, learned fast',
  4: 'Solid mechanics knowledge',
  5: 'Knew the entire run inside-out',
}

export const VIBES_OPTIONS: { id: VibesLabel; label: string; hint: string }[] = [
  { id: 'quiet', label: 'Quiet', hint: 'Minimal or no comms' },
  { id: 'loud', label: 'Loud', hint: 'Overbearing or noisy' },
  { id: 'good', label: 'Good', hint: 'Positive attitude, good comms' },
  { id: 'ego', label: 'EGO', hint: 'Selfish or toxic energy' },
  { id: 'sherpa', label: 'Sherpa', hint: 'Patient teacher, led the team' },
]

/** Composite trust score (1–5) from knowledge + vibes combo. */
const COMPOSITE_MATRIX: Record<KnowledgeScore, Record<VibesLabel, number>> = {
  1: { quiet: 1, loud: 1, good: 2, ego: 1, sherpa: 2 },
  2: { quiet: 2, loud: 1, good: 2, ego: 1, sherpa: 3 },
  3: { quiet: 2, loud: 2, good: 3, ego: 2, sherpa: 4 },
  4: { quiet: 3, loud: 2, good: 4, ego: 2, sherpa: 4 },
  5: { quiet: 2, loud: 2, good: 4, ego: 2, sherpa: 5 },
}

export function clampKnowledge(value: unknown): KnowledgeScore {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return 3
  return Math.max(1, Math.min(5, Math.round(n))) as KnowledgeScore
}

export function parseVibesLabel(value: unknown): VibesLabel | null {
  if (typeof value === 'string') {
    const normalized = value.toLowerCase().trim()
    if (normalized === 'quiet' || normalized === 'loud' || normalized === 'good' || normalized === 'ego' || normalized === 'sherpa') {
      return normalized
    }
  }
  if (typeof value === 'number') {
    const legacy: Record<number, VibesLabel> = { 1: 'quiet', 2: 'loud', 3: 'sherpa' }
    return legacy[value] ?? null
  }
  return null
}

export function computeCompositeTrustScore(knowledge: KnowledgeScore, vibes: VibesLabel): number {
  return COMPOSITE_MATRIX[knowledge][vibes]
}

function reviewComposite(review: TrustReview): number {
  if (typeof review.compositeScore === 'number' && Number.isFinite(review.compositeScore)) {
    return review.compositeScore
  }
  const knowledge = clampKnowledge(review.knowledge)
  const vibes = parseVibesLabel(review.vibes) ?? 'good'
  return computeCompositeTrustScore(knowledge, vibes)
}

export function titleFromCompositeAvg(avg: number): string {
  if (avg <= 0) return 'Unrated Guardian'
  if (avg < 1.75) return 'Rough Run'
  if (avg < 2.5) return 'Chill Guardian'
  if (avg < 3.5) return 'Reliable Teammate'
  if (avg < 4.5) return 'Top Nest Regular'
  return 'Top Nest Pro'
}

/** Public Trust Rank — aggregate only; individual votes stay private. */
export function computeTrustRank(reviews: TrustReview[]): TrustRankSummary {
  if (!reviews.length) {
    return {
      compositeAvg: 0,
      topNestTitle: 'Unrated Guardian',
      reviewCount: 0,
    }
  }

  const compositeAvg =
    Math.round((reviews.reduce((sum, review) => sum + reviewComposite(review), 0) / reviews.length) * 10) / 10

  return {
    compositeAvg,
    topNestTitle: titleFromCompositeAvg(compositeAvg),
    reviewCount: reviews.length,
  }
}

/** @deprecated Use clampKnowledge */
export function clampTrustScore(value: unknown, min: 1, max: 5): KnowledgeScore {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return 3
  return Math.max(min, Math.min(max, Math.round(n))) as KnowledgeScore
}
