import { NextRequest, NextResponse } from 'next/server'
import { checkBungieApiHealth } from '@/lib/destiny/bungieClient'

/** Public Bungie API health — Edge runtime (no Mongo / Node crypto). */
export const runtime = 'edge'
export const revalidate = 60

export async function GET(_req: NextRequest) {
  const health = await checkBungieApiHealth()
  const res = NextResponse.json(health)
  res.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120')
  return res
}
