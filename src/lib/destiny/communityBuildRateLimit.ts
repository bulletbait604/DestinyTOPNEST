/**
 * Per-user sliding window for community build writes.
 * In-memory so a single instance still sheds bursts; validation stays in front of it.
 */

export type CommunityBuildRateAction = 'create' | 'update' | 'comment' | 'react'

const WINDOWS: Record<CommunityBuildRateAction, { limit: number; windowMs: number }> = {
  create: { limit: 6, windowMs: 60 * 60 * 1000 },
  update: { limit: 30, windowMs: 60 * 60 * 1000 },
  comment: { limit: 20, windowMs: 60 * 60 * 1000 },
  react: { limit: 40, windowMs: 10 * 60 * 1000 },
}

const buckets = new Map<string, number[]>()

export function resetCommunityBuildRateLimits(): void {
  buckets.clear()
}

export function takeCommunityBuildRateLimit(input: {
  userId: string
  action: CommunityBuildRateAction
  now?: number
}): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = input.now ?? Date.now()
  const rule = WINDOWS[input.action]
  const key = `${input.action}:${input.userId.toLowerCase()}`
  const recent = (buckets.get(key) ?? []).filter((stamp) => now - stamp < rule.windowMs)

  if (recent.length >= rule.limit) {
    const oldest = recent[0] ?? now
    const retryAfterSec = Math.max(1, Math.ceil((rule.windowMs - (now - oldest)) / 1000))
    buckets.set(key, recent)
    return { ok: false, retryAfterSec }
  }

  recent.push(now)
  buckets.set(key, recent)
  return { ok: true }
}
