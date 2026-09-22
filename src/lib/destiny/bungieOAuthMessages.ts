/** Client-safe Bungie OAuth user-facing error messages. */

/** Map server-side OAuth callback failures to stable URL message codes. */
export function bungieOAuthCallbackErrorCode(detail: string, phase: 'token' | 'membership' | 'persist'): string {
  const lower = detail.toLowerCase()

  if (lower.includes('redirect_uri') || lower.includes('redirect uri')) {
    return 'redirect_uri_mismatch'
  }
  if (lower.includes('invalid_grant') || lower.includes('authorization code')) {
    return 'invalid_grant'
  }
  if (
    lower.includes('unauthorized') ||
    lower.includes('invalid_client') ||
    lower.includes('client secret') ||
    lower.includes('client_id')
  ) {
    return 'invalid_client'
  }
  if (
    lower.includes('api key') ||
    lower.includes('x-api-key') ||
    lower.includes('2101') ||
    lower.includes('2103') ||
    lower.includes('2106')
  ) {
    return 'api_key_mismatch'
  }
  if (lower.includes('mongodb') || lower.includes('mongo')) {
    return 'database_unavailable'
  }
  if (phase === 'membership') {
    return 'membership_lookup_failed'
  }
  if (phase === 'persist') {
    return 'database_unavailable'
  }
  if (lower.includes('no access token')) {
    return 'token_parse_failed'
  }
  return 'exchange_failed'
}

export function bungieOAuthErrorMessage(code: string): string {
  const lower = code.toLowerCase()
  if (lower.includes('redirect_uri') || lower.includes('redirect uri')) {
    return 'Redirect URI mismatch. Copy the redirect URL shown below into your Bungie app settings exactly.'
  }
  if (lower.includes('invalid_grant') || lower.includes('authorization code')) {
    return 'Authorization code expired or already used. Click Sign in and complete Bungie login in one try.'
  }
  if (lower.includes('client_id') || lower.includes('client secret') || lower.includes('unauthorized')) {
    return 'Bungie client ID, secret, or API key is wrong. All three must come from the same Bungie application.'
  }

  switch (code) {
    case 'invalid_state':
      return 'OAuth session expired or was interrupted. Click Sign in again without refreshing during Bungie login.'
    case 'missing_code':
      return 'Bungie did not return an authorization code.'
    case 'no_destiny_account':
      return 'No Destiny account is linked to this Bungie.net login.'
    case 'exchange_failed':
      return 'Token exchange failed. Confirm your Bungie app redirect URI matches this site exactly.'
    case 'invalid_grant':
      return 'Authorization code expired or already used. Click Sign in and complete Bungie login in one try.'
    case 'invalid_client':
      return 'Bungie client ID, secret, or API key is wrong. All three must come from the same Bungie application.'
    case 'api_key_mismatch':
      return 'DESTINY_API (X-API-Key) must be from the same Bungie application as your OAuth client ID and secret.'
    case 'membership_lookup_failed':
      return 'Bungie sign-in succeeded but we could not read your Destiny memberships. Check that DESTINY_API matches your OAuth app, then try again.'
    case 'token_parse_failed':
      return 'Bungie returned an unexpected token response. Confirm the app is a Confidential OAuth client and redeploy.'
    case 'redirect_uri_mismatch':
      return 'Redirect URI mismatch. Copy the redirect URL from Profile (below) into Bungie OAuth settings exactly.'
    case 'account_mismatch':
      return 'This Bungie account does not match your current session. Sign out and try again.'
    case 'session_not_configured':
      return 'Server session secret is missing. Set SESSION_SECRET on Vercel and redeploy.'
    case 'database_unavailable':
      return 'Database connection failed. Check MONGODB_URI on Vercel and redeploy.'
    default:
      return code
  }
}
