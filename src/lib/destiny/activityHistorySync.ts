import { BungieApiError, getActivityHistoryPage, getHistoricalStatsForAccount, getPlayerProfile, bungieMembershipTypeLabel } from '@/lib/destiny/bungieClient'
import { getDestinyMembershipsForCurrentUser } from '@/lib/destiny/bungieOAuth'
import { isBungieThrottleCode, isBungieThrottleMessage, waitForBungieSlot } from '@/lib/destiny/bungieRateLimit'
import { resolveActivityByHash } from '@/lib/destiny/manifest'
import { getValidAccessToken, type StoredDestinyUser } from '@/lib/destiny/destinyUserStore'
import {
  ACTIVITY_HISTORY_PAGE_SIZE,
  DELETED_CHARACTER_HISTORY_REASON,
  activityKindLabel,
  advanceCharacterSync,
  classLabelFromType,
  isSyncComplete,
  mergeCharacterCursors,
  newCharacterCursor,
  nextSyncCharacter,
  parseHistoricalCharacters,
  parseHistoryActivity,
  parseProfileCharacters,
  prepareSyncPass,
  syncProgressPercent,
  type HistoryCharacterCursor,
  type ParsedHistoryActivity,
  type RawHistoryActivity,
} from '@/lib/destiny/activityHistoryModel'
import {
  claimActivitySyncLock,
  countStoredActivities,
  getActivitySyncState,
  listUnresolvedActivityHashes,
  releaseActivitySyncLock,
  renameActivities,
  saveActivitySyncState,
  upsertParsedActivities,
  type ActivityHistorySyncDocument,
} from '@/lib/destiny/activityHistoryStore'

const PAGE_BUDGET = 8
const CHUNK_BUDGET_MS = 18_000
const MAX_CHARACTER_PAGES = 400
const DISCOVERY_MAX_AGE_MS = 12 * 60 * 60 * 1000
const NAME_LOOKUPS_PER_CHUNK = 8

const DELETED_LIMITATION =
  'Deleted characters: Bungie historical stats may include totals, but GetActivityHistory does not return their individual runs.'

export interface ActivitySyncCharacterView {
  key: string
  classLabel: string
  platformLabel: string
  light?: number
  deleted: boolean
  backfillComplete: boolean
  pagesFetched: number
  activitiesSeen: number
  unavailableReason?: string
  historical?: HistoryCharacterCursor['historical']
}

export interface ActivitySyncView {
  status: ActivityHistorySyncDocument['status']
  complete: boolean
  activitiesStored: number
  pagesFetched: number
  percent: number
  error?: string
  updatedAt: string
  limitations: string[]
  characters: ActivitySyncCharacterView[]
}

export interface ActivitySyncChunkResult {
  sync: ActivitySyncView
  complete: boolean
  blocked?: boolean
  paused?: boolean
  retryAfterMs?: number
  authError?: boolean
}

export function toActivitySyncView(state: ActivityHistorySyncDocument): ActivitySyncView {
  const complete = state.status !== 'error' && isSyncComplete(state.characters)
  return {
    status: complete ? 'complete' : state.status,
    complete,
    activitiesStored: state.activitiesStored,
    pagesFetched: state.pagesFetched,
    percent: syncProgressPercent(state.characters, state.activitiesStored),
    error: state.error,
    updatedAt: state.updatedAt,
    limitations: limitationsFor(state.characters, state.limitations),
    characters: state.characters.map((cursor) => ({
      key: cursor.key,
      classLabel: cursor.classLabel,
      platformLabel: cursor.platformLabel,
      light: cursor.light,
      deleted: cursor.deleted,
      backfillComplete: cursor.backfillComplete,
      pagesFetched: cursor.pagesFetched,
      activitiesSeen: cursor.activitiesSeen,
      unavailableReason: cursor.unavailableReason,
      historical: cursor.historical,
    })),
  }
}

function limitationsFor(characters: HistoryCharacterCursor[], extra: string[] = []): string[] {
  const notes: string[] = []
  if (characters.some((cursor) => cursor.deleted || cursor.unavailableReason)) {
    notes.push(DELETED_LIMITATION)
  }
  return Array.from(new Set([...notes, ...extra.filter(Boolean)]))
}

export function isCharacterHistoryUnavailable(error: unknown): boolean {
  if (!(error instanceof BungieApiError)) return false
  if (error.statusCode === 429 || isBungieThrottleCode(error.bungieErrorCode)) return false
  if (isBungieThrottleMessage(error.message)) return false
  if (error.statusCode === 404) return true
  const code = error.bungieErrorCode ?? 0
  if (code === 1601 || code === 1617 || code === 1618 || code === 1620 || code === 1622) return true
  const message = error.message.toLowerCase()
  return message.includes('not found') || message.includes('no character') || message.includes('character not')
}

function isThrottle(error: unknown): boolean {
  if (!(error instanceof BungieApiError)) return false
  return (
    error.statusCode === 429 ||
    isBungieThrottleCode(error.bungieErrorCode) ||
    isBungieThrottleMessage(error.message)
  )
}

function friendlyFailure(error: unknown): string {
  if (error instanceof BungieApiError && (error.statusCode === 401 || error.bungieErrorCode === 99)) {
    return 'Bungie session expired. Reconnect and try again.'
  }
  if (isThrottle(error)) {
    return 'Bungie is rate limiting requests. Saved runs stay put, and the sync will continue.'
  }
  if (error instanceof Error && error.message) {
    if (/expired|reconnect/i.test(error.message)) return error.message
    return 'Bungie could not return activity history right now. Saved runs are still shown.'
  }
  return 'Bungie could not return activity history right now. Saved runs are still shown.'
}

async function discoverCharacters(
  accessToken: string,
  stored: StoredDestinyUser
): Promise<HistoryCharacterCursor[]> {
  let memberships: Array<{ membershipType: number; membershipId: string }> = []
  try {
    const response = await getDestinyMembershipsForCurrentUser(accessToken)
    memberships = (response.destinyMemberships ?? [])
      .filter((membership) => membership.membershipId && membership.membershipType > 0)
      .map((membership) => ({
        membershipType: membership.membershipType,
        membershipId: membership.membershipId,
      }))
  } catch (error) {
    if (isThrottle(error)) throw error
    console.warn('[activityHistory] membership lookup failed', error)
  }

  if (!memberships.length && stored.destinyMembershipType && stored.bungieMembershipId) {
    memberships = [
      { membershipType: stored.destinyMembershipType, membershipId: stored.bungieMembershipId },
    ]
  }

  const cursors: HistoryCharacterCursor[] = []
  for (const membership of memberships) {
    let profileCharacters: ReturnType<typeof parseProfileCharacters> = []
    try {
      const profile = await getPlayerProfile(
        membership.membershipType,
        membership.membershipId,
        [200],
        accessToken,
        true
      )
      profileCharacters = parseProfileCharacters(profile)
    } catch (error) {
      if (isThrottle(error)) throw error
      console.warn('[activityHistory] profile characters failed', membership.membershipId, error)
    }

    let historical: ReturnType<typeof parseHistoricalCharacters> = []
    try {
      const stats = await getHistoricalStatsForAccount(
        membership.membershipType,
        membership.membershipId,
        accessToken
      )
      historical = parseHistoricalCharacters(stats)
    } catch (error) {
      if (isThrottle(error)) throw error
      console.warn('[activityHistory] historical stats failed', membership.membershipId, error)
    }

    const byId = new Map<string, { classType?: number; light?: number; deleted: boolean; historical?: HistoryCharacterCursor['historical'] }>()
    for (const character of profileCharacters) {
      byId.set(character.characterId, {
        classType: character.classType,
        light: character.light,
        deleted: false,
      })
    }
    for (const character of historical) {
      const existing = byId.get(character.characterId)
      const summary = {
        activitiesEntered: character.activitiesEntered,
        kills: character.kills,
        deaths: character.deaths,
        secondsPlayed: character.secondsPlayed,
      }
      if (existing) {
        existing.historical = summary
      } else {
        byId.set(character.characterId, { deleted: true, historical: summary })
      }
    }

    const platformLabel = bungieMembershipTypeLabel(membership.membershipType)
    for (const [characterId, info] of Array.from(byId.entries())) {
      cursors.push(
        newCharacterCursor({
          membershipType: membership.membershipType,
          membershipId: membership.membershipId,
          characterId,
          classLabel: classLabelFromType(info.classType, info.deleted),
          platformLabel,
          light: info.light,
          deleted: info.deleted,
          historical: info.historical,
        })
      )
    }
  }

  cursors.sort((a, b) => Number(a.deleted) - Number(b.deleted) || a.classLabel.localeCompare(b.classLabel))
  return cursors
}

async function fetchParsedPage(
  cursor: HistoryCharacterCursor,
  page: number,
  accessToken: string
): Promise<ParsedHistoryActivity[]> {
  const response = await getActivityHistoryPage(
    cursor.membershipType,
    cursor.membershipId,
    cursor.characterId,
    { mode: 0, count: ACTIVITY_HISTORY_PAGE_SIZE, page, accessToken }
  )
  const rows = (response?.activities ?? []) as RawHistoryActivity[]
  return rows
    .map((row) => parseHistoryActivity(row))
    .filter((row): row is ParsedHistoryActivity => row != null)
}

async function resolvePendingNames(userId: string, deadline: number): Promise<void> {
  if (Date.now() > deadline) return
  const hashes = await listUnresolvedActivityHashes(userId, NAME_LOOKUPS_PER_CHUNK)
  for (const hash of hashes) {
    if (Date.now() > deadline) return
    try {
      await waitForBungieSlot()
      const definition = await resolveActivityByHash(hash)
      await renameActivities(userId, hash, definition.name, definition.iconUrl)
    } catch (error) {
      console.warn('[activityHistory] activity name lookup failed', hash, error)
    }
  }
}

function needsDiscovery(state: ActivityHistorySyncDocument, action: 'start' | 'continue'): boolean {
  if (!state.characters.length || !state.discoveredAt) return true
  if (action !== 'start') return false
  const discovered = Date.parse(state.discoveredAt)
  if (!Number.isFinite(discovered)) return true
  return Date.now() - discovered > DISCOVERY_MAX_AGE_MS
}

export async function getActivitySyncView(userId: string): Promise<ActivitySyncView> {
  const state = await getActivitySyncState(userId)
  return toActivitySyncView(state)
}

export async function runActivityHistoryChunk(
  userId: string,
  stored: StoredDestinyUser,
  action: 'start' | 'continue'
): Promise<ActivitySyncChunkResult> {
  const claim = await claimActivitySyncLock(userId)
  if (!claim.claimed) {
    return { sync: toActivitySyncView(claim.state), complete: false, blocked: true, retryAfterMs: 1200 }
  }

  let state = claim.state
  try {
    const accessToken = await getValidAccessToken(stored)
    if (!accessToken) {
      state = {
        ...state,
        status: 'error',
        error: 'Bungie session expired. Reconnect and try again.',
        updatedAt: new Date().toISOString(),
      }
      await saveActivitySyncState(state)
      return { sync: toActivitySyncView(state), complete: false, authError: true }
    }

    if (action === 'start') {
      state = { ...state, characters: prepareSyncPass(state.characters), error: undefined }
    }

    if (needsDiscovery(state, action)) {
      const discovered = await discoverCharacters(accessToken, stored)
      state = {
        ...state,
        characters: mergeCharacterCursors(state.characters, discovered),
        discoveredAt: new Date().toISOString(),
        limitations: limitationsFor(mergeCharacterCursors(state.characters, discovered), state.limitations),
      }
      if (!state.characters.length) {
        state.status = 'error'
        state.error = 'No Destiny characters were found on your Bungie account.'
        state.updatedAt = new Date().toISOString()
        await saveActivitySyncState(state)
        return { sync: toActivitySyncView(state), complete: false }
      }
    }

    const deadline = Date.now() + CHUNK_BUDGET_MS
    let pagesLeft = PAGE_BUDGET

    while (pagesLeft > 0 && Date.now() < deadline) {
      const target = nextSyncCharacter(state.characters)
      if (!target) break
      if (target.cursor.pagesFetched >= MAX_CHARACTER_PAGES && !target.cursor.backfillComplete) {
        const characters = state.characters.slice()
        characters[target.index] = {
          ...target.cursor,
          backfillComplete: true,
          incrementalDone: true,
        }
        const capNote =
          'Sync stopped after 100,000 runs on a character so a Bungie paging glitch cannot run forever. Saved runs are kept.'
        state = {
          ...state,
          characters,
          limitations: limitationsFor(characters, [...state.limitations, capNote]),
        }
        continue
      }
      try {
        const result = await advanceCharacterSync(
          target.cursor,
          (page) => fetchParsedPage(target.cursor, page, accessToken),
          pagesLeft
        )
        const characters = state.characters.slice()
        characters[target.index] = result.cursor
        state = {
          ...state,
          characters,
          pagesFetched: state.pagesFetched + result.pagesUsed,
        }
        if (result.upserts.length) {
          await upsertParsedActivities(userId, result.cursor, result.upserts)
        }
        pagesLeft -= result.pagesUsed
        if (result.pagesUsed === 0) break
      } catch (error) {
        if (isCharacterHistoryUnavailable(error)) {
          const characters = state.characters.slice()
          characters[target.index] = {
            ...target.cursor,
            unavailableReason: DELETED_CHARACTER_HISTORY_REASON,
            backfillComplete: true,
            incrementalDone: true,
          }
          state = { ...state, characters, limitations: limitationsFor(characters, state.limitations) }
          continue
        }
        if (isThrottle(error)) {
          state.activitiesStored = await countStoredActivities(userId)
          state.status = 'running'
          state.updatedAt = new Date().toISOString()
          await saveActivitySyncState(state)
          await resolvePendingNames(userId, deadline)
          return {
            sync: toActivitySyncView(state),
            complete: false,
            paused: true,
            retryAfterMs: 3000,
          }
        }
        throw error
      }
    }

    await resolvePendingNames(userId, deadline)
    state.activitiesStored = await countStoredActivities(userId)
    const complete = isSyncComplete(state.characters)
    state.status = complete ? 'complete' : 'running'
    state.error = undefined
    state.limitations = limitationsFor(state.characters, state.limitations)
    state.updatedAt = new Date().toISOString()
    await saveActivitySyncState(state)
    return { sync: toActivitySyncView(state), complete }
  } catch (error) {
    console.error('[activityHistory] sync chunk failed', error)
    const message = friendlyFailure(error)
    const authError = /expired|reconnect/i.test(message)
    state = {
      ...state,
      status: 'error',
      error: message,
      activitiesStored: state.activitiesStored,
      updatedAt: new Date().toISOString(),
    }
    try {
      state.activitiesStored = await countStoredActivities(userId)
      await saveActivitySyncState(state)
    } catch (saveError) {
      console.error('[activityHistory] could not save sync error', saveError)
    }
    return { sync: toActivitySyncView(state), complete: false, authError }
  } finally {
    await releaseActivitySyncLock(userId)
  }
}

export function activityKindOptions(): Array<{ id: string; label: string }> {
  const kinds = [
    'raid',
    'dungeon',
    'nightfall',
    'strike',
    'crucible',
    'gambit',
    'dares',
    'lostSector',
    'story',
    'patrol',
    'social',
    'other',
  ] as const
  return kinds.map((id) => ({ id, label: activityKindLabel(id) }))
}
