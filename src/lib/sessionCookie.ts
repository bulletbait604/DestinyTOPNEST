import type { NextRequest } from 'next/server'
import { SESSION_MAX_AGE_SEC } from '@/lib/auth/sessionConfig'

export type SessionCookieOptions = {
  httpOnly: boolean
  secure: boolean
  sameSite: 'lax'
  path: string
  maxAge: number
}

/**
 * Whether the session cookie should use the Secure flag.
 * Only set Secure when the incoming request is HTTPS (or explicitly configured),
 * so cookies are not rejected on HTTP deployments while NODE_ENV=production.
 */
export function sessionCookieSecure(req?: NextRequest): boolean {
  if (process.env.NODE_ENV !== 'production') return false

  const proto = req?.headers.get('x-forwarded-proto')
  if (proto === 'http') return false
  if (proto === 'https') return true

  const base = process.env.NEXT_PUBLIC_BASE_URL || ''
  if (base.startsWith('http://')) return false
  if (base.startsWith('https://')) return true

  return process.env.SESSION_COOKIE_SECURE === 'true'
}

/** Shared httpOnly session cookie — keeps users signed in across visits. */
export function getSessionCookieOptions(req?: NextRequest): SessionCookieOptions {
  return {
    httpOnly: true,
    secure: sessionCookieSecure(req),
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SEC,
  }
}

export { SESSION_MAX_AGE_SEC }
