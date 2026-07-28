import { NextResponse } from 'next/server'
import { getWeeklyResetState } from '@/lib/destiny/weeklyRotation'

/**
 * Public weekly rotation countdown — Edge + CDN cached.
 * Pure date math (no Mongo / Node crypto), so it stays cheap while idling.
 */
export const runtime = 'edge'
export const revalidate = 60

export async function GET() {
  const state = getWeeklyResetState()
  const res = NextResponse.json(state)
  res.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
  return res
}
