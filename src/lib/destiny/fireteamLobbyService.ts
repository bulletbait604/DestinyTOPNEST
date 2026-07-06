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
    const database = await db()
    const row = (await database.collection(DESTINY_COLLECTIONS.fireteamLobbies).findOne({
      status: { $in: ['open', 'full'] },
      $or: [{ hostUserId: userId }, { memberUserIds: userId }, { 'memberRoster.userId': userId }],
    })) as FireteamLobby | null

    if (!row) return null

    return {
      id: row.id,
      activityName: row.encounterName
        ? `${row.activityName} · ${row.encounterName}`
        : row.activityName,
      hostDisplayName: row.hostDisplayName,
      isHost: row.hostUserId === userId,
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
    hostUserId: input.host.userId,
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
    userId: user.userId,
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
  if (lobby.hostUserId === user.userId) return { ok: false, error: 'You are already the host.' }
  if (lobby.joinMode === 'apply') {
    return { ok: false, error: 'This room requires an application. Use Apply instead.' }
  }

  const active = await getUserActiveLobby(user.userId)
  if (active && active.id !== lobbyId) {
    return { ok: false, error: 'Leave your current room first.' }
  }

  const roster = lobby.memberRoster ?? []
  if (roster.some((m) => m.userId === user.userId)) {
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
  if (lobby.hostUserId === user.userId) {
    return { ok: false, error: 'You cannot apply to your own room.' }
  }

  const pending = lobby.pendingApplications ?? []
  if (pending.some((a) => a.userId === user.userId)) {
    return { ok: false, error: 'Application already pending.' }
  }

  const application: FlierTeamApplication = {
    userId: user.userId,
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
  if (lobby.hostUserId !== hostUserId) {
    return { ok: false, error: 'Only the host can approve applications.' }
  }

  const pending = lobby.pendingApplications ?? []
  const application = pending.find((a) => a.userId === applicantUserId)
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
    pendingApplications: pending.filter((a) => a.userId !== applicantUserId),
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
  const lobby = await getLobbyById(lobbyId)
  if (!lobby) return { ok: false, error: 'Room not found.' }

  const database = await db()

  if (lobby.hostUserId === userId) {
    await database.collection(DESTINY_COLLECTIONS.fireteamLobbies).updateOne(
      { id: lobbyId },
      { $set: { status: 'closed', updatedAt: new Date().toISOString() } }
    )
    return { ok: true }
  }

  const updated = syncLobbyCounts({
    ...lobby,
    memberRoster: (lobby.memberRoster ?? []).filter((m) => m.userId !== userId),
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
