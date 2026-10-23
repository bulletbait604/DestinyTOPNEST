import type { StoredDestinyUser } from '@/lib/destiny/destinyUserStore'
import { usersByMembershipMap, validateReviewSubmission } from '@/lib/destiny/fireteamReputation'
import { kudosVoteId, mvpVoteId, validateMvpVoteSubmission } from '@/lib/destiny/mvpVoting'
import { clampKnowledge, computeCompositeTrustScore, type KnowledgeScore } from '@/lib/destiny/trustRank'
import type { MvpVote, ReputationReview, RunRecord, TrustReview } from '@/lib/destiny/types'

export const RATE_TAGS = ['chill', 'helpful', 'sherpa', 'clutch', 'good_comms', 'mvp'] as const
export type RateTag = (typeof RATE_TAGS)[number]

export const RATE_TAG_LABELS: Record<RateTag, string> = {
  chill: 'Chill',
  helpful: 'Helpful',
  sherpa: 'Sherpa',
  clutch: 'Clutch',
  good_comms: 'Good Comms',
  mvp: 'MVP vote',
}

const NOTE_MAX = 120
const MEMBERSHIP_ID = /^\d{1,22}$/

export interface GuardianQuickRating {
  id: string
  voterId: string
  voterMembershipId?: string
  targetMembershipId: string
  targetDisplayName: string
  tags: RateTag[]
  note?: string
  mvpRunId?: string
  createdAt: string
  updatedAt: string
}

export interface QuickRateTarget {
  membershipId?: string
  displayName: string
  membershipType?: number
  runId?: string
}

export interface QuickRateDraft {
  rating: GuardianQuickRating
  mvpVote?: MvpVote
  kudosVote?: MvpVote
  trustReview?: TrustReview
  reputationReview?: ReputationReview
  mvpStatus: 'saved' | 'already' | 'needs_run' | 'skipped'
  message: string
}

export function isBungieMembershipId(value: string): boolean {
  return MEMBERSHIP_ID.test(value.trim())
}

export function parseRateTags(value: unknown): RateTag[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<RateTag>()
  for (const item of value) {
    if (typeof item !== 'string') continue
    const tag = item.trim().toLowerCase().replace(/[\s-]+/g, '_')
    if ((RATE_TAGS as readonly string[]).includes(tag)) seen.add(tag as RateTag)
  }
  return RATE_TAGS.filter((tag) => seen.has(tag))
}

export function normalizeRateNote(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const cleaned = value.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim()
  if (!cleaned) return undefined
  return cleaned.slice(0, NOTE_MAX)
}

export function quickRateId(voterId: string, membershipId: string): string {
  return `rate-${voterId.trim().toLowerCase()}-${membershipId.trim()}`
}

export function tagSummary(tags: RateTag[]): string {
  return tags.map((tag) => RATE_TAG_LABELS[tag]).join(', ')
}

export function emptyTagCounts(): Record<RateTag, number> {
  return { chill: 0, helpful: 0, sherpa: 0, clutch: 0, good_comms: 0, mvp: 0 }
}

export function countTags(rows: Array<{ tags?: unknown }>): Record<RateTag, number> {
  const counts = emptyTagCounts()
  for (const row of rows) {
    for (const tag of parseRateTags(row.tags)) counts[tag] += 1
  }
  return counts
}

export function rateTagLine(counts: Record<RateTag, number>): string {
  return RATE_TAGS.filter((tag) => tag !== 'mvp' && counts[tag] > 0)
    .map((tag) => `${RATE_TAG_LABELS[tag]} ${counts[tag]}`)
    .join(' · ')
}

export function recentTeammatesFromRuns(
  runs: RunRecord[],
  voterMembershipId: string | undefined,
  limit = 12
): { membershipId: string; displayName: string }[] {
  const self = (voterMembershipId ?? '').trim()
  const seen = new Set<string>()
  const rows: { membershipId: string; displayName: string }[] = []
  const ordered = runs
    .slice()
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
  for (const run of ordered) {
    if (run.verificationStatus !== 'verified') continue
    for (const member of run.teamMembers) {
      const membershipId = member.membershipId?.trim() ?? ''
      if (!isBungieMembershipId(membershipId) || membershipId === self || seen.has(membershipId)) continue
      seen.add(membershipId)
      rows.push({ membershipId, displayName: member.displayName || membershipId })
      if (rows.length >= limit) return rows
    }
  }
  return rows
}

export function trustFromTags(tags: RateTag[]): { knowledge: KnowledgeScore; vibes: 'good' | 'sherpa' } | null {
  const positive = tags.filter((tag) => tag !== 'mvp')
  if (!positive.length) return null
  if (positive.includes('sherpa')) return { knowledge: 5, vibes: 'sherpa' }
  if (positive.includes('clutch')) return { knowledge: 5, vibes: 'good' }
  if (positive.includes('helpful') || positive.includes('good_comms')) return { knowledge: 4, vibes: 'good' }
  return { knowledge: 3, vibes: 'good' }
}

export function pickSharedRun(
  runs: RunRecord[],
  voterId: string,
  voterMembershipId: string | undefined,
  targetMembershipId: string,
  preferredRunId?: string
): RunRecord | undefined {
  const shared = sharedRuns(runs, voterId, voterMembershipId, targetMembershipId)
  return (preferredRunId ? shared.find((candidate) => candidate.id === preferredRunId) : undefined) ?? shared[0]
}

function sharedRuns(
  runs: RunRecord[],
  voterId: string,
  voterMembershipId: string | undefined,
  targetMembershipId: string
): RunRecord[] {
  return runs
    .filter((run) => run.verificationStatus === 'verified')
    .filter((run) => run.teamMembers.some((member) => member.membershipId === targetMembershipId))
    .filter((run) => {
      if (run.ownerUserId === voterId) return true
      return Boolean(voterMembershipId && run.teamMembers.some((member) => member.membershipId === voterMembershipId))
    })
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
}

function reputationScores(tags: RateTag[]) {
  const scores = {
    communication: 4,
    reliability: 4,
    mechanics: 4,
    friendly: 4,
    teaching: 4,
    punctual: 4,
  }
  if (tags.includes('good_comms')) scores.communication = 5
  if (tags.includes('helpful') || tags.includes('clutch')) scores.reliability = 5
  if (tags.includes('clutch') || tags.includes('sherpa')) scores.mechanics = 5
  if (tags.includes('chill') || tags.includes('helpful')) scores.friendly = 5
  if (tags.includes('sherpa')) scores.teaching = 5
  return scores
}

export function buildQuickRateWrite(input: {
  voterId: string
  voterMembershipId?: string
  targetMembershipId: string
  targetDisplayName: string
  targetSiteUserId?: string
  tags: RateTag[]
  note?: string
  now: string
  preferredRunId?: string
  runs: RunRecord[]
  users?: StoredDestinyUser[]
  existingTrustRunIds?: string[]
  existingReputationRunIds?: string[]
  existingMvpMembershipId?: string
  existingKudosMembershipIds?: string[]
  createdAt?: string
}): { ok: true; draft: QuickRateDraft } | { ok: false; error: string } {
  const voterId = input.voterId.trim().toLowerCase()
  const targetMembershipId = input.targetMembershipId.trim()
  if (!voterId) return { ok: false, error: 'Sign in with Bungie to submit your vote' }
  if (!isBungieMembershipId(targetMembershipId)) {
    return { ok: false, error: 'Pick a Guardian with a Bungie membership id' }
  }
  const voterMembershipId = input.voterMembershipId?.trim() || undefined
  if (voterMembershipId && voterMembershipId === targetMembershipId) {
    return { ok: false, error: 'You cannot rate yourself' }
  }
  const targetSiteUserId = input.targetSiteUserId?.trim().toLowerCase() || undefined
  if (targetSiteUserId && targetSiteUserId === voterId) {
    return { ok: false, error: 'You cannot rate yourself' }
  }
  if (!input.tags.length) return { ok: false, error: 'Pick at least one tag' }

  const displayName = input.targetDisplayName.trim() || targetMembershipId
  const run = pickSharedRun(input.runs, voterId, voterMembershipId, targetMembershipId, input.preferredRunId)
  const usersByMembership = usersByMembershipMap(input.users ?? [])
  const wantsMvp = input.tags.includes('mvp')
  let mvpStatus: QuickRateDraft['mvpStatus'] = wantsMvp ? 'needs_run' : 'skipped'
  let mvpVote: MvpVote | undefined
  let kudosVote: MvpVote | undefined
  let trustReview: TrustReview | undefined
  let reputationReview: ReputationReview | undefined
  let mvpRunId: string | undefined

  if (run && wantsMvp) {
    if (input.existingMvpMembershipId === targetMembershipId) {
      mvpStatus = 'already'
      mvpRunId = run.id
    } else {
      const validation = validateMvpVoteSubmission({
        voterId,
        voterMembershipId,
        targetMembershipId,
        category: 'mvp',
        action: 'set',
        runId: run.id,
        runs: input.runs,
        usersByMembership,
      })
      if (validation.ok) {
        mvpStatus = 'saved'
        mvpRunId = run.id
        mvpVote = {
          id: mvpVoteId(voterId, run.id),
          runId: run.id,
          voterId,
          voterMembershipId,
          category: 'mvp',
          selectedUserId: validation.target.siteUserId,
          selectedMembershipId: validation.target.membershipId,
          selectedDisplayName: validation.target.displayName,
          createdAt: input.now,
          updatedAt: input.now,
        }
      }
    }
  }

  const wantsKudos = input.tags.includes('helpful') || input.tags.includes('good_comms')
  if (run && wantsKudos && !(input.existingKudosMembershipIds ?? []).includes(targetMembershipId)) {
    const validation = validateMvpVoteSubmission({
      voterId,
      voterMembershipId,
      targetMembershipId,
      category: 'kudos',
      action: 'set',
      runId: run.id,
      runs: input.runs,
      usersByMembership,
    })
    if (validation.ok) {
      kudosVote = {
        id: kudosVoteId(voterId, run.id, validation.target.membershipId),
        runId: run.id,
        voterId,
        voterMembershipId,
        category: 'kudos',
        selectedUserId: validation.target.siteUserId,
        selectedMembershipId: validation.target.membershipId,
        selectedDisplayName: validation.target.displayName,
        createdAt: input.now,
        updatedAt: input.now,
      }
    }
  }

  const trust = run ? trustFromTags(input.tags) : null
  const reviewed = run
    ? validateReviewSubmission(voterId, voterMembershipId, targetMembershipId, run.id, input.runs, usersByMembership)
    : null
  if (run && reviewed?.ok && trust && !(input.existingTrustRunIds ?? []).includes(run.id)) {
    const knowledge = clampKnowledge(trust.knowledge)
    trustReview = {
      id: `trust-${voterId}-${run.id}-${targetMembershipId}`,
      reviewerId: voterId,
      reviewedMembershipId: targetMembershipId,
      runId: run.id,
      knowledge,
      vibes: trust.vibes,
      compositeScore: computeCompositeTrustScore(knowledge, trust.vibes),
      createdAt: input.now,
    }
    if (targetSiteUserId) trustReview.reviewedUserId = targetSiteUserId
  }

  const positive = input.tags.filter((tag) => tag !== 'mvp')
  if (
    run &&
    reviewed?.ok &&
    targetSiteUserId &&
    positive.length &&
    !(input.existingReputationRunIds ?? []).includes(run.id)
  ) {
    reputationReview = {
      id: `rep-${voterId}-${targetSiteUserId}-${run.id}`,
      reviewerId: voterId,
      reviewedUserId: targetSiteUserId,
      runId: run.id,
      ...reputationScores(input.tags),
      wouldPlayAgain: true,
      notes: input.note,
      createdAt: input.now,
    }
  }

  const storedTags = input.tags.filter((tag) => tag !== 'mvp' || mvpStatus === 'saved' || mvpStatus === 'already')
  if (!storedTags.length) {
    return { ok: false, error: `MVP votes count after you clear a raid or dungeon with ${displayName}.` }
  }

  const rating: GuardianQuickRating = {
    id: quickRateId(voterId, targetMembershipId),
    voterId,
    voterMembershipId,
    targetMembershipId,
    targetDisplayName: displayName,
    tags: storedTags,
    note: input.note,
    mvpRunId,
    createdAt: input.createdAt ?? input.now,
    updatedAt: input.now,
  }

  const shown = tagSummary(storedTags)
  let message = `Rated ${displayName}: ${shown}.`
  if (mvpStatus === 'saved') message += ' MVP vote saved on your shared clear.'
  if (mvpStatus === 'already') message += ' They are already your MVP for that clear.'
  if (mvpStatus === 'needs_run') message += ' MVP votes count after you clear together.'

  return {
    ok: true,
    draft: { rating, mvpVote, kudosVote, trustReview, reputationReview, mvpStatus, message },
  }
}

const WINDOW_MS = 10 * 60 * 1000
const LIMIT = 30
const buckets = new Map<string, number[]>()

export function resetQuickRateLimits(): void {
  buckets.clear()
}

export function takeQuickRateLimit(input: { userId: string; now?: number }): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = input.now ?? Date.now()
  const key = input.userId.trim().toLowerCase()
  if (!key) return { ok: false, retryAfterSec: Math.ceil(WINDOW_MS / 1000) }
  const recent = (buckets.get(key) ?? []).filter((stamp) => now - stamp < WINDOW_MS)
  if (recent.length >= LIMIT) {
    const oldest = recent[0] ?? now
    buckets.set(key, recent)
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((WINDOW_MS - (now - oldest)) / 1000)) }
  }
  recent.push(now)
  buckets.set(key, recent)
  return { ok: true }
}
