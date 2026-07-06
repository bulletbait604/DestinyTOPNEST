import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth/verifyAuth'
import { resolveActiveCharacterId } from '@/lib/destiny/activeCharacter'
import { destinyAuthHandler } from '@/lib/destiny/apiHandler'
import { getDestinyUserBySiteUserId, getValidAccessToken } from '@/lib/destiny/destinyUserStore'
import { enrichLoadoutsResponse } from '@/lib/destiny/enrich'
import { fetchAllCharactersPresentation } from '@/lib/destiny/guardianPresentation'
import { fetchLiveLoadout, fetchSavedLoadoutsForCharacter, refreshGuardianFromBungie } from '@/lib/destiny/liveBungieData'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  return destinyAuthHandler(req, async () => {
    const authUser = await verifyAuth(req)
    const siteUserId = authUser.username.toLowerCase()
    let stored = await getDestinyUserBySiteUserId(siteUserId)

    if (!stored?.oauth) {
      return NextResponse.json({
        current: null,
        saved: [],
        favorites: [],
        equipSupported: false,
        equipMessage: 'Reconnect Bungie to view your live loadout.',
        linked: false,
      })
    }

    stored = await refreshGuardianFromBungie(stored)
    stored = (await getDestinyUserBySiteUserId(siteUserId)) ?? stored

    const accessToken = await getValidAccessToken(stored)
    const membershipType = stored.destinyMembershipType
    const membershipId = stored.bungieMembershipId

    const requestedCharacterId = req.nextUrl.searchParams.get('characterId')?.trim() || undefined
    let activeCharacterId = requestedCharacterId ?? stored.activeCharacterId
    if (accessToken && membershipType && membershipId) {
      try {
        const characters = await fetchAllCharactersPresentation(membershipType, membershipId, accessToken)
        if (requestedCharacterId && !characters.some((c) => c.characterId === requestedCharacterId)) {
          return NextResponse.json({ error: 'Invalid characterId' }, { status: 400 })
        }
        activeCharacterId = requestedCharacterId ?? resolveActiveCharacterId(stored.activeCharacterId, characters)
      } catch {
        /* use stored or requested character */
      }
    }

    const current = await fetchLiveLoadout(stored, activeCharacterId)
    const saved = await fetchSavedLoadoutsForCharacter(stored, activeCharacterId)

    if (!current && !saved.length) {
      return NextResponse.json({
        current: null,
        saved: [],
        favorites: [],
        equipSupported: false,
        equipMessage:
          'Could not load equipment from Bungie. Try reconnecting your account or check OAuth scopes.',
        linked: true,
      })
    }

    return NextResponse.json(
      await enrichLoadoutsResponse({
        current,
        saved,
        favorites: [],
        equipSupported: false,
        equipMessage:
          'Direct equip requires Bungie OAuth with MoveEquipDestinyItems scope. View and copy loadouts for now.',
      })
    )
  })
}
