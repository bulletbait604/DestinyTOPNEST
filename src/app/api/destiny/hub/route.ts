import { NextResponse } from 'next/server'
import { loadPublicHubSnapshot } from '@/lib/destiny/publicHub'

export const dynamic = 'force-dynamic'

/** Logged-out Guardian Hub boards. No account data. */
export async function GET() {
  const snapshot = await loadPublicHubSnapshot()
  const res = NextResponse.json(snapshot)
  res.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120')
  return res
}
