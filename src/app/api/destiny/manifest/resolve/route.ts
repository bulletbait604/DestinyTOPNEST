import { NextRequest, NextResponse } from 'next/server'
import { destinyAuthHandler } from '@/lib/destiny/apiHandler'
import { activityCatalogLookup } from '@/lib/destiny/activityCatalog'
import type { ManifestEntityType } from '@/lib/destiny/itemsCatalog'
import { enrichIconRef, resolveActivity, resolveByName, resolveManifestHash } from '@/lib/destiny/manifest'

export const dynamic = 'force-dynamic'

const MAX_NAME_LENGTH = 120
const MAX_HASH = 4_000_000_000

function sanitizeName(raw: string | null): string | undefined {
  if (!raw) return undefined
  const trimmed = raw.trim().slice(0, MAX_NAME_LENGTH)
  return trimmed || undefined
}

/** Resolve Bungie manifest icons by name or definition hash (authenticated). */
export async function GET(req: NextRequest) {
  return destinyAuthHandler(req, async () => {
    const params = req.nextUrl.searchParams
    const name = sanitizeName(params.get('name'))
    const hashRaw = params.get('hash')
    const entity = params.get('entity') as ManifestEntityType | null

    try {
      if (hashRaw && entity) {
        const hash = Number(hashRaw)
        if (!Number.isFinite(hash) || hash <= 0 || hash > MAX_HASH) {
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
        if (!Number.isFinite(hash) || hash <= 0 || hash > MAX_HASH) {
          return NextResponse.json({ error: 'Invalid hash' }, { status: 400 })
        }
        const ref = await enrichIconRef(
          { name: name ?? `Hash ${hash}`, hash, entityType: entity ?? undefined },
          name ?? undefined
        )
        return NextResponse.json(ref ?? { name: name ?? `Hash ${hash}`, hash })
      }

      return NextResponse.json({ error: 'Provide name and/or hash' }, { status: 400 })
    } catch {
      return NextResponse.json({ error: 'Manifest resolve failed' }, { status: 502 })
    }
  })
}
