import type { NextRequest, NextResponse } from 'next/server'
import { getMongoDbName } from '@/lib/database'
import clientPromise from '@/lib/mongodb'
import { getSessionSecret, signSessionJwt } from '@/lib/auth/sessionJwt'
import type { UserRole } from '@/lib/auth/verifyAuth'
import { capOwnerRole } from '@/lib/home/ownerIdentity'
import { sessionCookieSecure } from '@/lib/sessionCookie'

const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 30

/** Issue a Bungie-backed session JWT after OAuth login or reconnect. */
export async function attachSessionCookie(
  siteUserId: string,
  displayName: string,
  req: NextRequest,
  res: NextResponse
): Promise<boolean> {
  const secret = getSessionSecret()
  if (!secret) return false

  const normalized = siteUserId.toLowerCase()
  const client = await clientPromise
  const dbUser = await client.db(getMongoDbName()).collection('users').findOne({ username: normalized })
  if (!dbUser) return false

  const role = capOwnerRole(normalized, (dbUser.role as UserRole) || 'free')
  const jwt = signSessionJwt(
    {
      sub: normalized,
      name: displayName,
      role,
      provider: 'bungie',
    },
    secret,
    SESSION_MAX_AGE_SEC
  )

  res.cookies.set('session', jwt, {
    httpOnly: true,
    secure: sessionCookieSecure(req),
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SEC,
  })

  return true
}

export async function ensureSiteUserRecord(
  siteUserId: string,
  bungieMembershipId: string,
  bungieDisplayName: string
): Promise<UserRole> {
  const normalized = siteUserId.toLowerCase()
  const now = new Date().toISOString()
  const client = await clientPromise
  const db = client.db(getMongoDbName())

  const existing = await db.collection('users').findOne({ username: normalized })
  const role = capOwnerRole(normalized, (existing?.role as UserRole) || 'free')

  await db.collection('users').updateOne(
    { username: normalized },
    {
      $set: {
        username: normalized,
        bungieMembershipId,
        bungieDisplayName,
        updatedAt: now,
      },
      $setOnInsert: {
        role,
        createdAt: now,
      },
    },
    { upsert: true }
  )

  return role
}

export async function signSessionCookieForUser(
  siteUserId: string,
  displayName: string,
  role: UserRole,
  req: NextRequest,
  res: NextResponse
): Promise<boolean> {
  const secret = getSessionSecret()
  if (!secret) return false

  const normalized = siteUserId.toLowerCase()
  const jwt = signSessionJwt(
    {
      sub: normalized,
      name: displayName,
      role,
      provider: 'bungie',
    },
    secret,
    SESSION_MAX_AGE_SEC
  )

  res.cookies.set('session', jwt, {
    httpOnly: true,
    secure: sessionCookieSecure(req),
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SEC,
  })

  return true
}
