import clientPromise from '@/lib/mongodb'
import { getMongoDbName } from '@/lib/database'
import { isAllowlistedOwner } from '@/lib/ownerAllowlist'
import { DESTINY_COLLECTIONS } from '@/lib/destiny/collections'
import type { StoredDestinyUser } from '@/lib/destiny/destinyUserStore'
import type { AdminStaffMember } from '@/lib/destiny/types'

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

async function db() {
  const client = await clientPromise
  return client.db(getMongoDbName())
}

export async function resolveStaffTarget(
  identifier: string
): Promise<{ userId: string; bungieDisplayName: string } | null> {
  const trimmed = identifier.trim()
  if (!trimmed) return null

  const database = await db()
  const normalized = trimmed.toLowerCase()

  const siteUser = await database.collection('users').findOne({
    $or: [{ username: normalized }, { bungieDisplayName: { $regex: `^${escapeRegex(trimmed)}$`, $options: 'i' } }],
  })

  if (siteUser && typeof siteUser.username === 'string') {
    const displayName =
      typeof siteUser.bungieDisplayName === 'string' && siteUser.bungieDisplayName.trim()
        ? siteUser.bungieDisplayName
        : siteUser.username
    return { userId: siteUser.username.toLowerCase(), bungieDisplayName: displayName }
  }

  const destinyUser = (await database.collection(DESTINY_COLLECTIONS.users).findOne({
    $or: [
      { userId: normalized },
      { bungieMembershipId: trimmed },
      { bungieDisplayName: { $regex: escapeRegex(trimmed), $options: 'i' } },
    ],
  })) as StoredDestinyUser | null

  if (!destinyUser) return null

  return {
    userId: destinyUser.userId.toLowerCase(),
    bungieDisplayName: destinyUser.bungieDisplayName,
  }
}

export async function listStaffMembers(): Promise<AdminStaffMember[]> {
  const database = await db()
  const rows = await database
    .collection('users')
    .find({ role: { $in: ['admin', 'owner'] } })
    .sort({ updatedAt: -1 })
    .toArray()

  const members = await Promise.all(
    rows.map(async (row) => {
      const userId = String(row.username).toLowerCase()
      const destinyUser = (await database
        .collection(DESTINY_COLLECTIONS.users)
        .findOne({ userId })) as StoredDestinyUser | null

      const bungieDisplayName =
        (typeof row.bungieDisplayName === 'string' && row.bungieDisplayName.trim()
          ? row.bungieDisplayName
          : destinyUser?.bungieDisplayName) ?? userId

      const isPrimaryOwner = isAllowlistedOwner(userId, bungieDisplayName)
      const role: AdminStaffMember['role'] = isPrimaryOwner ? 'owner' : 'admin'

      return {
        userId,
        bungieDisplayName,
        role,
        isPrimaryOwner,
        updatedAt: typeof row.updatedAt === 'string' ? row.updatedAt : undefined,
      }
    })
  )

  return members.sort((a, b) => {
    if (a.isPrimaryOwner !== b.isPrimaryOwner) return a.isPrimaryOwner ? -1 : 1
    return a.bungieDisplayName.localeCompare(b.bungieDisplayName)
  })
}

export async function grantAdminRole(
  identifier: string
): Promise<{ userId: string; bungieDisplayName: string }> {
  const target = await resolveStaffTarget(identifier)
  if (!target) {
    throw new Error('User not found — they must sign in at least once before being granted admin.')
  }

  if (isAllowlistedOwner(target.userId, target.bungieDisplayName)) {
    throw new Error('Primary owner already has full admin access.')
  }

  const now = new Date().toISOString()
  const database = await db()
  await database.collection('users').updateOne(
    { username: target.userId },
    {
      $set: {
        username: target.userId,
        bungieDisplayName: target.bungieDisplayName,
        role: 'admin',
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true }
  )

  return target
}

export async function revokeAdminRole(
  identifier: string
): Promise<{ userId: string; bungieDisplayName: string }> {
  const target = await resolveStaffTarget(identifier)
  if (!target) {
    throw new Error('User not found.')
  }

  if (isAllowlistedOwner(target.userId, target.bungieDisplayName)) {
    throw new Error('Primary owner admin access cannot be removed.')
  }

  const database = await db()
  const row = await database.collection('users').findOne({ username: target.userId })
  if (!row || row.role !== 'admin') {
    throw new Error('User is not a delegated admin.')
  }

  const now = new Date().toISOString()
  await database.collection('users').updateOne(
    { username: target.userId },
    { $set: { role: 'free', updatedAt: now } }
  )

  return target
}
