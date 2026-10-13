import { NextRequest } from 'next/server'
import { verifyAuth } from '@/lib/auth/verifyAuth'
import { destinyAuthHandler } from '@/lib/destiny/apiHandler'
import { readCommunityBuildViewer } from '@/lib/destiny/communityBuildAccess'
import { communityBuildError, communityBuildJson } from '@/lib/destiny/communityBuildHttp'
import { isCommunityBuildId } from '@/lib/destiny/communityBuildModel'
import { deleteCommunityBuildComment } from '@/lib/destiny/communityBuildStore'

export const dynamic = 'force-dynamic'

export async function DELETE(req: NextRequest, { params }: { params: { id: string; commentId: string } }) {
  return destinyAuthHandler(req, async () => {
    if (!isCommunityBuildId(params.id) || !isCommunityBuildId(params.commentId)) {
      return communityBuildError('Comment not found.', 404)
    }
    const authUser = await verifyAuth(req)
    const viewer = await readCommunityBuildViewer(req)
    const result = await deleteCommunityBuildComment(
      params.id,
      params.commentId,
      authUser.username.toLowerCase(),
      viewer.staff
    )
    if (!result.ok) return communityBuildError(result.error, result.status)
    return communityBuildJson({ ok: true })
  })
}
