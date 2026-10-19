import { NextResponse } from 'next/server'
import { loadPrizeCopy, publicPrizeView, resolvePrizesEnabled } from '@/lib/destiny/siteContent'

export const dynamic = 'force-dynamic'

/** Public prize names. Weekly goals and events are already on the hub snapshot. */
export async function GET() {
  const [copy, prizesEnabled] = await Promise.all([loadPrizeCopy(), resolvePrizesEnabled()])
  const res = NextResponse.json(publicPrizeView(copy, prizesEnabled))
  res.headers.set('Cache-Control', 'private, max-age=30')
  return res
}
