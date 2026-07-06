import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth, AuthError } from '@/lib/auth/verifyAuth'
import {
  clearBungieOAuthStateCookie,
  clearSessionCookies,
  setBungieForceReauthCookie,
} from '@/lib/auth/sessionCookies'
import { clearBungieOAuth } from '@/lib/destiny/destinyUserStore'

export const dynamic = 'force-dynamic'

/** End site session, drop stored Bungie tokens, and require Bungie re-auth on next login. */
export async function POST(req: NextRequest) {
  try {
    const user = await verifyAuth(req)
    try {
      await clearBungieOAuth(user.username.toLowerCase())
    } catch (error) {
      console.warn('[auth/logout] clearBungieOAuth failed:', error)
    }
  } catch (error) {
    if (!(error instanceof AuthError)) {
      console.error('[auth/logout]', error)
    }
  }

  const res = NextResponse.json({ ok: true })
  clearSessionCookies(req, res)
  clearBungieOAuthStateCookie(req, res)
  setBungieForceReauthCookie(req, res)
  return res
}
