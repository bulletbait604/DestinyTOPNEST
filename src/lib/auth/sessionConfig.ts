/** How long the httpOnly session cookie stays valid (sliding window on each refresh). */
const DEFAULT_SESSION_DAYS = 90

function parseSessionDays(): number {
  const raw = process.env.SESSION_MAX_AGE_DAYS?.trim()
  if (!raw) return DEFAULT_SESSION_DAYS
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 1) return DEFAULT_SESSION_DAYS
  return Math.min(365, Math.floor(n))
}

export const SESSION_MAX_AGE_DAYS = parseSessionDays()
export const SESSION_MAX_AGE_SEC = SESSION_MAX_AGE_DAYS * 24 * 60 * 60
