import { NextRequest } from 'next/server'
import { verifyAuth } from '@/lib/auth/verifyAuth'
import { destinyAuthHandler } from '@/lib/destiny/apiHandler'
import { readCommunityBuildViewer } from '@/lib/destiny/communityBuildAccess'
import { communityBuildError, communityBuildJson, readJsonObject } from '@/lib/destiny/communityBuildHttp'
import { isCommunityBuildId, toCommunityBuildPublic, validateCommunityBuildInput } from '@/lib/destiny/communityBuildModel'
import { takeCommunityBuildRateLimit } from '@/lib/destiny/communityBuildRateLimit'
import {
  deleteCommunityBuild,
  getCommunityBuild,
  updateCommunityBuildContent,
  viewerFlagsForBuilds,
} from '@/lib/destiny/communityBuildStore'
import { getDestinyUserBySiteUserId } from '@/lib/destiny/destinyUserStore'
import { featuredBuildById } from '@/lib/destiny/featuredBuilds'

function databaseUnavailable(error: unknown): boolean {
  const message = error instanceof Error ? error.message : ''
  return /database is not connected|ECONNREFUSED|MongoServerSelection/i.test(message)
}

export const dynamic = 'force-dynamic'

function buildId(params: { id: string }): string | null {
  return isCommunityBuildId(params.id) ? params.id : null
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = buildId(params)
    if (!id) return communityBuildError('Build not found.', 404)

    let build = null
    try {
      build = await getCommunityBuild(id)
    } catch (error) {
      if (!databaseUnavailable(error)) throw error
    }
    if (!build) {
      const curated = featuredBuildById(id)
      if (!curated) return communityBuildError('Build not found.', 404)
      return communityBuildJson({ build: toCommunityBuildPublic(curated, {}) })
    }

    const viewer = await readCommunityBuildViewer(req)
    const userId = viewer.user?.username.toLowerCase()
    const owns = Boolean(userId && userId === build.ownerUserId)
    if (build.status !== 'published' && !owns && !viewer.staff) {
      return communityBuildError('Build not found.', 404)
    }

    const flags = await viewerFlagsForBuilds([build.id], userId)
    return communityBuildJson({
      build: toCommunityBuildPublic(build, {
        userId,
        staff: viewer.staff,
        upvoted: flags.upvoted.has(build.id),
        saved: flags.saved.has(build.id),
      }),
    })
  } catch (error) {
    console.error('[community-builds id GET]', error)
    return communityBuildError('Internal server error', 500)
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  return destinyAuthHandler(req, async () => {
    const id = buildId(params)
    if (!id) return communityBuildError('Build not found.', 404)

    const authUser = await verifyAuth(req)
    const viewer = await readCommunityBuildViewer(req)
    const body = await readJsonObject(req)
    if (!body) return communityBuildError('Build details must be an object.', 400)

    const parsed = validateCommunityBuildInput(body)
    if (!parsed.ok) return communityBuildError(parsed.error, 400)

    const userId = authUser.username.toLowerCase()
    const limited = takeCommunityBuildRateLimit({ userId, action: 'update' })
    if (!limited.ok) {
      return communityBuildError('You are editing builds too quickly. Try again later.', 429, limited.retryAfterSec)
    }

    const stored = await getDestinyUserBySiteUserId(userId)
    const updated = await updateCommunityBuildContent(id, userId, parsed.value, viewer.staff, {
      displayName: stored?.bungieDisplayName || authUser.displayName,
      emblemUrl: stored?.emblemUrl,
    })
    if (!updated.ok) return communityBuildError(updated.error, updated.status)

    const flags = await viewerFlagsForBuilds([updated.build.id], userId)
    return communityBuildJson({
      build: toCommunityBuildPublic(updated.build, {
        userId,
        staff: viewer.staff,
        upvoted: flags.upvoted.has(updated.build.id),
        saved: flags.saved.has(updated.build.id),
      }),
    })
  })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  return destinyAuthHandler(req, async () => {
    const id = buildId(params)
    if (!id) return communityBuildError('Build not found.', 404)

    const authUser = await verifyAuth(req)
    const viewer = await readCommunityBuildViewer(req)
    const result = await deleteCommunityBuild(id, authUser.username.toLowerCase(), viewer.staff)
    if (!result.ok) return communityBuildError(result.error, result.status)
    return communityBuildJson({ ok: true })
  })
}
