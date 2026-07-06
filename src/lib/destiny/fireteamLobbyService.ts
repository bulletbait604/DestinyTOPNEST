import clientPromise from '@/lib/mongodb'
import { getMongoDbName } from '@/lib/database'
import { DESTINY_COLLECTIONS } from '@/lib/destiny/collections'
import {
  flierTeamActivityById,
  flierTeamEncounterLabel,
  type FlierTeamActivityKind,
} from '@/lib/destiny/flierTeamActivities'
import type { FlierTeamRequirementSelection } from '@/lib/destiny/flierTeamRequirements'
import type { StoredDestinyUser } from '@/lib/destiny/destinyUserStore'
import type {
  ActiveFireteamLobbySummary,
  DestinyPlatform,
  FireteamGoal,
  FireteamLobby,
  FireteamLobbyInvite,
  FlierTeamApplication,
  FlierTeamJoinMode,
  FlierTeamLobbyMember,
} from '@/lib/destiny/types'

async function db() {
  const client = await clientPromise
  return client.db(getMongoDbName())
}

function normalizeSiteUserId(userId: string): string {
  return userId.trim().toLowerCase()
}

function isSameSiteUser(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b) return false
  return normalizeSiteUserId(a) === normalizeSiteUserId(b)
}

function lobbyId(): string {
  return `flier-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function memberCount(lobby: FireteamLobby): number {
  return 1 + (lobby.memberRoster?.length ?? lobby.memberUserIds?.length ?? 0)
}

function syncLobbyCounts(lobby: FireteamLobby): FireteamLobby {
  const count = memberCount(lobby)
  return {
    ...lobby,
    currentPlayers: count,
    status: count >= lobby.maxPlayers ? 'full' : lobby.status === 'closed' ? 'closed' : 'open',
    memberUserIds: lobby.memberRoster?.map((m) => m.userId) ?? lobby.memberUserIds ?? [],
  }
}

export async function getUserActiveLobby(
  userId: string
): Promise<ActiveFireteamLobbySummary | null> {
  try {
    const normalizedId = normalizeSiteUserId(userId)
    const database = await db()
    const rows = (await database
      .collection(DESTINY_COLLECTIONS.fireteamLobbies)
      .find({ status: { $in: ['open', 'full'] } })
      .sort({ updatedAt: -1 })
      .limit(100)
      .toArray()) as unknown as FireteamLobby[]

    const row = rows.find(
      (lobby) =>
        isSameSiteUser(lobby.hostUserId, normalizedId) ||
        lobby.memberUserIds?.some((id) => isSameSiteUser(id, normalizedId)) ||
        lobby.memberRoster?.some((m) => isSameSiteUser(m.userId, normalizedId))
    )

    if (!row) return null

    return {
      id: row.id,
      activityName: row.encounterName
        ? `${row.activityName} · ${row.encounterName}`
        : row.activityName,
      hostDisplayName: row.hostDisplayName,
      isHost: isSameSiteUser(row.hostUserId, normalizedId),
    }
  } catch {
    return null
  }
}

export async function getLobbyById(lobbyId: string): Promise<FireteamLobby | null> {
  try {
    const database = await db()
    return (await database.collection(DESTINY_COLLECTIONS.fireteamLobbies).findOne({
      id: lobbyId,
      status: { $in: ['open', 'full', 'in_progress'] },
    })) as FireteamLobby | null
  } catch {
    return null
  }
}

export async function listOpenLobbies(): Promise<FireteamLobby[]> {
  try {
    const database = await db()
    const rows = await database
      .collection(DESTINY_COLLECTIONS.fireteamLobbies)
      .find({ status: { $in: ['open', 'full'] } })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray()
    return rows as unknown as FireteamLobby[]
  } catch {
    return []
  }
}

export interface CreateFlierTeamRoomInput {
  host: StoredDestinyUser
  activityKind: FlierTeamActivityKind
  activityId: string
  encounterId: string
  joinMode: FlierTeamJoinMode
  requirementSelections: FlierTeamRequirementSelection[]
  customRequirements?: string
  roomNotes?: string
  goal?: FireteamGoal
  platform?: DestinyPlatform | 'crossplay'
  micRequired?: boolean
}

export async function createFlierTeamRoom(
  input: CreateFlierTeamRoomInput
): Promise<{ ok: true; lobby: FireteamLobby } | { ok: false; error: string }> {
  const existing = await getUserActiveLobby(input.host.userId)
  if (existing) {
    return { ok: false, error: 'Leave your current FlierTeam room before creating a new one.' }
  }

  const activity = flierTeamActivityById(input.activityKind, input.activityId)
  if (!activity) {
    return { ok: false, error: 'Unknown activity selection.' }
  }

  const encounterName = flierTeamEncounterLabel(
    input.activityKind,
    activity.name,
    input.encounterId
  )

  const now = new Date().toISOString()
  const lobby: FireteamLobby = syncLobbyCounts({
    id: lobbyId(),
    hostUserId: normalizeSiteUserId(input.host.userId),
    hostDisplayName: input.host.bungieDisplayName || input.host.userId,
    hostEmblemUrl: input.host.emblemUrl,
    hostClass: input.host.characterClass,
    hostPowerLevel: input.host.powerLevel,
    hostGuardianRank: input.host.guardianRank,
    activityType: input.activityKind,
    activityKind: input.activityKind,
    activityName: activity.name,
    encounterId: input.encounterId,
    encounterName,
    goal: input.goal ?? 'fresh_run',
    tags: [],
    platform: input.platform ?? input.host.platform ?? 'crossplay',
    micRequired: input.micRequired ?? false,
    scoringEligible: input.activityKind !== 'pantheon',
    maxPlayers: activity.maxPlayers,
    currentPlayers: 1,
    status: 'open',
    createdAt: now,
    updatedAt: now,
    joinMode: input.joinMode,
    requirementSelections: input.requirementSelections,
    customRequirements: input.customRequirements?.trim() || undefined,
    roomNotes: input.roomNotes?.trim() || undefined,
    memberRoster: [],
    memberUserIds: [],
    pendingApplications: [],
    pendingInvites: [],
  })

  const database = await db()
  await database.collection(DESTINY_COLLECTIONS.fireteamLobbies).insertOne(lobby)
  return { ok: true, lobby }
}

function memberFromStored(user: StoredDestinyUser): FlierTeamLobbyMember {
  return {
    userId: normalizeSiteUserId(user.userId),
    displayName: user.bungieDisplayName || user.userId,
    bungieMembershipId: user.bungieMembershipId,
    destinyMembershipType: user.destinyMembershipType,
    emblemUrl: user.emblemUrl,
    characterClass: user.characterClass,
    powerLevel: user.powerLevel,
    guardianRank: user.guardianRank,
    joinedAt: new Date().toISOString(),
  }
}

export async function joinFlierTeamRoom(
  lobbyId: string,
  user: StoredDestinyUser
): Promise<{ ok: true; lobby: FireteamLobby } | { ok: false; error: string }> {
  const lobby = await getLobbyById(lobbyId)
  if (!lobby) return { ok: false, error: 'Room not found or closed.' }
  if (isSameSiteUser(lobby.hostUserId, user.userId)) {
    return { ok: false, error: 'You are already the host.' }
  }
  if (lobby.joinMode === 'apply') {
    return { ok: false, error: 'This room requires an application. Use Apply instead.' }
  }

  const active = await getUserActiveLobby(user.userId)
  if (active && active.id !== lobbyId) {
    return { ok: false, error: 'Leave your current room first.' }
  }

  const roster = lobby.memberRoster ?? []
  if (roster.some((m) => isSameSiteUser(m.userId, user.userId))) {
    return { ok: true, lobby }
  }

  if (memberCount(lobby) >= lobby.maxPlayers) {
    return { ok: false, error: 'Room is full.' }
  }

  const updated = syncLobbyCounts({
    ...lobby,
    memberRoster: [...roster, memberFromStored(user)],
    updatedAt: new Date().toISOString(),
  })

  const database = await db()
  await database.collection(DESTINY_COLLECTIONS.fireteamLobbies).updateOne(
    { id: lobbyId },
    {
      $set: {
        memberRoster: updated.memberRoster,
        memberUserIds: updated.memberUserIds,
        currentPlayers: updated.currentPlayers,
        status: updated.status,
        updatedAt: updated.updatedAt,
      },
    }
  )

  return { ok: true, lobby: updated }
}

export async function applyToFlierTeamRoom(
  lobbyId: string,
  user: StoredDestinyUser,
  message?: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const lobby = await getLobbyById(lobbyId)
  if (!lobby) return { ok: false, error: 'Room not found.' }
  if (lobby.joinMode !== 'apply') {
    return { ok: false, error: 'This room accepts instant joins.' }
  }
  if (isSameSiteUser(lobby.hostUserId, user.userId)) {
    return { ok: false, error: 'You cannot apply to your own room.' }
  }

  const pending = lobby.pendingApplications ?? []
  if (pending.some((a) => isSameSiteUser(a.userId, user.userId))) {
    return { ok: false, error: 'Application already pending.' }
  }

  const application: FlierTeamApplication = {
    userId: normalizeSiteUserId(user.userId),
    displayName: user.bungieDisplayName || user.userId,
    emblemUrl: user.emblemUrl,
    message: message?.trim() || undefined,
    appliedAt: new Date().toISOString(),
  }

  const database = await db()
  await database.collection(DESTINY_COLLECTIONS.fireteamLobbies).updateOne(
    { id: lobbyId },
    {
      $push: { pendingApplications: application },
      $set: { updatedAt: new Date().toISOString() },
    }
  )

  return { ok: true }
}

export async function approveFlierTeamApplication(
  lobbyId: string,
  hostUserId: string,
  applicantUserId: string,
  applicant?: StoredDestinyUser
): Promise<{ ok: true; lobby: FireteamLobby } | { ok: false; error: string }> {
  const lobby = await getLobbyById(lobbyId)
  if (!lobby) return { ok: false, error: 'Room not found.' }
  if (!isSameSiteUser(lobby.hostUserId, hostUserId)) {
    return { ok: false, error: 'Only the host can approve applications.' }
  }

  const pending = lobby.pendingApplications ?? []
  const application = pending.find((a) => isSameSiteUser(a.userId, applicantUserId))
  if (!application) return { ok: false, error: 'Application not found.' }

  if (memberCount(lobby) >= lobby.maxPlayers) {
    return { ok: false, error: 'Room is full.' }
  }

  const member: FlierTeamLobbyMember = applicant
    ? memberFromStored(applicant)
    : {
        userId: application.userId,
        displayName: application.displayName,
        emblemUrl: application.emblemUrl,
        joinedAt: new Date().toISOString(),
      }

  const updated = syncLobbyCounts({
    ...lobby,
    memberRoster: [...(lobby.memberRoster ?? []), member],
    pendingApplications: pending.filter((a) => !isSameSiteUser(a.userId, applicantUserId)),
    updatedAt: new Date().toISOString(),
  })

  const database = await db()
  await database.collection(DESTINY_COLLECTIONS.fireteamLobbies).updateOne(
    { id: lobbyId },
    {
      $set: {
        memberRoster: updated.memberRoster,
        memberUserIds: updated.memberUserIds,
        pendingApplications: updated.pendingApplications,
        currentPlayers: updated.currentPlayers,
        status: updated.status,
        updatedAt: updated.updatedAt,
      },
    }
  )

  return { ok: true, lobby: updated }
}

export async function leaveFlierTeamRoom(
  lobbyId: string,
  userId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const database = await db()
  const lobby = (await database
    .collection(DESTINY_COLLECTIONS.fireteamLobbies)
    .findOne({ id: lobbyId })) as FireteamLobby | null

  if (!lobby) return { ok: false, error: 'Room not found.' }

  if (isSameSiteUser(lobby.hostUserId, userId)) {
    await database.collection(DESTINY_COLLECTIONS.fireteamLobbies).deleteOne({ id: lobbyId })
    return { ok: true }
  }

  const updated = syncLobbyCounts({
    ...lobby,
    memberRoster: (lobby.memberRoster ?? []).filter((m) => !isSameSiteUser(m.userId, userId)),
    updatedAt: new Date().toISOString(),
  })

  await database.collection(DESTINY_COLLECTIONS.fireteamLobbies).updateOne(
    { id: lobbyId },
    {
      $set: {
        memberRoster: updated.memberRoster,
        memberUserIds: updated.memberUserIds,
        currentPlayers: updated.currentPlayers,
        status: 'open',
        updatedAt: updated.updatedAt,
      },
    }
  )

  return { ok: true }
}

export async function deleteFlierTeamRoom(
  lobbyId: string,
  userId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const database = await db()
    const lobby = (await database
      .collection(DESTINY_COLLECTIONS.fireteamLobbies)
      .findOne({ id: lobbyId })) as FireteamLobby | null

    if (!lobby) {
      return { ok: false, error: 'Room not found.' }
    }
    if (!isSameSiteUser(lobby.hostUserId, userId)) {
      return { ok: false, error: 'Only the host can delete this room.' }
    }

    await database.collection(DESTINY_COLLECTIONS.fireteamLobbies).deleteOne({ id: lobbyId })
    return { ok: true }
  } catch {
    return { ok: false, error: 'Could not delete room.' }
  }
}

export async function listAllFlierTeamRooms(limit = 100): Promise<FireteamLobby[]> {
  try {
    const database = await db()
    const rows = await database
      .collection(DESTINY_COLLECTIONS.fireteamLobbies)
      .find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray()
    return rows as unknown as FireteamLobby[]
  } catch {
    return []
  }
}

export async function deleteFlierTeamRoomAsAdmin(
  lobbyId: string
): Promise<{ ok: true; hostUserId?: string } | { ok: false; error: string }> {
  try {
    const database = await db()
    const lobby = (await database
      .collection(DESTINY_COLLECTIONS.fireteamLobbies)
      .findOne({ id: lobbyId })) as FireteamLobby | null

    if (!lobby) {
      return { ok: false, error: 'Room not found.' }
    }

    await database.collection(DESTINY_COLLECTIONS.fireteamLobbies).deleteOne({ id: lobbyId })
    return { ok: true, hostUserId: lobby.hostUserId }
  } catch {
    return { ok: false, error: 'Could not delete room.' }
  }
}

export async function clearAllFlierTeamRooms(): Promise<{ ok: true; deletedCount: number } | { ok: false; error: string }> {
  try {
    const database = await db()
    const result = await database.collection(DESTINY_COLLECTIONS.fireteamLobbies).deleteMany({})
    return { ok: true, deletedCount: result.deletedCount ?? 0 }
  } catch {
    return { ok: false, error: 'Could not clear FlierTeam rooms.' }
  }
}

/** Remove the signed-in user from any FlierTeam room, deleting rooms they host. */
export async function forceClearFlierTeamForUser(
  userId: string
): Promise<{ ok: true; cleared: number } | { ok: false; error: string }> {
  try {
    const normalizedId = normalizeSiteUserId(userId)
    const database = await db()
    const collection = database.collection(DESTINY_COLLECTIONS.fireteamLobbies)
    const rows = (await collection
      .find({})
      .limit(200)
      .toArray()) as unknown as FireteamLobby[]

    let cleared = 0

    for (const lobby of rows) {
      const isHost = isSameSiteUser(lobby.hostUserId, normalizedId)
      const isMember =
        lobby.memberUserIds?.some((id) => isSameSiteUser(id, normalizedId)) ||
        lobby.memberRoster?.some((member) => isSameSiteUser(member.userId, normalizedId))

      if (!isHost && !isMember) continue

      if (isHost) {
        await collection.deleteOne({ id: lobby.id })
        cleared++
        continue
      }

      const updated = syncLobbyCounts({
        ...lobby,
        memberRoster: (lobby.memberRoster ?? []).filter((m) => !isSameSiteUser(m.userId, normalizedId)),
        updatedAt: new Date().toISOString(),
      })

      await collection.updateOne(
        { id: lobby.id },
        {
          $set: {
            memberRoster: updated.memberRoster,
            memberUserIds: updated.memberUserIds,
            currentPlayers: updated.currentPlayers,
            status: updated.status,
            updatedAt: updated.updatedAt,
          },
        }
      )
      cleared++
    }

    return { ok: true, cleared }
  } catch {
    return { ok: false, error: 'Could not clear your FlierTeam room.' }
  }
}

export async function inviteToAppLobby(input: {
  lobbyId: string
  inviterUserId: string
  membershipId: string
  membershipType?: number
  displayName: string
}): Promise<{ ok: true; invite: FireteamLobbyInvite } | { ok: false; error: string }> {
  const lobby = await getLobbyById(input.lobbyId)
  if (!lobby) {
    return { ok: false, error: 'No open Top Nest lobby found.' }
  }

  const isMember =
    lobby.hostUserId === input.inviterUserId ||
    lobby.memberUserIds?.includes(input.inviterUserId) ||
    lobby.memberRoster?.some((m) => m.userId === input.inviterUserId)
  if (!isMember) {
    return { ok: false, error: 'You must be in this lobby to invite others.' }
  }

  if (memberCount(lobby) >= lobby.maxPlayers) {
    return { ok: false, error: 'Lobby is full.' }
  }

  const pending = lobby.pendingInvites ?? []
  if (pending.some((invite) => invite.membershipId === input.membershipId)) {
    return { ok: false, error: 'Already invited to this lobby.' }
  }

  const invite: FireteamLobbyInvite = {
    membershipId: input.membershipId,
    membershipType: input.membershipType,
    displayName: input.displayName,
    invitedByUserId: input.inviterUserId,
    invitedAt: new Date().toISOString(),
  }

  const database = await db()
  await database.collection(DESTINY_COLLECTIONS.fireteamLobbies).updateOne(
    { id: input.lobbyId },
    {
      $push: { pendingInvites: invite },
      $set: { updatedAt: new Date().toISOString() },
    }
  )

  return { ok: true, invite }
}

export function isFlierTeamRoomFull(lobby: FireteamLobby): boolean {
  return memberCount(lobby) >= lobby.maxPlayers
}

export function flierTeamRoomMembers(lobby: FireteamLobby): FlierTeamLobbyMember[] {
  const host: FlierTeamLobbyMember = {
    userId: lobby.hostUserId,
    displayName: lobby.hostDisplayName,
    emblemUrl: lobby.hostEmblemUrl,
    characterClass: lobby.hostClass,
    powerLevel: lobby.hostPowerLevel,
    guardianRank: lobby.hostGuardianRank,
    joinedAt: lobby.createdAt,
  }
  return [host, ...(lobby.memberRoster ?? [])]
}
