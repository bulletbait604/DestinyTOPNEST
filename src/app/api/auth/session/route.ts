import { NextRequest, NextResponse } from 'next/server'
import { refreshSessionCookie } from '@/lib/auth/issueSession'
import { verifyAuth, createAuthErrorResponse, AuthError } from '@/lib/auth/verifyAuth'
import { SESSION_MAX_AGE_DAYS } from '@/lib/auth/sessionConfig'
import { getDestinyUserBySiteUserId, getValidAccessToken } from '@/lib/destiny/destinyUserStore'

export const dynamic = 'force-dynamic'

/**
 * Validates the session cookie and refreshes it (sliding expiration).
 * Also refreshes Bungie OAuth tokens server-side when linked.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await verifyAuth(req)
    const siteUserId = user.username.toLowerCase()

    let bungieLinked = false
    let bungieTokenHealthy = false
    try {
      const stored = await getDestinyUserBySiteUserId(siteUserId)
      bungieLinked = Boolean(stored?.bungieMembershipId || stored?.oauth?.accessToken)
      if (stored?.oauth) {
        bungieTokenHealthy = Boolean(await getValidAccessToken(stored))
      }
    } catch (error) {
      console.warn('[auth/session] Bungie token refresh skipped:', error)
    }

    const res = NextResponse.json({
      authenticated: true,
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      bungieLinked,
      bungieTokenHealthy,
      sessionExpiresInDays: SESSION_MAX_AGE_DAYS,
    })

    await refreshSessionCookie(user, req, res)
    return res
  } catch (error) {
    if (error instanceof AuthError) {
      return createAuthErrorResponse(error)
    }
    console.error('[auth/session]', error)
    return NextResponse.json({ error: 'Session check failed' }, { status: 500 })
  }
}
