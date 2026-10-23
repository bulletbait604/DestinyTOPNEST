const WINDOW_MS = 10 * 60 * 1000
const LIMIT = 8
const buckets = new Map<string, number[]>()

export function resetAskRateLimits(): void {
  buckets.clear()
}

export function takeAskRateLimit(input: {
  actor: string
  now?: number
}): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = input.now ?? Date.now()
  const key = input.actor.trim().toLowerCase() || 'anonymous'
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
