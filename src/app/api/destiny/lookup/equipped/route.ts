import { NextRequest, NextResponse } from 'next/server'
import { optionalAuth } from '@/lib/destiny/communityBuildAccess'
import { getDestinyUserBySiteUserId, getValidAccessToken } from '@/lib/destiny/destinyUserStore'
import { lookupEquippedLoadout } from '@/lib/destiny/equippedLookup'
import { isMembershipId } from '@/lib/destiny/guardianDirectory'

export const dynamic = 'force-dynamic'

const TYPES = new Set([1, 2, 3, 6])

/** Shared-build search lives on /api/destiny/community-builds. This route is the equipped loadout. */
export async function GET(req: NextRequest) {
  const query = (req.nextUrl.searchParams.get('q') ?? '').trim()
  const membershipId = (req.nextUrl.searchParams.get('membershipId') ?? '').trim()
  const typeRaw = Number(req.nextUrl.searchParams.get('type') ?? '')
  if (query.length > 40) {
    return NextResponse.json({ error: 'Search must be 40 characters or fewer.' }, { status: 400 })
  }
  if (membershipId && !isMembershipId(membershipId)) {
    return NextResponse.json({ error: 'That membership id is not valid.' }, { status: 400 })
  }
  if (!membershipId && !query.includes('#')) {
    return NextResponse.json({ error: 'Use a Bungie name and code, like Ada#0042.' }, { status: 400 })
  }

  const viewer = await optionalAuth(req)
  let accessToken: string | undefined
  if (viewer) {
    const stored = await getDestinyUserBySiteUserId(viewer.username.toLowerCase())
    if (stored && (!membershipId || stored.bungieMembershipId === membershipId)) {
      accessToken = (await getValidAccessToken(stored)) ?? undefined
    }
  }

  try {
    const result = await lookupEquippedLoadout({
      query,
      membershipId: membershipId || undefined,
      membershipType: TYPES.has(typeRaw) ? typeRaw : undefined,
      accessToken,
    })
    if (!result) {
      return NextResponse.json({ error: 'No public equipped loadout for that guardian.' }, { status: 404 })
    }
    return NextResponse.json(result)
  } catch (error) {
    console.warn('[lookup] equipped loadout failed', error)
    return NextResponse.json({ error: 'Bungie could not return that loadout.' }, { status: 502 })
  }
}
