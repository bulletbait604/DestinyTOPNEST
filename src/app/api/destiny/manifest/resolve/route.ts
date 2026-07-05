import { NextRequest, NextResponse } from 'next/server'
import { activityCatalogLookup } from '@/lib/destiny/activityCatalog'
import type { ManifestEntityType } from '@/lib/destiny/itemsCatalog'
import { enrichIconRef, resolveActivity, resolveByName, resolveManifestHash } from '@/lib/destiny/manifest'

export const dynamic = 'force-dynamic'

/** Resolve Bungie manifest icons by name or definition hash. */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams
  const name = params.get('name')?.trim()
  const hashRaw = params.get('hash')
  const entity = params.get('entity') as ManifestEntityType | null

  try {
    if (hashRaw && entity) {
      const hash = Number(hashRaw)
      if (!Number.isFinite(hash)) {
        return NextResponse.json({ error: 'Invalid hash' }, { status: 400 })
      }
      const ref = await resolveManifestHash(entity, hash, name ?? `Hash ${hash}`)
      return NextResponse.json(ref)
    }

    if (name) {
      if (activityCatalogLookup(name)) {
        return NextResponse.json(await resolveActivity(name))
      }
      const ref = await resolveByName(name, entity ?? 'DestinyInventoryItemDefinition')
      return NextResponse.json(ref)
    }

    if (hashRaw) {
      const hash = Number(hashRaw)
      if (!Number.isFinite(hash)) {
        return NextResponse.json({ error: 'Invalid hash' }, { status: 400 })
      }
      const ref = await enrichIconRef(
        { name: name ?? `Hash ${hash}`, hash, entityType: entity ?? undefined },
        name ?? undefined
      )
      return NextResponse.json(ref ?? { name: name ?? `Hash ${hash}`, hash })
    }

    return NextResponse.json({ error: 'Provide name and/or hash' }, { status: 400 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Manifest resolve failed'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
