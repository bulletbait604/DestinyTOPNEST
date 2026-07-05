import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth, AuthError } from '@/lib/auth/verifyAuth'
import { buildBungieAuthorizeUrl } from '@/lib/destiny/bungieOAuth'
import { createBungieOAuthState } from '@/lib/destiny/bungieOAuthState'
import { bungieOAuthConfigured, bungieOAuthRedirectUriFromRequest } from '@/lib/destiny/env'
import { defaultBungieReturnPath } from '@/lib/routing/tabUrl'
import { getSessionSecret } from '@/lib/auth/sessionJwt'
import { sessionCookieSecure } from '@/lib/sessionCookie'

export const dynamic = 'force-dynamic'

const LOGIN_FLOW_USER = 'login'

function startError(req: NextRequest, message: string, status = 503): NextResponse {
  return NextResponse.json(
    {
      error: message,
      redirectUri: bungieOAuthRedirectUriFromRequest(req),
    },
    { status }
  )
}

export async function GET(req: NextRequest) {
  if (!bungieOAuthConfigured()) {
    return startError(
      req,
      'Bungie OAuth is not configured. Set DESTINY_API, BUNGIE_OAUTH_CLIENT_ID, and BUNGIE_OAUTH_CLIENT_SECRET on Vercel.'
    )
  }

  if (!getSessionSecret()) {
    return startError(req, 'SESSION_SECRET (or JWT_SECRET) is not configured on the server.')
  }

  const redirectUri = bungieOAuthRedirectUriFromRequest(req)
  const returnParam = req.nextUrl.searchParams.get('return')
  const returnPath =
    returnParam && returnParam.startsWith('/') && !returnParam.startsWith('//')
      ? returnParam
      : defaultBungieReturnPath()

  let userId = LOGIN_FLOW_USER
  try {
    const user = await verifyAuth(req)
    userId = user.username.toLowerCase()
  } catch (error) {
    if (!(error instanceof AuthError)) {
      console.error('[destiny/auth/bungie/start]', error)
      return startError(req, 'Failed to start Bungie authorization', 500)
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
      sameSite: secure ? 'none' : 'lax',
      path: '/',
      maxAge: 600,
    })
    return res
  } catch (error) {
    console.error('[destiny/auth/bungie/start]', error)
    const detail = error instanceof Error ? error.message : 'unknown'
    if (detail.includes('SESSION_SECRET')) {
      return startError(req, detail)
    }
    return startError(req, 'Failed to start Bungie authorization', 500)
  }
}

export async function HEAD(req: NextRequest) {
  return NextResponse.json({ redirectUri: bungieOAuthRedirectUriFromRequest(req) })
}
