import { NextRequest, NextResponse } from 'next/server'
import { getMongoDbName } from '@/lib/database'
import { verifyAuth } from '@/lib/auth/verifyAuth'
import { destinyAuthHandler } from '@/lib/destiny/apiHandler'
import { resolveActiveCharacterId } from '@/lib/destiny/activeCharacter'
import { resolveDisplayEmblem } from '@/lib/destiny/guardianEmblems'
import { fetchAllCharactersPresentation } from '@/lib/destiny/guardianPresentation'
import { getDestinyUserBySiteUserId, upsertDestinyUser } from '@/lib/destiny/destinyUserStore'
import { buildUserProfile } from '@/lib/destiny/profileService'
import { sanitizeFlexPreferences } from '@/lib/destiny/profileFlex'

export const dynamic = 'force-dynamic'

async function fetchProfileCharacters(stored: Awaited<ReturnType<typeof getDestinyUserBySiteUserId>>) {
  if (!stored?.oauth) return undefined
  const { getValidAccessToken } = await import('@/lib/destiny/destinyUserStore')
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

export async function GET(req: NextRequest) {
  return destinyAuthHandler(req, async () => {
    const authUser = await verifyAuth(req)
    const siteUserId = authUser.username.toLowerCase()
    const params = new URL(req.url).searchParams
    const scope = params.get('scope') === 'full' ? 'full' : 'summary'
    const characterId = params.get('characterId')

    const result = await buildUserProfile(siteUserId, scope, characterId)
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
      const result = await buildUserProfile(siteUserId, 'full', String(patch.activeCharacterId))
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
