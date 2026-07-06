import type { NextRequest } from 'next/server'
import { getMongoDbName } from '@/lib/database'
import clientPromise from '@/lib/mongodb'
import { verifyAuth, AuthError, type VerifiedUser } from '@/lib/auth/verifyAuth'
import { isAllowlistedOwner } from '@/lib/ownerAllowlist'
import { capOwnerRole } from '@/lib/home/ownerIdentity'

export function isStaffRole(role: string | undefined): boolean {
  return role === 'admin' || role === 'owner'
}

export function isOwnerActor(_role: string | undefined, username: string, displayName?: string): boolean {
  return isAllowlistedOwner(username, displayName)
}

async function staffRoleFromDb(username: string): Promise<string | undefined> {
  const client = await clientPromise
  const row = await client.db(getMongoDbName()).collection('users').findOne({ username: username.toLowerCase() })
  return typeof row?.role === 'string' ? row.role : undefined
}

/** Requires admin or owner (JWT + Mongo role fallback). */
export async function verifyStaffUser(req: NextRequest): Promise<VerifiedUser> {
  const user = await verifyAuth(req)
  if (isStaffRole(user.role) || isAllowlistedOwner(user.username, user.displayName)) {
    return user
  }
  const dbRole = await staffRoleFromDb(user.username)
  const effectiveDbRole = dbRole
    ? capOwnerRole(user.username, dbRole as VerifiedUser['role'], user.displayName)
    : undefined
  if (isStaffRole(effectiveDbRole)) {
    user.role = effectiveDbRole as VerifiedUser['role']
    return user
  }
  throw new AuthError('Admin access required', 403)
}

/** Requires owner (or allowlisted owner username). */
export async function verifyOwnerUser(req: NextRequest): Promise<VerifiedUser> {
  const user = await verifyAuth(req)
  if (isOwnerActor(user.role, user.username, user.displayName)) {
    return user
  }
  const dbRole = await staffRoleFromDb(user.username)
  const effectiveDbRole = dbRole
    ? capOwnerRole(user.username, dbRole as VerifiedUser['role'], user.displayName)
    : undefined
  if (isOwnerActor(effectiveDbRole, user.username, user.displayName)) {
    user.role = effectiveDbRole as VerifiedUser['role']
    return user
  }
  throw new AuthError('Owner access required', 403)
}

export function isProductionDeployment(): boolean {
  return process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production'
}
