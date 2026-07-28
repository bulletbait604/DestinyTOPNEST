import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth/verifyAuth'
import { destinyAuthHandler } from '@/lib/destiny/apiHandler'
import { getCachedEnrichedOverview } from '@/lib/destiny/overviewCache'
import { getPendingRunActionsForUser } from '@/lib/destiny/store'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  return destinyAuthHandler(req, async () => {
    const authUser = await verifyAuth(req)
    const userId = authUser.username.toLowerCase()
    const [enriched, pendingRunActions] = await Promise.all([
      getCachedEnrichedOverview(),
      getPendingRunActionsForUser(userId),
    ])
    const res = NextResponse.json({
      ...enriched,
      pendingRunActions:
        pendingRunActions && pendingRunActions.pendingCount > 0 ? pendingRunActions : null,
    })
    // Personalized pending actions — private browser cache only.
    res.headers.set('Cache-Control', 'private, max-age=20, stale-while-revalidate=45')
    return res
  })
}
