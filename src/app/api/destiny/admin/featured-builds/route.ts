import { NextRequest } from 'next/server'
import { verifyAuth } from '@/lib/auth/verifyAuth'
import { destinyOwnerHandler } from '@/lib/destiny/apiHandler'
import { logAdminActivity } from '@/lib/destiny/adminActivityLog'
import { communityBuildError, communityBuildJson, readJsonObject } from '@/lib/destiny/communityBuildHttp'
import { ensureFeaturedBuildsSeed } from '@/lib/destiny/featuredBuildSeed'

export const dynamic = 'force-dynamic'

/** Owner-only. Re-runs the curated build seed. Safe to repeat. */
export async function POST(req: NextRequest) {
  return destinyOwnerHandler(req, async () => {
    const body = await readJsonObject(req)
    const action = body && typeof body.action === 'string' ? body.action : 'import'
    if (action !== 'import') return communityBuildError('Unknown action.', 400)

    const result = await ensureFeaturedBuildsSeed()
    const authUser = await verifyAuth(req)
    await logAdminActivity({
      kind: 'featured_builds_import',
      actorId: authUser.username.toLowerCase(),
      actorLabel: authUser.displayName,
      summary: `Imported featured builds (${result.inserted} new, ${result.updated} updated, ${result.unchanged} unchanged)`,
      metadata: { version: result.version, total: result.total },
    })
    return communityBuildJson(result)
  })
}
