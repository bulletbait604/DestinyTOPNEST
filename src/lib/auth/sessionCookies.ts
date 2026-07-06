import type { NextRequest, NextResponse } from 'next/server'
import { sessionCookieSecure } from '@/lib/sessionCookie'

export const SESSION_COOKIE_NAMES = [
  'session',
  'next-auth.session-token',
  '__Secure-next-auth.session-token',
] as const

/** Set after logout — next OAuth start sends reauth=true to Bungie. */
export const BUNGIE_FORCE_REAUTH_COOKIE = 'bungieForceReauth'

export function clearSessionCookies(req: NextRequest, res: NextResponse): void {
  const secure = sessionCookieSecure(req)
  const expired = new Date(0)
  for (const name of SESSION_COOKIE_NAMES) {
    res.cookies.set(name, '', {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
      expires: expired,
    })
  }
}

export function setBungieForceReauthCookie(req: NextRequest, res: NextResponse): void {
  const secure = sessionCookieSecure(req)
  res.cookies.set(BUNGIE_FORCE_REAUTH_COOKIE, '1', {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  })
}

export function consumeBungieForceReauth(req: NextRequest, res: NextResponse): boolean {
  const force = req.cookies.get(BUNGIE_FORCE_REAUTH_COOKIE)?.value === '1'
  if (!force) return false

  const secure = sessionCookieSecure(req)
  res.cookies.set(BUNGIE_FORCE_REAUTH_COOKIE, '', {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
  return true
}

export function clearBungieOAuthStateCookie(req: NextRequest, res: NextResponse): void {
  const secure = sessionCookieSecure(req)
  res.cookies.set('bungieOAuthState', '', {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
}
