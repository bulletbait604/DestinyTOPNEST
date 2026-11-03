import { timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { cronSecret } from '@/lib/destiny/env'
import { rescoreReadableHistory } from '@/lib/destiny/rescore'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * Cron-safe rescore. Rewrites stored points, then fetches history for a few
 * tracked players and stops. The next call continues where this one left off.
 * Set CRON_SECRET and send Authorization: Bearer <CRON_SECRET>.
 */
export async function GET(req: NextRequest) {
  const secret = cronSecret()
  const auth = req.headers.get('authorization')
  if (!secret) {
    return NextResponse.json({ error: 'This scheduled job is not ready.' }, { status: 503 })
  }
  if (!auth || !safeEqual(auth, `Bearer ${secret}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const limit = Number(req.nextUrl.searchParams.get('limit') ?? 2)
  const result = await rescoreReadableHistory(Number.isFinite(limit) ? limit : 2)
  return NextResponse.json(result)
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  return ab.length === bb.length && timingSafeEqual(ab, bb)
}
