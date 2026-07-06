import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth/verifyAuth'
import { destinyAuthHandler } from '@/lib/destiny/apiHandler'
import { applyMetaBuildToCharacter } from '@/lib/destiny/bungieClient'
import { getDestinyUserBySiteUserId, getValidAccessToken } from '@/lib/destiny/destinyUserStore'
import { getExternalBuildSources } from '@/lib/destiny/store'
import { enrichExternalBuild } from '@/lib/destiny/enrich'
import { buildMetaInventoryPlan } from '@/lib/destiny/metaBuildInventory'
import type { ArmorSlotLabel, DestinyCharacterClass } from '@/lib/destiny/types'

export const dynamic = 'force-dynamic'

interface ApplyBody {
  buildId: string
  characterId: string
  characterClass: DestinyCharacterClass
  armorSelections?: Partial<Record<ArmorSlotLabel, string>>
}

export async function POST(req: NextRequest) {
  return destinyAuthHandler(req, async () => {
    const authUser = await verifyAuth(req)
    const siteUserId = authUser.username.toLowerCase()
    const stored = await getDestinyUserBySiteUserId(siteUserId)

    if (!stored?.oauth) {
      return NextResponse.json({ error: 'Reconnect Bungie to apply loadouts.' }, { status: 401 })
    }

    const accessToken = await getValidAccessToken(stored)
    const membershipType = stored.destinyMembershipType
    const membershipId = stored.bungieMembershipId
    if (!accessToken || !membershipType || !membershipId) {
      return NextResponse.json({ error: 'Bungie session expired. Sign in again.' }, { status: 401 })
    }

    let body: ApplyBody
    try {
      body = (await req.json()) as ApplyBody
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { buildId, characterId, characterClass, armorSelections = {} } = body
    if (!buildId || !characterId || !characterClass) {
      return NextResponse.json({ error: 'buildId, characterId, and characterClass are required' }, { status: 400 })
    }

    const externalBuilds = await getExternalBuildSources()
    const raw = externalBuilds.find((b) => b.id === buildId)
    if (!raw) {
      return NextResponse.json({ error: 'Meta build not found' }, { status: 404 })
    }

    const build = await enrichExternalBuild(raw)
    const plan = await buildMetaInventoryPlan(
      membershipType,
      membershipId,
      characterId,
      characterClass,
      build,
      armorSelections,
      accessToken
    )

    if (plan.readyCount === 0) {
      return NextResponse.json(
        {
          error: 'No matching gear found in your inventory for this build.',
          plan,
        },
        { status: 422 }
      )
    }

    try {
      const result = await applyMetaBuildToCharacter(
        membershipType,
        membershipId,
        characterId,
        plan,
        accessToken
      )
      return NextResponse.json({ ok: true, plan, ...result })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Bungie equip failed'
      return NextResponse.json({ error: message, plan }, { status: 502 })
    }
  })
}
