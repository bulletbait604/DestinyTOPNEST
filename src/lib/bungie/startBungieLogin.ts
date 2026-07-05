/** Redirect browser to Bungie OAuth (primary site login). */
export function startBungieLogin(returnPath = '/'): void {
  window.location.href = `/api/destiny/auth/bungie/start?return=${encodeURIComponent(returnPath)}`
}
