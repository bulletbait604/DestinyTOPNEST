import { NextRequest, NextResponse } from 'next/server'
import { getMongoDbName } from '@/lib/database'
import { verifyAuth } from '@/lib/auth/verifyAuth'
import { destinyAuthHandler } from '@/lib/destiny/apiHandler'
import { resolveActiveCharacterId, syncProfileWithActiveCharacter } from '@/lib/destiny/activeCharacter'
import { enrichProfile } from '@/lib/destiny/enrich'
import { resolveDisplayEmblem } from '@/lib/destiny/guardianEmblems'
import { fetchAllCharactersPresentation } from '@/lib/destiny/guardianPresentation'
import { getDestinyUserBySiteUserId, getValidAccessToken, upsertDestinyUser } from '@/lib/destiny/destinyUserStore'
import { fetchLiveClan, fetchLiveLoadout, refreshGuardianFromBungie } from '@/lib/destiny/liveBungieData'
import { buildPlayerProfileFromStored, emptyPlayerProfile } from '@/lib/destiny/profileBuilder'
import { sanitizeFlexPreferences } from '@/lib/destiny/profileFlex'
import { guardianPointsForUser } from '@/lib/destiny/mvpVoting'
import {
  getReputationReviewsForUser,
  getRunsForUser,
  getSeasonData,
  getSeasonStandingForUser,
  getTrustReviewsForUser,
  loadAllMvpVotes,
} from '@/lib/destiny/store'

export const dynamic = 'force-dynamic'

async function fetchProfileCharacters(stored: Awaited<ReturnType<typeof getDestinyUserBySiteUserId>>) {
  if (!stored?.oauth) return undefined
  const accessToken = await getValidAccessToken(stored)
  const membershipType = stored.destinyMembershipType
  const membershipId = stored.bungieMembershipId
  if (!accessToken || !membershipType || !membershipId) return undefined

  try {
    return await fetchAllCharactersPresentation(membershipType, membershipId, accessToken)
  } catch {
    return undefined
  }
}

async function buildProfile(
  siteUserId: string,
  scope: 'summary' | 'full',
  requestedCharacterId?: string | null
) {
  let stored = await getDestinyUserBySiteUserId(siteUserId)

  if (!stored?.oauth) {
    return {
      profile: await enrichProfile(emptyPlayerProfile(siteUserId), scope),
      bungieLinked: false,
    }
  }

  stored = await refreshGuardianFromBungie(stored)
  await fetchLiveClan(stored).catch(() => null)
  stored = (await getDestinyUserBySiteUserId(siteUserId)) ?? stored

  const characters = (await fetchProfileCharacters(stored)) ?? []
  const activeCharacterId = resolveActiveCharacterId(
    requestedCharacterId ?? stored.activeCharacterId,
    characters
  )

  if (activeCharacterId && activeCharacterId !== stored.activeCharacterId) {
    stored = await upsertDestinyUser(siteUserId, { activeCharacterId })
  }

  const displayEmblem = await resolveDisplayEmblem(stored)

  let loadout = undefined
  if (scope === 'full' && activeCharacterId) {
    loadout = (await fetchLiveLoadout(stored, activeCharacterId).catch(() => null)) ?? undefined
  }

  const [runs, reviews, trustReviews, seasonLeaderboardEntries, season, mvpVotes] = await Promise.all([
    scope === 'full' ? getRunsForUser(siteUserId) : Promise.resolve([]),
    scope === 'full' ? getReputationReviewsForUser(siteUserId) : Promise.resolve([]),
    getTrustReviewsForUser(siteUserId, stored?.bungieMembershipId),
    scope === 'full' ? getSeasonStandingForUser(siteUserId) : Promise.resolve([]),
    getSeasonData(),
    loadAllMvpVotes(),
  ])

  const guardianPoints = guardianPointsForUser(siteUserId, mvpVotes, 'monthly', season)

  const profile = syncProfileWithActiveCharacter(
    buildPlayerProfileFromStored(stored, runs, {
      loadout,
      reviews,
      trustReviews,
      seasonLeaderboardEntries,
      displayEmblem,
      characters,
      guardianPoints,
    })
  )

  return {
    profile: await enrichProfile(profile, scope),
    bungieLinked: true,
  }
}

export async function GET(req: NextRequest) {
  return destinyAuthHandler(req, async () => {
    const authUser = await verifyAuth(req)
    const siteUserId = authUser.username.toLowerCase()
    const params = new URL(req.url).searchParams
    const scope = params.get('scope') === 'full' ? 'full' : 'summary'
    const characterId = params.get('characterId')

    const result = await buildProfile(siteUserId, scope, characterId)
    return NextResponse.json(result)
  })
}

export async function PATCH(req: NextRequest) {
  return destinyAuthHandler(req, async () => {
    const authUser = await verifyAuth(req)
    const siteUserId = authUser.username.toLowerCase()
    const stored = await getDestinyUserBySiteUserId(siteUserId)

    if (!stored?.oauth) {
      return NextResponse.json({ error: 'Link Bungie before customizing your profile' }, { status: 400 })
    }

    const body = (await req.json().catch(() => null)) as {
      profileFlexStats?: unknown
      displayEmblemSource?: 'equipped' | 'collection'
      displayEmblemHash?: number | null
      activeCharacterId?: string
    } | null

    const patch: Record<string, unknown> = {}

    if (body?.profileFlexStats !== undefined) {
      patch.profileFlexStats = sanitizeFlexPreferences(body.profileFlexStats)
    }

    if (body?.displayEmblemSource === 'equipped') {
      patch.displayEmblemSource = 'equipped'
    } else if (body?.displayEmblemSource === 'collection' && body.displayEmblemHash) {
      patch.displayEmblemSource = 'collection'
      patch.displayEmblemHash = body.displayEmblemHash
    }

    if (body?.activeCharacterId) {
      const characters = (await fetchProfileCharacters(stored)) ?? []
      const valid = resolveActiveCharacterId(body.activeCharacterId, characters)
      if (!valid || valid !== body.activeCharacterId) {
        return NextResponse.json({ error: 'Invalid character' }, { status: 400 })
      }
      patch.activeCharacterId = valid
    }

    if (!Object.keys(patch).length) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    await upsertDestinyUser(siteUserId, patch)

    if (body?.displayEmblemSource === 'equipped') {
      const client = await (await import('@/lib/mongodb')).default
      const { DESTINY_COLLECTIONS } = await import('@/lib/destiny/collections')
      await client.db(getMongoDbName()).collection(DESTINY_COLLECTIONS.users).updateOne(
        { userId: siteUserId },
        { $unset: { displayEmblemHash: '' } }
      )
    }

    if (patch.activeCharacterId) {
      const result = await buildProfile(siteUserId, 'full', String(patch.activeCharacterId))
      return NextResponse.json(result)
    }

    const displayEmblem = await resolveDisplayEmblem((await getDestinyUserBySiteUserId(siteUserId))!)

    return NextResponse.json({
      profileFlexStats: patch.profileFlexStats,
      displayEmblemSource: patch.displayEmblemSource ?? stored.displayEmblemSource,
      displayEmblemHash: patch.displayEmblemHash ?? stored.displayEmblemHash,
      displayEmblem,
    })
  })
}
