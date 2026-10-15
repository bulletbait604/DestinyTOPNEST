/**
 * Per-voter sliding window for MVP and kudos writes.
 * In-memory so one instance still sheds a burst; PGCR checks stay in front of the write.
 */

const WINDOW_MS = 10 * 60 * 1000
const LIMIT = 60

const buckets = new Map<string, number[]>()

export function resetMvpVoteRateLimits(): void {
  buckets.clear()
}

export function takeMvpVoteRateLimit(input: {
  userId: string
  now?: number
}): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = input.now ?? Date.now()
  const key = input.userId.trim().toLowerCase()
  if (!key) return { ok: false, retryAfterSec: Math.ceil(WINDOW_MS / 1000) }

  const recent = (buckets.get(key) ?? []).filter((stamp) => now - stamp < WINDOW_MS)
  if (recent.length >= LIMIT) {
    const oldest = recent[0] ?? now
    const retryAfterSec = Math.max(1, Math.ceil((WINDOW_MS - (now - oldest)) / 1000))
    buckets.set(key, recent)
    return { ok: false, retryAfterSec }
  }

  recent.push(now)
  buckets.set(key, recent)
  return { ok: true }
}
