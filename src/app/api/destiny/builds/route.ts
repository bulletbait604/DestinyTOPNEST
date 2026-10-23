import { NextRequest, NextResponse } from 'next/server'
import { AuthError, createAuthErrorResponse, verifyAuth } from '@/lib/auth/verifyAuth'
import { destinyAuthHandler } from '@/lib/destiny/apiHandler'
import { BungieApiError } from '@/lib/destiny/bungieClient'
import { communityBuildError, communityBuildJson, readJsonObject } from '@/lib/destiny/communityBuildHttp'
import {
  communityBuildDraftFromSnapshot,
  communityBuildFromEquippedDraft,
  communityBuildFromInGameLoadout,
  isCommunityActivityTag,
  parseInGameLoadoutSummary,
  toCommunityBuildPublic,
  validateCommunityBuildInput,
  type CommunityActivityTag,
  type CommunityBuildContent,
  type InGameLoadoutPublishOverrides,
} from '@/lib/destiny/communityBuildModel'
import { takeCommunityBuildRateLimit } from '@/lib/destiny/communityBuildRateLimit'
import { createCommunityBuild } from '@/lib/destiny/communityBuildStore'
import { getCachedBuildsPayload } from '@/lib/destiny/dataCache'
import { getDestinyUserBySiteUserId, getValidAccessToken } from '@/lib/destiny/destinyUserStore'
import { destinyApiConfigured } from '@/lib/destiny/env'
import { lookupInGameLoadouts } from '@/lib/destiny/inGameLoadoutLookup'
import { fetchLiveLoadout } from '@/lib/destiny/liveBungieData'
import { cacheControlUntilWeeklyReset } from '@/lib/destiny/weeklyRotation'
import type { InGameLoadoutSummary } from '@/lib/destiny/types'

export const dynamic = 'force-dynamic'

const MAX_BATCH = 36

function bungieFailure(error: unknown): NextResponse {
  if (error instanceof BungieApiError) {
    const status = error.statusCode >= 400 && error.statusCode < 600 ? error.statusCode : 502
    return communityBuildError(error.message, status)
  }
  console.error('[destiny builds]', error)
  return communityBuildError('Could not read in-game loadouts.', 502)
}

function overridesFrom(body: Record<string, unknown>): InGameLoadoutPublishOverrides {
  const name = typeof body.name === 'string' ? body.name : undefined
  const description =
    typeof body.description === 'string' ? body.description : typeof body.notes === 'string' ? body.notes : undefined
  const activityTags: CommunityActivityTag[] = []
  if (Array.isArray(body.activityTags)) {
    for (const tag of body.activityTags) {
      if (typeof tag === 'string' && isCommunityActivityTag(tag)) activityTags.push(tag)
    }
  }
  return {
    name,
    description,
    activityTags: activityTags.length ? activityTags : undefined,
  }
}

function contentForLoadout(
  loadout: InGameLoadoutSummary,
  overrides?: InGameLoadoutPublishOverrides
): { ok: true; value: CommunityBuildContent } | { ok: false; error: string } {
  return communityBuildFromInGameLoadout(loadout, overrides)
}

async function contentForCharacter(
  userId: string,
  characterId: string,
  loadoutIndex: number | undefined,
  overrides: InGameLoadoutPublishOverrides
): Promise<{ ok: true; value: CommunityBuildContent } | { ok: false; error: string; status: number }> {
  if (!/^\d{1,22}$/.test(characterId)) return { ok: false, error: 'Invalid character.', status: 400 }
  if (!destinyApiConfigured()) {
    return { ok: false, error: 'Bungie sign-in is not ready on this site yet.', status: 503 }
  }
  const stored = await getDestinyUserBySiteUserId(userId)
  const accessToken = stored ? await getValidAccessToken(stored) : null
  const membershipType = stored?.destinyMembershipType
  const membershipId = stored?.bungieMembershipId
  if (!stored?.oauth || !accessToken || !membershipType || !membershipId) {
    return { ok: false, error: 'Reconnect Bungie to publish an in-game loadout.', status: 401 }
  }

  if (loadoutIndex == null) {
    const live = await fetchLiveLoadout(stored, characterId)
    if (!live) return { ok: false, error: 'Could not read that character’s equipped loadout.', status: 404 }
    const draft = communityBuildDraftFromSnapshot(live, characterId)
    const built = communityBuildFromEquippedDraft(draft, overrides)
    if (!built.ok) return { ok: false, error: built.error, status: 400 }
    return built
  }

  if (!Number.isInteger(loadoutIndex) || loadoutIndex < 0 || loadoutIndex > 15) {
    return { ok: false, error: 'Loadout slot must be between 1 and 16.', status: 400 }
  }
  try {
    const looked = await lookupInGameLoadouts({ membershipId, membershipType, accessToken })
    const character = looked.snapshot.characters.find((entry) => entry.characterId === characterId)
    const loadout = character?.inGameLoadouts.find((entry) => entry.index === loadoutIndex)
    if (!loadout) return { ok: false, error: 'That in-game loadout is empty or missing.', status: 404 }
    const built = contentForLoadout(loadout, overrides)
    if (!built.ok) return { ok: false, error: built.error, status: 400 }
    return built
  } catch (error) {
    if (error instanceof BungieApiError) {
      return { ok: false, error: error.message, status: error.statusCode || 502 }
    }
    return { ok: false, error: 'Could not read in-game loadouts.', status: 502 }
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  if (searchParams.get('scope') === 'loadouts') {
    return loadoutsGet(req)
  }

  return destinyAuthHandler(req, async () => {
    const activity = searchParams.get('activity') ?? ''
    const payload = await getCachedBuildsPayload(activity)
    const res = NextResponse.json(payload)
    res.headers.set(
      'Cache-Control',
      cacheControlUntilWeeklyReset(new Date(), { scope: 'private', maxAge: 120, staleWhileRevalidate: 300 })
    )
    return res
  })
}

async function loadoutsGet(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get('q')?.trim() ?? ''
  const membershipId = searchParams.get('membershipId')?.trim() ?? ''

  if (!destinyApiConfigured()) {
    return communityBuildError('Bungie sign-in is not ready on this site yet.', 503)
  }

  let accessToken: string | undefined
  let membershipType: number | undefined
  let id = membershipId
  if (!query && !id) {
    try {
      const authUser = await verifyAuth(req)
      const stored = await getDestinyUserBySiteUserId(authUser.username.toLowerCase())
      accessToken = stored ? (await getValidAccessToken(stored)) ?? undefined : undefined
      id = stored?.bungieMembershipId ?? ''
      membershipType = stored?.destinyMembershipType
      if (!stored?.oauth || !accessToken || !id) {
        const res = communityBuildJson({
          linked: false,
          displayName: '',
          characters: [],
          equipped: [],
          loadouts: [],
          message: 'Reconnect Bungie to load in-game loadouts.',
        })
        res.headers.set('Cache-Control', 'private, no-store')
        return res
      }
    } catch (error) {
      if (error instanceof AuthError) return createAuthErrorResponse(error)
      console.error('[destiny builds loadouts]', error)
      return communityBuildError('Internal server error', 500)
    }
  }

  try {
    const looked = await lookupInGameLoadouts({
      query: query || undefined,
      membershipId: id || undefined,
      membershipType,
      accessToken,
    })
    const characters = looked.snapshot.characters
    const res = communityBuildJson({
      linked: true,
      displayName: looked.displayName,
      membershipId: looked.membershipId,
      characters,
      equipped: characters.map((character) => character.equipped).filter(Boolean),
      loadouts: characters.flatMap((character) => character.inGameLoadouts),
    })
    res.headers.set('Cache-Control', 'private, no-store')
    return res
  } catch (error) {
    return bungieFailure(error)
  }
}

export async function POST(req: NextRequest) {
  return destinyAuthHandler(req, async () => {
    const authUser = await verifyAuth(req)
    const body = await readJsonObject(req)
    if (!body) return communityBuildError('Build details must be an object.', 400)

    const userId = authUser.username.toLowerCase()
    const stored = await getDestinyUserBySiteUserId(userId)
    const ownerDisplayName = stored?.bungieDisplayName || authUser.displayName
    const overrides = overridesFrom(body)

    const contents: CommunityBuildContent[] = []
    const errors: string[] = []

    if (Array.isArray(body.saves)) {
      if (body.saves.length > MAX_BATCH) {
        return communityBuildError(`Save up to ${MAX_BATCH} in-game loadouts at once.`, 400)
      }
      for (const entry of body.saves) {
        const row = entry && typeof entry === 'object' && !Array.isArray(entry) ? (entry as Record<string, unknown>) : null
        const parsed = parseInGameLoadoutSummary(row?.loadout ?? entry)
        if (!parsed) {
          errors.push('One in-game loadout could not be read.')
          continue
        }
        const built = contentForLoadout(parsed, { ...overrides, ...overridesFrom(row ?? {}) })
        if (!built.ok) errors.push(built.error)
        else contents.push(built.value)
      }
    } else if (body.loadout) {
      const parsed = parseInGameLoadoutSummary(body.loadout)
      if (!parsed) return communityBuildError('That in-game loadout could not be read.', 400)
      const built = contentForLoadout(parsed, overrides)
      if (!built.ok) return communityBuildError(built.error, 400)
      contents.push(built.value)
    } else if (typeof body.characterId === 'string') {
      const index =
        typeof body.loadoutIndex === 'number'
          ? body.loadoutIndex
          : typeof body.loadoutIndex === 'string' && /^\d+$/.test(body.loadoutIndex)
            ? Number(body.loadoutIndex)
            : undefined
      if (body.loadoutIndex != null && index == null) {
        return communityBuildError('Loadout slot must be between 1 and 16.', 400)
      }
      const built = await contentForCharacter(userId, body.characterId.trim(), index, overrides)
      if (!built.ok) return communityBuildError(built.error, built.status)
      contents.push(built.value)
    } else {
      const built = validateCommunityBuildInput(body)
      if (!built.ok) return communityBuildError(built.error, 400)
      contents.push(built.value)
    }

    if (!contents.length) {
      return communityBuildError(errors[0] || 'Nothing to save.', 400)
    }

    const limited = takeCommunityBuildRateLimit({ userId, action: 'create' })
    if (!limited.ok) {
      return communityBuildError('You are sharing builds too quickly. Try again later.', 429, limited.retryAfterSec)
    }

    const published = []
    for (const content of contents) {
      const created = await createCommunityBuild({
        ownerUserId: userId,
        ownerDisplayName,
        ownerEmblemUrl: stored?.emblemUrl,
        content,
      })
      if (!created.ok) {
        errors.push(created.error)
        break
      }
      published.push(
        toCommunityBuildPublic(created.build, { userId, staff: false, upvoted: false, saved: false })
      )
    }

    if (!published.length) return communityBuildError(errors[0] || 'Could not share this build.', 400)

    return communityBuildJson(
      {
        build: published[0],
        builds: published,
        saved: published.length,
        errors,
      },
      201
    )
  })
}
