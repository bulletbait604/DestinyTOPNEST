import { NextRequest } from 'next/server'
import { verifyAuth } from '@/lib/auth/verifyAuth'
import { destinyAuthHandler } from '@/lib/destiny/apiHandler'
import { readCommunityBuildViewer } from '@/lib/destiny/communityBuildAccess'
import { communityBuildError, communityBuildJson, readJsonObject } from '@/lib/destiny/communityBuildHttp'
import {
  isCommunityBuildId,
  validateCommunityBuildComment,
  type CommunityBuildCommentPublic,
} from '@/lib/destiny/communityBuildModel'
import { takeCommunityBuildRateLimit } from '@/lib/destiny/communityBuildRateLimit'
import {
  addCommunityBuildComment,
  getCommunityBuild,
  listCommunityBuildComments,
  type CommunityBuildCommentRecord,
} from '@/lib/destiny/communityBuildStore'

export const dynamic = 'force-dynamic'

function presentComment(
  comment: CommunityBuildCommentRecord,
  userId: string | undefined
): CommunityBuildCommentPublic {
  return {
    id: comment.id,
    authorDisplayName: comment.authorDisplayName,
    body: comment.body,
    createdAt: comment.createdAt,
    status: comment.status,
    viewerOwns: Boolean(userId && userId === comment.authorUserId),
  }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!isCommunityBuildId(params.id)) return communityBuildError('Build not found.', 404)
    const build = await getCommunityBuild(params.id)
    if (!build) return communityBuildError('Build not found.', 404)

    const viewer = await readCommunityBuildViewer(req)
    const userId = viewer.user?.username.toLowerCase()
    const owns = Boolean(userId && userId === build.ownerUserId)
    if (build.status !== 'published' && !owns && !viewer.staff) {
      return communityBuildError('Build not found.', 404)
    }

    const comments = await listCommunityBuildComments(params.id, viewer.staff)
    return communityBuildJson({
      comments: comments.map((comment) => presentComment(comment, userId)),
    })
  } catch (error) {
    console.error('[community-builds comments GET]', error)
    return communityBuildError('Internal server error', 500)
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return destinyAuthHandler(req, async () => {
    if (!isCommunityBuildId(params.id)) return communityBuildError('Build not found.', 404)
    const authUser = await verifyAuth(req)
    const body = await readJsonObject(req)
    const parsed = validateCommunityBuildComment(body ?? {})
    if (!parsed.ok) return communityBuildError(parsed.error, 400)

    const userId = authUser.username.toLowerCase()
    const limited = takeCommunityBuildRateLimit({ userId, action: 'comment' })
    if (!limited.ok) {
      return communityBuildError('You are commenting too quickly. Try again later.', 429, limited.retryAfterSec)
    }

    const created = await addCommunityBuildComment({
      buildId: params.id,
      authorUserId: userId,
      authorDisplayName: authUser.displayName,
      body: parsed.text,
    })
    if (!created.ok) return communityBuildError(created.error, created.status)
    return communityBuildJson({ comment: presentComment(created.comment, userId) }, 201)
  })
}
