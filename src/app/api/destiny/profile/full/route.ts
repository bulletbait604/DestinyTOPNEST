import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth/verifyAuth'
import { destinyAuthHandler } from '@/lib/destiny/apiHandler'
import { getDestinyUserBySiteUserId, getValidAccessToken } from '@/lib/destiny/destinyUserStore'
import { buildFullProfile } from '@/lib/destiny/fullProfile'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/** Full player profile: characters, equipped gear, vault, lifetime stats, triumphs, seals, players met. */
export async function GET(req: NextRequest) {
  return destinyAuthHandler(req, async () => {
    const authUser = await verifyAuth(req)
    const stored = await getDestinyUserBySiteUserId(authUser.username.toLowerCase())
    if (!stored?.bungieMembershipId || !stored.destinyMembershipType) {
      return NextResponse.json({ error: 'Link your Bungie account first' }, { status: 409 })
    }
    const token = await getValidAccessToken(stored)
    if (!token) {
      return NextResponse.json({ error: 'Bungie session expired — sign in again' }, { status: 401 })
    }
    const profile = await buildFullProfile(stored.destinyMembershipType, stored.bungieMembershipId, token)
    const res = NextResponse.json(profile)
    res.headers.set('Cache-Control', 'private, max-age=60')
    return res
  })
}
