import { NextRequest, NextResponse } from 'next/server'
import { optionalAuth } from '@/lib/destiny/communityBuildAccess'
import { getDestinyUserBySiteUserId, getValidAccessToken } from '@/lib/destiny/destinyUserStore'
import { isQuestKind } from '@/lib/destiny/questCatalog'
import { searchQuestCatalog } from '@/lib/destiny/questLookup'

export const dynamic = 'force-dynamic'

/** Manifest search for quests, pursuits, exotic quests, and catalysts. */
export async function GET(req: NextRequest) {
  const query = (req.nextUrl.searchParams.get('q') ?? '').trim()
  const kind = (req.nextUrl.searchParams.get('kind') ?? 'all').toLowerCase()
  if (query.length > 40) {
    return NextResponse.json({ error: 'Search must be 40 characters or fewer.' }, { status: 400 })
  }
  if (kind !== 'all' && !isQuestKind(kind)) {
    return NextResponse.json({ error: 'Quest filter is not recognized.' }, { status: 400 })
  }
  if (query.length < 2) {
    return NextResponse.json({ quests: [], signedIn: false })
  }

  const viewer = await optionalAuth(req)
  let accessToken: string | undefined
  let membershipType: number | undefined
  let membershipId: string | undefined
  if (viewer) {
    const stored = await getDestinyUserBySiteUserId(viewer.username.toLowerCase())
    if (stored?.bungieMembershipId && stored.destinyMembershipType) {
      membershipId = stored.bungieMembershipId
      membershipType = stored.destinyMembershipType
      accessToken = (await getValidAccessToken(stored)) ?? undefined
    }
  }

  try {
    const quests = await searchQuestCatalog({ query, kind, membershipType, membershipId, accessToken })
    return NextResponse.json({ quests, signedIn: Boolean(accessToken) })
  } catch (error) {
    console.warn('[quests] manifest search failed', error)
    return NextResponse.json({ error: 'The Bungie manifest could not be searched.' }, { status: 502 })
  }
}
