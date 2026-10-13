import { NextRequest } from 'next/server'
import { verifyAuth } from '@/lib/auth/verifyAuth'
import { destinyAuthHandler } from '@/lib/destiny/apiHandler'
import { readCommunityBuildViewer } from '@/lib/destiny/communityBuildAccess'
import { communityBuildError, communityBuildJson, readJsonObject } from '@/lib/destiny/communityBuildHttp'
import {
  parseCommunityBuildListQuery,
  toCommunityBuildPublic,
  validateCommunityBuildInput,
} from '@/lib/destiny/communityBuildModel'
import { takeCommunityBuildRateLimit } from '@/lib/destiny/communityBuildRateLimit'
import {
  createCommunityBuild,
  listCommunityBuilds,
  viewerFlagsForBuilds,
} from '@/lib/destiny/communityBuildStore'
import { getDestinyUserBySiteUserId } from '@/lib/destiny/destinyUserStore'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const parsed = parseCommunityBuildListQuery(req.nextUrl.searchParams)
    if (!parsed.ok) return communityBuildError(parsed.error, 400)

    const viewer = await readCommunityBuildViewer(req)
    if ((parsed.query.scope === 'mine' || parsed.query.scope === 'saved') && !viewer.user) {
      return communityBuildError('Sign in to view that list.', 401)
    }

    const userId = viewer.user?.username.toLowerCase()
    const { builds, total } = await listCommunityBuilds(parsed.query, userId)
    const flags = await viewerFlagsForBuilds(
      builds.map((build) => build.id),
      userId
    )

    return communityBuildJson({
      builds: builds.map((build) =>
        toCommunityBuildPublic(build, {
          userId,
          staff: viewer.staff,
          upvoted: flags.upvoted.has(build.id),
          saved: flags.saved.has(build.id),
        })
      ),
      total,
      limit: parsed.query.limit,
      offset: parsed.query.offset,
    })
  } catch (error) {
    console.error('[community-builds GET]', error)
    return communityBuildError('Internal server error', 500)
  }
}

export async function POST(req: NextRequest) {
  return destinyAuthHandler(req, async () => {
    const authUser = await verifyAuth(req)
    const body = await readJsonObject(req)
    if (!body) return communityBuildError('Build details must be an object.', 400)

    const parsed = validateCommunityBuildInput(body)
    if (!parsed.ok) return communityBuildError(parsed.error, 400)

    const userId = authUser.username.toLowerCase()
    const limited = takeCommunityBuildRateLimit({ userId, action: 'create' })
    if (!limited.ok) {
      return communityBuildError('You are sharing builds too quickly. Try again later.', 429, limited.retryAfterSec)
    }

    const stored = await getDestinyUserBySiteUserId(userId)
    const created = await createCommunityBuild({
      ownerUserId: userId,
      ownerDisplayName: stored?.bungieDisplayName || authUser.displayName,
      ownerEmblemUrl: stored?.emblemUrl,
      content: parsed.value,
    })
    if (!created.ok) return communityBuildError(created.error, created.status)

    return communityBuildJson(
      {
        build: toCommunityBuildPublic(created.build, {
          userId,
          staff: false,
          upvoted: false,
          saved: false,
        }),
      },
      201
    )
  })
}
