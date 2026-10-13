import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth/verifyAuth'
import { destinyAuthHandler } from '@/lib/destiny/apiHandler'
import { BungieApiError, getPostGameCarnageReport } from '@/lib/destiny/bungieClient'
import { getValidAccessToken, getDestinyUserBySiteUserId } from '@/lib/destiny/destinyUserStore'
import { trimPgcr, type RawPgcr } from '@/lib/destiny/activityHistoryPgcr'
import { findOwnedActivity, readCachedPgcr, writeCachedPgcr } from '@/lib/destiny/activityHistoryStore'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  return destinyAuthHandler(req, async () => {
    const authUser = await verifyAuth(req)
    const userId = authUser.username.toLowerCase()
    const instanceId = req.nextUrl.searchParams.get('instanceId')?.trim()
    if (!instanceId) {
      return NextResponse.json({ error: 'Missing activity id.' }, { status: 400 })
    }

    const owned = await findOwnedActivity(userId, instanceId)
    if (!owned) {
      return NextResponse.json(
        { error: 'That run is not in your saved activity history.' },
        { status: 404 }
      )
    }

    const cached = await readCachedPgcr(userId, instanceId)
    if (cached) {
      return NextResponse.json({ report: cached, activity: owned })
    }

    const stored = await getDestinyUserBySiteUserId(userId)
    const accessToken = stored ? await getValidAccessToken(stored) : null
    if (!accessToken) {
      return NextResponse.json(
        {
          error: 'Reconnect Bungie to open this post-game report. The run summary is still saved.',
          activity: owned,
        },
        { status: 401 }
      )
    }

    try {
      const raw = (await getPostGameCarnageReport(instanceId, accessToken)) as RawPgcr
      const report = trimPgcr(instanceId, userId, raw, owned.activityName)
      await writeCachedPgcr(report)
      return NextResponse.json({ report, activity: owned })
    } catch (error) {
      console.warn('[destiny/activity-history/pgcr]', instanceId, error)
      const rateLimited = error instanceof BungieApiError && error.statusCode === 429
      return NextResponse.json(
        {
          error: rateLimited
            ? 'Bungie is rate limiting post-game reports. Try this run again in a moment.'
            : 'Bungie did not return a post-game report for this run. It can be missing for very old or restricted activities.',
          activity: owned,
        },
        { status: rateLimited ? 429 : 502 }
      )
    }
  })
}
