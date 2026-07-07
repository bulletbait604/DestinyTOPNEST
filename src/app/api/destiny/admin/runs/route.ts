import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth/verifyAuth'
import { destinyStaffHandler } from '@/lib/destiny/apiHandler'
import type { AdminReviewDecision } from '@/lib/destiny/adminReviewDecisions'
import { isAdminReviewDecision } from '@/lib/destiny/adminReviewDecisions'
import { getAdminRunsList, resolveRunAdminDecision } from '@/lib/destiny/store'
import { invalidateOverviewCache } from '@/lib/destiny/overviewCache'
import type { ActivityType, RunRecord } from '@/lib/destiny/types'

export const dynamic = 'force-dynamic'

const STATUS_VALUES = new Set(['all', 'verified', 'pending', 'flagged', 'rejected'])
const TYPE_VALUES = new Set(['all', 'raid', 'dungeon', 'pantheon'])

export async function GET(req: NextRequest) {
  return destinyStaffHandler(req, async () => {
    const params = req.nextUrl.searchParams
    const statusParam = params.get('status') ?? 'all'
    const typeParam = params.get('type') ?? 'all'
    const q = params.get('q') ?? undefined
    const limit = Number(params.get('limit') ?? 40)
    const offset = Number(params.get('offset') ?? 0)

    const status = STATUS_VALUES.has(statusParam)
      ? (statusParam as RunRecord['verificationStatus'] | 'all')
      : 'all'
    const activityType = TYPE_VALUES.has(typeParam)
      ? (typeParam as ActivityType | 'all')
      : 'all'

    const result = await getAdminRunsList({ status, activityType, q, limit, offset })
    return NextResponse.json(result)
  })
}

export async function POST(req: NextRequest) {
  return destinyStaffHandler(req, async () => {
    const authUser = await verifyAuth(req)
    const body = await req.json().catch(() => ({}))
    const { runId, decision, notes } = body as {
      runId?: string
      decision?: string
      notes?: string
    }

    if (!runId || !decision) {
      return NextResponse.json({ error: 'runId and decision required' }, { status: 400 })
    }
    if (!isAdminReviewDecision(decision)) {
      return NextResponse.json(
        { error: 'Invalid decision. Use approve, reject, or checkpoint_non_scoring.' },
        { status: 400 }
      )
    }

    const ok = await resolveRunAdminDecision(
      runId,
      decision as AdminReviewDecision,
      authUser.username.toLowerCase(),
      notes
    )

    if (!ok) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 })
    }

    invalidateOverviewCache()

    return NextResponse.json({
      ok: true,
      runId,
      decision,
      notes,
      message: 'Run decision saved.',
    })
  })
}
