import { NextRequest, NextResponse } from 'next/server'
import { destinyAuthHandler } from '@/lib/destiny/apiHandler'
import { getCachedBuildsPayload } from '@/lib/destiny/dataCache'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  return destinyAuthHandler(req, async () => {
    const { searchParams } = new URL(req.url)
    const activity = searchParams.get('activity') ?? ''
    const payload = await getCachedBuildsPayload(activity)
    const res = NextResponse.json(payload)
    res.headers.set('Cache-Control', 'private, max-age=120, stale-while-revalidate=300')
    return res
  })
}
