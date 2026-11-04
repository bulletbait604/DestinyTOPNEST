import clientPromise from '@/lib/mongodb'
import { getMongoDbName } from '@/lib/database'
import { getMembershipsById } from '@/lib/destiny/bungieClient'
import { DESTINY_COLLECTIONS } from '@/lib/destiny/collections'
import { destinyApiConfigured } from '@/lib/destiny/env'
import {
  formatBungieGlobalName,
  globalNameForMembership,
  globalNamesByMembership,
  isBungieGlobalName,
  membershipAliasesFromUsers,
} from '@/lib/destiny/guardianIdentity'
import type { StoredDestinyUser } from '@/lib/destiny/destinyUserStore'
import type { DestinyPlatform, RunRecord, RunTeamMember } from '@/lib/destiny/types'

const ALIAS_CURSOR = 'membership-alias'

interface AliasDoc {
  membershipId: string
  primaryMembershipId: string
  bungieGlobalDisplayName?: string
  updatedAt: string
}

interface RunNameRow {
  id: string
  ownerUserId?: string
  ownerMembershipId?: string
  ownerDisplayName?: string
  teamMembers?: RunTeamMember[]
}

export async function loadMembershipAliasMap(): Promise<Map<string, string>> {
  try {
    const col = await aliasCollection()
    const docs = await col.find({}, { projection: { membershipId: 1, primaryMembershipId: 1 } }).toArray()
    const map = new Map<string, string>()
    for (const doc of docs) {
      const from = doc.membershipId?.trim()
      const to = doc.primaryMembershipId?.trim()
      if (from && to) map.set(from, to)
    }
    return map
  } catch {
    return new Map()
  }
}

function membershipTypeFor(platform: DestinyPlatform | undefined, explicit?: number): number {
  if (explicit) return explicit
  if (platform === 'xbox') return 1
  if (platform === 'playstation') return 2
  if (platform === 'epic') return 6
  return 3
}

async function aliasCollection() {
  const client = await clientPromise
  return client.db(getMongoDbName()).collection<AliasDoc>(DESTINY_COLLECTIONS.membershipAliases)
}

async function runsCollection() {
  const client = await clientPromise
  return client.db(getMongoDbName()).collection<RunNameRow>(DESTINY_COLLECTIONS.runRecords)
}

async function usersCollection() {
  const client = await clientPromise
  return client.db(getMongoDbName()).collection<StoredDestinyUser>(DESTINY_COLLECTIONS.users)
}

/**
 * Point every stored platform membership at its cross-save primary, and
 * rewrite labels to the Bungie global name. Safe to run again.
 */
export async function normalizeStoredIdentities(options: { apiLimit?: number } = {}): Promise<{
  renamed: number
  aliases: number
}> {
  const userCol = await usersCollection()
  const users = await userCol
    .find({}, { projection: { userId: 1, bungieMembershipId: 1, bungieDisplayName: 1, linkedMembershipIds: 1, destinyMembershipType: 1, platform: 1 } })
    .toArray()
  const runCol = await runsCollection()
  const runs = await runCol
    .find({}, { projection: { id: 1, ownerUserId: 1, ownerMembershipId: 1, ownerDisplayName: 1, teamMembers: 1 } })
    .toArray()
  const storedAliases = await loadMembershipAliasMap()
  const aliases = membershipAliasesFromUsers(users, storedAliases)
  let aliasesWritten = 0

  const apiLimit = Math.max(0, options.apiLimit ?? 0)
  if (apiLimit > 0 && destinyApiConfigured()) {
    aliasesWritten = await resolveMembershipBatch(runs, users, aliases, storedAliases, apiLimit)
  }

  const nameRows: { membershipId?: string; name?: string }[] = []
  for (const user of users) {
    nameRows.push({ membershipId: user.bungieMembershipId, name: user.bungieDisplayName })
    for (const linked of user.linkedMembershipIds ?? []) {
      nameRows.push({ membershipId: linked, name: user.bungieDisplayName })
    }
  }
  for (const run of runs) {
    nameRows.push({ membershipId: run.ownerMembershipId, name: run.ownerDisplayName })
    for (const member of run.teamMembers ?? []) {
      nameRows.push({ membershipId: member.membershipId, name: member.displayName })
    }
  }
  const aliasDocs = await (await aliasCollection())
    .find({ bungieGlobalDisplayName: { $exists: true } }, { projection: { primaryMembershipId: 1, bungieGlobalDisplayName: 1 } })
    .toArray()
  for (const doc of aliasDocs) {
    nameRows.push({ membershipId: doc.primaryMembershipId, name: doc.bungieGlobalDisplayName })
  }
  const names = globalNamesByMembership(nameRows, aliases)

  let renamed = 0
  for (const run of runs) {
    let changed = false
    const teamMembers = (run.teamMembers ?? []).map((member) => {
      const next = globalNameForMembership(member.membershipId, names, aliases)
      if (!next || next === member.displayName) return member
      changed = true
      return { ...member, displayName: next }
    })
    const ownerName = globalNameForMembership(run.ownerMembershipId, names, aliases)
    const ownerDisplayName = ownerName && ownerName !== run.ownerDisplayName ? ownerName : run.ownerDisplayName
    if (ownerDisplayName !== run.ownerDisplayName) changed = true
    if (!changed) continue
    await runCol.updateOne({ id: run.id }, { $set: { teamMembers, ownerDisplayName } })
    renamed += 1
  }

  const userById = new Map(users.map((user) => [user.userId, user]))
  const client = await clientPromise
  const builds = client.db(getMongoDbName()).collection<{ id: string; ownerUserId?: string; ownerDisplayName?: string; listing?: string }>(
    DESTINY_COLLECTIONS.communityBuilds
  )
  const playerBuilds = await builds
    .find({ listing: { $ne: 'featured' } }, { projection: { id: 1, ownerUserId: 1, ownerDisplayName: 1 } })
    .toArray()
  for (const build of playerBuilds) {
    const owner = build.ownerUserId ? userById.get(build.ownerUserId) : undefined
    const next = owner?.bungieDisplayName && isBungieGlobalName(owner.bungieDisplayName) ? owner.bungieDisplayName : undefined
    if (!next || next === build.ownerDisplayName) continue
    await builds.updateOne({ id: build.id }, { $set: { ownerDisplayName: next } })
    renamed += 1
  }

  return { renamed, aliases: aliasesWritten }
}

async function resolveMembershipBatch(
  runs: RunNameRow[],
  users: StoredDestinyUser[],
  aliases: Map<string, string>,
  alreadyStored: Map<string, string>,
  limit: number
): Promise<number> {
  const types = new Map<string, number>()
  for (const user of users) {
    const id = user.bungieMembershipId?.trim()
    if (id) types.set(id, membershipTypeFor(user.platform, user.destinyMembershipType))
  }
  for (const run of runs) {
    for (const member of run.teamMembers ?? []) {
      const id = member.membershipId?.trim()
      if (id && !types.has(id)) types.set(id, membershipTypeFor(member.platform))
    }
  }
  const pending = Array.from(types.keys())
    .filter((id) => !alreadyStored.has(id))
    .sort()
  if (!pending.length) return 0

  const client = await clientPromise
  const cursors = client.db(getMongoDbName()).collection<{ id: string; index: number }>(DESTINY_COLLECTIONS.rescoreCursor)
  const saved = await cursors.findOne({ id: ALIAS_CURSOR })
  const start = saved && saved.index < pending.length ? saved.index : 0
  const count = Math.min(limit, pending.length)
  const col = await aliasCollection()
  let written = 0
  let index = start
  for (let step = 0; step < count; step += 1) {
    const membershipId = pending[index % pending.length]
    index += 1
    try {
      const response = await getMembershipsById(membershipId, types.get(membershipId) || 3)
      const linked = response.destinyMemberships ?? []
      const primary =
        String(response.primaryMembershipId ?? '').trim() ||
        String(linked.find((row) => row.crossSaveOverride && row.membershipType === row.crossSaveOverride)?.membershipId ?? '').trim() ||
        String(linked[0]?.membershipId ?? membershipId)
      const card = linked.find((row) => String(row.membershipId) === primary) ?? linked[0]
      const globalName = formatBungieGlobalName(card?.bungieGlobalDisplayName, card?.bungieGlobalDisplayNameCode)
      const ids = new Set<string>([membershipId, primary, ...linked.map((row) => String(row.membershipId ?? '').trim())])
      const now = new Date().toISOString()
      for (const id of Array.from(ids)) {
        if (!id) continue
        aliases.set(id, primary)
        await col.updateOne(
          { membershipId: id },
          {
            $set: {
              membershipId: id,
              primaryMembershipId: primary,
              ...(isBungieGlobalName(globalName) ? { bungieGlobalDisplayName: globalName } : {}),
              updatedAt: now,
            },
          },
          { upsert: true }
        )
        written += 1
      }
    } catch (error) {
      console.warn('[identity] membership lookup failed', membershipId, error)
    }
  }
  await cursors.updateOne(
    { id: ALIAS_CURSOR },
    { $set: { id: ALIAS_CURSOR, index: index % pending.length } },
    { upsert: true }
  )
  return written
}
