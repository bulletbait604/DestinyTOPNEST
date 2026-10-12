import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth/verifyAuth'
import { destinyAuthHandler } from '@/lib/destiny/apiHandler'
import { getCachedEnrichedOverview } from '@/lib/destiny/overviewCache'
import { cacheControlUntilWeeklyReset } from '@/lib/destiny/weeklyRotation'
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
    res.headers.set(
      'Cache-Control',
      cacheControlUntilWeeklyReset(new Date(), { scope: 'private', maxAge: 20, staleWhileRevalidate: 45 })
    )
    return res
  })
}
