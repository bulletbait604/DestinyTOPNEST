import { NextRequest, NextResponse } from 'next/server'
import { destinyStaffHandler } from '@/lib/destiny/apiHandler'
import { rescoreReadableHistory, rescoreStoredRuns } from '@/lib/destiny/rescore'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * Staff rescore.
 * { "scope": "stored" } rewrites points already in the database.
 * { "scope": "history", "limit": 5 } also re-fetches that many players' raid and dungeon history.
 */
export async function POST(req: NextRequest) {
  return destinyStaffHandler(req, async () => {
    const body = (await req.json().catch(() => ({}))) as { scope?: string; limit?: number }
    if (body.scope === 'history') {
      const result = await rescoreReadableHistory(body.limit ?? 5)
      return NextResponse.json(result)
    }
    const result = await rescoreStoredRuns()
    return NextResponse.json({ ...result, skipped: false, players: 0, imported: 0, failed: 0, nextIndex: 0, done: true })
  })
}
