import { NextResponse } from 'next/server'
import { loadPublicHubSnapshot } from '@/lib/destiny/publicHub'
import { cacheControlUntilWeeklyReset } from '@/lib/destiny/weeklyRotation'

export const dynamic = 'force-dynamic'

/** Logged-out Guardian Hub boards. No account data. */
export async function GET() {
  const now = new Date()
  const snapshot = await loadPublicHubSnapshot(now)
  const res = NextResponse.json(snapshot)
  res.headers.set(
    'Cache-Control',
    cacheControlUntilWeeklyReset(now, { scope: 'public', maxAge: 60, staleWhileRevalidate: 120 })
  )
  return res
}
