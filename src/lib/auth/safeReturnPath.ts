import { defaultBungieReturnPath } from '@/lib/routing/tabUrl'

/** Reject open redirects — only same-origin relative paths are allowed. */
export function safeReturnPath(
  path: string | null | undefined,
  baseOrigin: string,
  fallback = defaultBungieReturnPath()
): string {
  if (!path || typeof path !== 'string') return fallback

  const trimmed = path.trim()
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.includes('\\')) {
    return fallback
  }

  try {
    const base = new URL(baseOrigin)
    const url = new URL(trimmed, baseOrigin)
    if (url.origin !== base.origin) return fallback
    if (!url.pathname.startsWith('/')) return fallback
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return fallback
  }
}
