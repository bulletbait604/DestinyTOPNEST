/** Cap a Bungie Retry-After wait so a 429 cannot stall a request. */
export function bungieRetryDelayMs(retryAfterHeader: string | null, attempt: number): number | null {
  if (attempt >= 1) return null
  const parsed = Number(retryAfterHeader ?? '1')
  const seconds = Number.isFinite(parsed) && parsed > 0 ? parsed : 1
  return Math.min(2000, Math.round(seconds * 1000))
}
