import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth/verifyAuth'
import { destinyAuthHandler } from '@/lib/destiny/apiHandler'
import { activityKindOptions, getActivitySyncView } from '@/lib/destiny/activityHistorySync'
import { ACTIVITY_HISTORY_LIMITATIONS, type ActivityHistoryKind } from '@/lib/destiny/activityHistoryModel'
import { queryActivityHistory } from '@/lib/destiny/activityHistoryStore'

export const dynamic = 'force-dynamic'

const KINDS = new Set(activityKindOptions().map((kind) => kind.id))

function kindFromQuery(value: string | null): ActivityHistoryKind | undefined {
  if (!value || !KINDS.has(value)) return undefined
  return value as ActivityHistoryKind
}

export async function GET(req: NextRequest) {
  return destinyAuthHandler(req, async () => {
    const authUser = await verifyAuth(req)
    const userId = authUser.username.toLowerCase()
    const params = req.nextUrl.searchParams
    const referenceRaw = params.get('activity')
    const referenceId = referenceRaw ? Number(referenceRaw) : undefined
    const completed = params.get('completed')
    try {
      const [sync, history] = await Promise.all([
        getActivitySyncView(userId),
        queryActivityHistory({
          userId,
          activityType: kindFromQuery(params.get('type')),
          referenceId: referenceId && Number.isFinite(referenceId) ? referenceId : undefined,
          characterKey: params.get('character') || undefined,
          completed: completed === 'clears' || completed === 'incomplete' ? completed : 'all',
          q: params.get('q') || undefined,
          page: Number(params.get('page') ?? '0'),
          pageSize: Number(params.get('pageSize') ?? '25'),
        }),
      ])
      return NextResponse.json({
        sync,
        limitations: ACTIVITY_HISTORY_LIMITATIONS,
        kinds: activityKindOptions(),
        ...history,
      })
    } catch (error) {
      console.error('[destiny/activity-history]', error)
      return NextResponse.json(
        { error: 'Activity history could not be loaded. Try again in a moment.' },
        { status: 503 }
      )
    }
  })
}
