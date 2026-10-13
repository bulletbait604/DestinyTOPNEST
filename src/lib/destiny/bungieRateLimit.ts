/** Cap a Bungie Retry-After wait so a 429 cannot stall a request. */
export function bungieRetryDelayMs(retryAfterHeader: string | null, attempt: number): number | null {
  if (attempt >= 1) return null
  const parsed = Number(retryAfterHeader ?? '1')
  const seconds = Number.isFinite(parsed) && parsed > 0 ? parsed : 1
  return Math.min(2000, Math.round(seconds * 1000))
}

/** Minimum gap between patient Bungie calls in this process (~3 requests/second). */
export const BUNGIE_PATIENT_GAP_MS = 300

const PATIENT_BACKOFF_CAP_MS = 8_000
const THROTTLE_CODES = new Set([31, 32, 35])

let nextPatientSlotAt = 0

export function isBungieThrottleCode(code: number | undefined): boolean {
  return code != null && THROTTLE_CODES.has(code)
}

export function isBungieThrottleMessage(message: string | undefined): boolean {
  return /throttle|rate limit/i.test(message ?? '')
}

/** Exponential backoff for a bulk sync that can afford to wait. */
export function patientBackoffMs(retryAfterHeader: string | null, attempt: number): number {
  const parsed = Number(retryAfterHeader ?? '')
  const headerMs =
    Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed * 1000) : 0
  const exponential = Math.min(PATIENT_BACKOFF_CAP_MS, 500 * 2 ** attempt)
  return Math.min(PATIENT_BACKOFF_CAP_MS, Math.max(headerMs, exponential))
}

/** Serialize patient Bungie calls so a history sync does not burst the app key. */
export async function waitForBungieSlot(minGapMs = BUNGIE_PATIENT_GAP_MS): Promise<void> {
  const now = Date.now()
  const start = Math.max(now, nextPatientSlotAt)
  nextPatientSlotAt = start + minGapMs
  const wait = start - now
  if (wait > 0) {
    await new Promise((resolve) => setTimeout(resolve, wait))
  }
}
