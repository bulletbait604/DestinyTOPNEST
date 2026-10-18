import { NextRequest, NextResponse } from 'next/server'
import { isMembershipId } from '@/lib/destiny/guardianDirectory'
import { loadGuardianProfile } from '@/lib/destiny/guardianDirectoryData'

export const dynamic = 'force-dynamic'

const MEMBERSHIP_TYPES = new Set([1, 2, 3, 6])

/** Public guardian profile by Bungie membership id. */
export async function GET(
  req: NextRequest,
  { params }: { params: { membershipId: string } }
) {
  const membershipId = params.membershipId?.trim() ?? ''
  if (!isMembershipId(membershipId)) {
    return NextResponse.json({ error: 'That membership id is not valid.' }, { status: 400 })
  }

  const typeRaw = Number(req.nextUrl.searchParams.get('type') ?? '')
  const membershipType = MEMBERSHIP_TYPES.has(typeRaw) ? typeRaw : undefined
  const profile = await loadGuardianProfile(membershipId, membershipType)
  if (!profile) {
    return NextResponse.json({ error: 'No guardian found for that id.' }, { status: 404 })
  }

  const res = NextResponse.json(profile)
  res.headers.set('Cache-Control', 'private, max-age=30')
  return res
}
