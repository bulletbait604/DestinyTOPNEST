import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth/verifyAuth'
import { destinyAuthHandler } from '@/lib/destiny/apiHandler'
import { getDestinyUserBySiteUserId, getValidAccessToken } from '@/lib/destiny/destinyUserStore'
import { listOwnedArmorForSlot } from '@/lib/destiny/metaBuildInventory'
import type { ArmorSlotLabel, DestinyCharacterClass } from '@/lib/destiny/types'

export const dynamic = 'force-dynamic'

/** List legendary armor in vault/characters for a slot — used by meta build armor picker. */
export async function GET(req: NextRequest) {
  return destinyAuthHandler(req, async () => {
    const authUser = await verifyAuth(req)
    const stored = await getDestinyUserBySiteUserId(authUser.username.toLowerCase())

    if (!stored?.oauth) {
      return NextResponse.json({ items: [], linked: false })
    }

    const accessToken = await getValidAccessToken(stored)
    const membershipType = stored.destinyMembershipType
    const membershipId = stored.bungieMembershipId
    if (!accessToken || !membershipType || !membershipId) {
      return NextResponse.json({ items: [], linked: true })
    }

    const characterId = req.nextUrl.searchParams.get('characterId') ?? stored.activeCharacterId
    const characterClass = (req.nextUrl.searchParams.get('class') ?? stored.characterClass) as DestinyCharacterClass
    const slot = req.nextUrl.searchParams.get('slot') as ArmorSlotLabel | null

    if (!characterId || !characterClass || !slot) {
      return NextResponse.json({ error: 'characterId, class, and slot are required' }, { status: 400 })
    }

    const items = await listOwnedArmorForSlot(
      membershipType,
      membershipId,
      characterId,
      characterClass,
      slot,
      accessToken
    )

    return NextResponse.json({ items, linked: true })
  })
}
