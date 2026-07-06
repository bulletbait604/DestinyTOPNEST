import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth/verifyAuth'
import { destinyAuthHandler } from '@/lib/destiny/apiHandler'
import { getDestinyUserBySiteUserId } from '@/lib/destiny/destinyUserStore'
import { invalidateOverviewCache } from '@/lib/destiny/overviewCache'
import { syncRunsForUser } from '@/lib/destiny/runIngestion'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  return destinyAuthHandler(req, async () => {
    const authUser = await verifyAuth(req)
    const siteUserId = authUser.username.toLowerCase()
    const stored = await getDestinyUserBySiteUserId(siteUserId)

    if (!stored?.oauth) {
      return NextResponse.json(
        { error: 'Connect your Bungie account from Overview first.' },
        { status: 400 }
      )
    }

    try {
      const result = await syncRunsForUser(stored)
      if (result.synced > 0 || result.imported > 0) {
        invalidateOverviewCache()
      }
      return NextResponse.json({
        ok: true,
        synced: result.synced,
        imported: result.imported,
        flagged: result.flagged,
        skipped: result.skipped,
        builds: result.builds,
        newRuns: result.newRuns,
        message: `Synced ${result.synced} run(s) · ${result.builds} build(s) captured${result.imported ? ` · ${result.imported} new` : ''}.`,
      })
    } catch (error) {
      console.error('[destiny/runs/sync]', error)
      return NextResponse.json({ error: 'Run sync failed. Try again in a few minutes.' }, { status: 502 })
    }
  })
}
