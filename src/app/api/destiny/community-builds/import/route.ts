import { NextRequest } from 'next/server'
import { verifyAuth } from '@/lib/auth/verifyAuth'
import { destinyAuthHandler } from '@/lib/destiny/apiHandler'
import { resolveActiveCharacterId } from '@/lib/destiny/activeCharacter'
import { communityBuildError, communityBuildJson } from '@/lib/destiny/communityBuildHttp'
import { communityBuildDraftFromSnapshot } from '@/lib/destiny/communityBuildModel'
import { getDestinyUserBySiteUserId, getValidAccessToken } from '@/lib/destiny/destinyUserStore'
import { fetchAllCharactersPresentation } from '@/lib/destiny/guardianPresentation'
import { fetchLiveLoadout } from '@/lib/destiny/liveBungieData'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  return destinyAuthHandler(req, async () => {
    const authUser = await verifyAuth(req)
    const siteUserId = authUser.username.toLowerCase()
    const stored = await getDestinyUserBySiteUserId(siteUserId)
    if (!stored?.oauth) {
      return communityBuildJson({
        linked: false,
        characters: [],
        draft: null,
        message: 'Reconnect Bungie to import an equipped loadout.',
      })
    }

    const accessToken = await getValidAccessToken(stored)
    const membershipType = stored.destinyMembershipType
    const membershipId = stored.bungieMembershipId
    if (!accessToken || !membershipType || !membershipId) {
      return communityBuildJson({
        linked: false,
        characters: [],
        draft: null,
        message: 'Reconnect Bungie to import an equipped loadout.',
      })
    }

    const characters = await fetchAllCharactersPresentation(membershipType, membershipId, accessToken)
    const requested = req.nextUrl.searchParams.get('characterId')?.trim()
    if (requested && !/^\d{1,20}$/.test(requested)) {
      return communityBuildError('Invalid character.', 400)
    }
    if (requested && !characters.some((character) => character.characterId === requested)) {
      return communityBuildError('That character is not on your Bungie account.', 400)
    }

    const characterId = requested ?? resolveActiveCharacterId(stored.activeCharacterId, characters)
    const loadout = characterId ? await fetchLiveLoadout(stored, characterId) : null
    return communityBuildJson({
      linked: true,
      characters: characters.map((character) => ({
        characterId: character.characterId,
        characterClass: character.characterClass,
        powerLevel: character.powerLevel,
      })),
      activeCharacterId: characterId,
      draft: loadout ? communityBuildDraftFromSnapshot(loadout, characterId) : null,
      message: loadout ? undefined : 'Could not read that character’s equipped loadout.',
    })
  })
}
