import { NextRequest, NextResponse } from 'next/server'
import { destinyStaffHandler } from '@/lib/destiny/apiHandler'
import { getAdminActivityFeed } from '@/lib/destiny/adminActivityLog'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  return destinyStaffHandler(req, async () => {
    const limitRaw = req.nextUrl.searchParams.get('limit')
    const limit = Math.min(100, Math.max(1, Number(limitRaw) || 50))
    const feed = await getAdminActivityFeed(limit)
    return NextResponse.json({ feed })
  })
}
