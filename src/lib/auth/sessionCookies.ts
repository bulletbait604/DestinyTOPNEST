import type { NextRequest, NextResponse } from 'next/server'
import { sessionCookieSecure } from '@/lib/sessionCookie'

export const SESSION_COOKIE_NAMES = [
  'session',
  'next-auth.session-token',
  '__Secure-next-auth.session-token',
] as const

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
