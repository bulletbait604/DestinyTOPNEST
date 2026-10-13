import { NextRequest } from 'next/server'
import { verifyAuth } from '@/lib/auth/verifyAuth'
import { destinyAuthHandler } from '@/lib/destiny/apiHandler'
import { communityBuildError, communityBuildJson } from '@/lib/destiny/communityBuildHttp'
import { isCommunityBuildId } from '@/lib/destiny/communityBuildModel'
import { takeCommunityBuildRateLimit } from '@/lib/destiny/communityBuildRateLimit'
import { toggleCommunityBuildSave } from '@/lib/destiny/communityBuildStore'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return destinyAuthHandler(req, async () => {
    if (!isCommunityBuildId(params.id)) return communityBuildError('Build not found.', 404)
    const authUser = await verifyAuth(req)
    const userId = authUser.username.toLowerCase()
    const limited = takeCommunityBuildRateLimit({ userId, action: 'react' })
    if (!limited.ok) {
      return communityBuildError('Too many saves. Try again shortly.', 429, limited.retryAfterSec)
    }
    const result = await toggleCommunityBuildSave(params.id, userId)
    if (!result.ok) return communityBuildError(result.error, result.status)
    return communityBuildJson({ saved: result.active, saveCount: result.count })
  })
}
