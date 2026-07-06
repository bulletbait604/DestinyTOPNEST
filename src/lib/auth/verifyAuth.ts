import { NextRequest, NextResponse } from 'next/server'
import { getMongoDbName } from '@/lib/database'
import clientPromise from '@/lib/mongodb'
import { verifySessionJwt, getSessionSecret } from '@/lib/auth/sessionJwt'
import { BANNED_USER_MESSAGE, isUserBanned } from '@/lib/bannedUsers'
import { isAllowlistedOwner } from '@/lib/ownerAllowlist'
import { capOwnerRole } from '@/lib/home/ownerIdentity'

export type UserRole =
  | 'free'
  | 'subscriber'
  | 'subscriber_lifetime'
  | 'editor'
  | 'admin'
  | 'owner'
  | 'tester'

export interface VerifiedUser {
  id: string
  /** Stable site user id used for Mongo lookups (legacy Kick slug or Bungie membership id). */
  username: string
  /** Bungie display name or legacy Kick handle for UI. */
  displayName: string
  role: UserRole
  email?: string
  provider: 'bungie' | 'kick' | 'credentials'
}

const UNLIMITED_ROLES: UserRole[] = ['subscriber', 'subscriber_lifetime', 'admin', 'owner', 'tester']

/**
 * Extract session token from request
 * Priority: 1) HTTP-Only cookie, 2) Authorization header
 */
export function extractSessionToken(req: NextRequest): string | null {
  const sessionCookie =
    req.cookies.get('next-auth.session-token')?.value ||
    req.cookies.get('session')?.value ||
    req.cookies.get('__Secure-next-auth.session-token')?.value

  if (sessionCookie) {
    return sessionCookie
  }

  const authHeader = req.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }

  return null
}

/**
 * Verify signed session JWT (HS256). Unsigned legacy decode removed for security.
 */
async function verifyToken(token: string): Promise<VerifiedUser | null> {
  try {
    const secret = getSessionSecret()
    if (!secret) {
      console.error('[Auth] SESSION_SECRET or JWT_SECRET is not set')
      return null
    }

    const payload = verifySessionJwt(token, secret)
    if (!payload || typeof payload.sub !== 'string') {
      return null
    }

    const siteUserId = payload.sub.toLowerCase()
    const provider = (payload.provider as VerifiedUser['provider']) || 'kick'
    const displayName =
      typeof payload.name === 'string' && payload.name.trim()
        ? payload.name
        : siteUserId

    // Legacy Kick tokens used sub=kickId and name=kick username as the site user id.
    const username =
      provider === 'kick' && typeof payload.name === 'string'
        ? payload.name.toLowerCase()
        : siteUserId

    return {
      id: payload.sub,
      username,
      displayName,
      role: 'free',
      email: typeof payload.email === 'string' ? payload.email : undefined,
      provider,
    }
  } catch (error) {
    console.error('[Auth] Token verification failed:', error)
    return null
  }
}

/**
 * Central authentication verification
 * @returns VerifiedUser or throws 401
 */
export async function verifyAuth(req: NextRequest): Promise<VerifiedUser> {
  const token = extractSessionToken(req)

  if (!token) {
    throw new AuthError('No authentication token provided', 401)
  }

  const user = await verifyToken(token)

  if (!user) {
    throw new AuthError('Invalid or expired token', 401)
  }

  const client = await clientPromise
  const db = client.db(getMongoDbName())
  let dbUser = await db.collection('users').findOne({ username: user.username })

  if (!dbUser) {
    const now = new Date().toISOString()
    await db.collection('users').updateOne(
      { username: user.username },
      {
        $set: {
          username: user.username,
          bungieDisplayName: user.displayName,
          updatedAt: now,
        },
        $setOnInsert: {
          role: capOwnerRole(user.username, 'free'),
          createdAt: now,
        },
      },
      { upsert: true }
    )
    dbUser = await db.collection('users').findOne({ username: user.username })
    if (!dbUser) {
      throw new AuthError('User not found', 401)
    }
  }

  user.role = capOwnerRole(user.username, (dbUser.role as UserRole) ?? 'free')

  if (typeof dbUser.bungieDisplayName === 'string' && dbUser.bungieDisplayName.trim()) {
    user.displayName = dbUser.bungieDisplayName
  }

  if (await isUserBanned(user.username)) {
    throw new BannedUserError()
  }

  return user
}

/**
 * Role-based authorization guard
 * Throws 403 if user lacks required role
 */
export function requireRole(user: VerifiedUser, allowedRoles: UserRole[]): void {
  if (!allowedRoles.includes(user.role)) {
    throw new AuthError(`Access denied. Required roles: ${allowedRoles.join(', ')}`, 403)
  }
}

/**
 * Check if user has unlimited access (any paid tier)
 */
export function hasUnlimitedAccess(user: VerifiedUser): boolean {
  if (isAllowlistedOwner(user.username)) return true
  return UNLIMITED_ROLES.includes(user.role)
}

/** Clip Editor entitlement: site owner, admin, editor badge, or Mongo owner role. */
export function hasClipEditorAccess(user: VerifiedUser): boolean {
  if (isAllowlistedOwner(user.username)) return true
  return user.role === 'editor' || user.role === 'owner' || user.role === 'admin'
}

/**
 * Combined auth + optional role check
 * Convenience function for common use case
 */
export async function authenticateAndAuthorize(
  req: NextRequest,
  allowedRoles?: UserRole[]
): Promise<VerifiedUser> {
  const user = await verifyAuth(req)

  if (allowedRoles && allowedRoles.length > 0) {
    requireRole(user, allowedRoles)
  }

  return user
}

/**
 * Custom authentication error
 */
export class AuthError extends Error {
  constructor(
    message: string,
    public statusCode: number = 401
  ) {
    super(message)
    this.name = 'AuthError'
  }
}

/** Site access revoked for this account. */
export class BannedUserError extends AuthError {
  constructor(message: string = BANNED_USER_MESSAGE) {
    super(message, 403)
    this.name = 'BannedUserError'
  }
}

/**
 * Helper to create error response
 */
export function createAuthErrorResponse(error: AuthError | Error): NextResponse {
  const status = error instanceof AuthError ? error.statusCode : 500
  const message = error.message || 'Authentication failed'
  const banned = error instanceof BannedUserError

  return NextResponse.json({ error: message, ...(banned ? { banned: true } : {}) }, { status })
}
