import type { NextRequest, NextResponse } from 'next/server'
import { getMongoDbName } from '@/lib/database'
import clientPromise from '@/lib/mongodb'
import { getSessionSecret, signSessionJwt } from '@/lib/auth/sessionJwt'
import { SESSION_MAX_AGE_SEC } from '@/lib/auth/sessionConfig'
import type { VerifiedUser, UserRole } from '@/lib/auth/verifyAuth'
import { capOwnerRole } from '@/lib/home/ownerIdentity'
import { isAllowlistedOwner } from '@/lib/ownerAllowlist'
import { getSessionCookieOptions } from '@/lib/sessionCookie'

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

  res.cookies.set('session', jwt, getSessionCookieOptions(req))

  return true
}

/** Extend the sliding session window — call on session checks so users stay signed in. */
export async function refreshSessionCookie(
  user: VerifiedUser,
  req: NextRequest,
  res: NextResponse
): Promise<boolean> {
  return signSessionCookieForUser(user.username, user.displayName, user.role, req, res)
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
  let role = capOwnerRole(normalized, (existing?.role as UserRole) || 'free')
  if (isAllowlistedOwner(normalized, bungieDisplayName) && role !== 'owner' && role !== 'admin') {
    role = 'owner'
  }

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
  const cappedRole = capOwnerRole(normalized, role)
  const jwt = signSessionJwt(
    {
      sub: normalized,
      name: displayName,
      role: cappedRole,
      provider: 'bungie',
    },
    secret,
    SESSION_MAX_AGE_SEC
  )

  res.cookies.set('session', jwt, getSessionCookieOptions(req))

  return true
}
