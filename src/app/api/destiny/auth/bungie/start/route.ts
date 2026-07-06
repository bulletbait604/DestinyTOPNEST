import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth, AuthError } from '@/lib/auth/verifyAuth'
import { safeReturnPath } from '@/lib/auth/safeReturnPath'
import { buildBungieAuthorizeUrl } from '@/lib/destiny/bungieOAuth'
import { createBungieOAuthState } from '@/lib/destiny/bungieOAuthState'
import {
  bungieOAuthConfigured,
  bungieOAuthRedirectUriFromRequest,
  requestPublicOrigin,
} from '@/lib/destiny/env'
import { getSessionSecret } from '@/lib/auth/sessionJwt'
import { sessionCookieSecure } from '@/lib/sessionCookie'

export const dynamic = 'force-dynamic'

const LOGIN_FLOW_USER = 'login'

function startError(message: string, status = 503): NextResponse {
  return NextResponse.json({ error: message }, { status })
}

function requestOrigin(req: NextRequest): string {
  return requestPublicOrigin(req) ?? 'http://localhost:3000'
}

export async function GET(req: NextRequest) {
  if (!bungieOAuthConfigured()) {
    return startError(
      'Bungie OAuth is not configured. Set DESTINY_API, BUNGIE_OAUTH_CLIENT_ID, and BUNGIE_OAUTH_CLIENT_SECRET on Vercel.'
    )
  }

  if (!getSessionSecret()) {
    return startError('SESSION_SECRET (or JWT_SECRET) is not configured on the server.')
  }

  const redirectUri = bungieOAuthRedirectUriFromRequest(req)
  const returnParam = req.nextUrl.searchParams.get('return')
  const returnPath = safeReturnPath(returnParam, requestOrigin(req))

  let userId = LOGIN_FLOW_USER
  try {
    const user = await verifyAuth(req)
    userId = user.username.toLowerCase()
  } catch (error) {
    if (!(error instanceof AuthError)) {
      console.error('[destiny/auth/bungie/start]', error)
      return startError('Failed to start Bungie authorization', 500)
    }
  }

  try {
    const state = await createBungieOAuthState({
      userId,
      redirectUri,
      returnPath,
    })

    const url = buildBungieAuthorizeUrl(state, redirectUri)
    const secure = sessionCookieSecure(req)

    const res = NextResponse.redirect(url)
    res.cookies.set('bungieOAuthState', state, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge: 600,
    })
    return res
  } catch (error) {
    console.error('[destiny/auth/bungie/start]', error)
    const detail = error instanceof Error ? error.message : 'unknown'
    if (detail.includes('SESSION_SECRET')) {
      return startError('Session signing is not configured on the server.')
    }
    return startError('Failed to start Bungie authorization', 500)
  }
}
