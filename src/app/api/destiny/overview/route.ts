import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth/verifyAuth'
import { destinyAuthHandler } from '@/lib/destiny/apiHandler'
import { enrichOverview } from '@/lib/destiny/enrich'
import { getOverviewData, getPendingRunActionsForUser } from '@/lib/destiny/store'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  return destinyAuthHandler(req, async () => {
    const authUser = await verifyAuth(req)
    const userId = authUser.username.toLowerCase()
    const [data, pendingRunActions] = await Promise.all([
      getOverviewData(),
      getPendingRunActionsForUser(userId),
    ])
    const enriched = await enrichOverview({
      ...data,
      pendingRunActions:
        pendingRunActions && pendingRunActions.pendingCount > 0 ? pendingRunActions : null,
    })
    return NextResponse.json(enriched)
  })
}
