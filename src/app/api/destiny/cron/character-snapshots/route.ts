import { timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { refreshDueCharacterSnapshots } from '@/lib/destiny/characterSnapshotFetch'
import { cronSecret } from '@/lib/destiny/env'

export const dynamic = 'force-dynamic'

/**
 * Daily character history. Refreshes a handful of linked accounts and skips
 * anyone snapshotted in the last 12 hours so Bungie is not called in a burst.
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

  const result = await refreshDueCharacterSnapshots()
  return NextResponse.json(result)
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  return ab.length === bb.length && timingSafeEqual(ab, bb)
}
