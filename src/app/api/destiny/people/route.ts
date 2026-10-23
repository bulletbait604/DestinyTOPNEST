import { NextRequest, NextResponse } from 'next/server'
import { searchGuardians } from '@/lib/destiny/guardianDirectoryData'
import type { PersonRow } from '@/lib/destiny/guardianDirectory'

export const dynamic = 'force-dynamic'

/** People directory rows with MVP, New Light, and Useless totals. */
export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q') ?? ''
  if (query.trim().length > 40) {
    return NextResponse.json({ error: 'Search must be 40 characters or fewer.' }, { status: 400 })
  }
  const guardians = await searchGuardians(query)
  const people: PersonRow[] = guardians.map((card) => ({
    membershipId: card.membershipId,
    displayName: card.displayName,
    status: card.status,
    mvpVotes: card.mvpVotes ?? card.mvpCount,
    newLightVotes: card.newLightVotes ?? 0,
    uselessVotes: card.uselessVotes ?? 0,
  }))
  const res = NextResponse.json({ people, query: query.trim() })
  res.headers.set('Cache-Control', 'private, max-age=20')
  return res
}
