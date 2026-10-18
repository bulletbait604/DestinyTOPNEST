import { NextRequest, NextResponse } from 'next/server'
import { searchGuardians } from '@/lib/destiny/guardianDirectoryData'

export const dynamic = 'force-dynamic'

/** Public guardian search. No account tokens. */
export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q') ?? ''
  if (query.trim().length > 40) {
    return NextResponse.json({ error: 'Search must be 40 characters or fewer.' }, { status: 400 })
  }
  const guardians = await searchGuardians(query)
  const res = NextResponse.json({ guardians, query: query.trim() })
  res.headers.set('Cache-Control', 'private, max-age=20')
  return res
}
