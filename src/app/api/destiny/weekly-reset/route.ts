import { NextResponse } from 'next/server'
import { refreshLiveWeeklyRotationBounded } from '@/lib/destiny/bungieWeekly'
import { cacheControlUntilWeeklyReset, getWeeklyResetState } from '@/lib/destiny/weeklyRotation'

/**
 * Public weekly rotation. Featured raids and dungeons come from Destiny2/Milestones,
 * then a scraped weekly reset post cached in Mongo, then the static calendar.
 * The CDN entry expires at the next Tuesday 17:00 UTC reset.
 */
export const dynamic = 'force-dynamic'

export async function GET() {
  const now = new Date()
  await refreshLiveWeeklyRotationBounded(now)
  const state = getWeeklyResetState(now)
  const res = NextResponse.json(state)
  res.headers.set(
    'Cache-Control',
    cacheControlUntilWeeklyReset(now, { scope: 'public', maxAge: 60, staleWhileRevalidate: 60 })
  )
  return res
}
