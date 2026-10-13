import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth/verifyAuth'
import { destinyAuthHandler } from '@/lib/destiny/apiHandler'
import { getDestinyUserBySiteUserId } from '@/lib/destiny/destinyUserStore'
import { runActivityHistoryChunk } from '@/lib/destiny/activityHistorySync'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  return destinyAuthHandler(req, async () => {
    const authUser = await verifyAuth(req)
    const userId = authUser.username.toLowerCase()
    const stored = await getDestinyUserBySiteUserId(userId)
    if (!stored?.oauth) {
      return NextResponse.json(
        { error: 'Connect your Bungie account to load activity history.' },
        { status: 400 }
      )
    }

    let action: 'start' | 'continue' = 'continue'
    try {
      const body = (await req.json()) as { action?: string }
      if (body?.action === 'start') action = 'start'
    } catch {
      action = 'continue'
    }

    try {
      const result = await runActivityHistoryChunk(userId, stored, action)
      return NextResponse.json(result)
    } catch (error) {
      console.error('[destiny/activity-history/sync]', error)
      return NextResponse.json(
        { error: 'Activity sync failed. Saved runs are unchanged. Try again shortly.' },
        { status: 502 }
      )
    }
  })
}
