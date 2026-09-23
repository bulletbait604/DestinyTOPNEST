import { NextRequest, NextResponse } from 'next/server'
import {
  findGearModByHash,
  findGearModByName,
  GEAR_MOD_KINDS,
  getGearCatalogMeta,
  listArmorArchetypesFromCatalog,
  listArmorStatsFromCatalog,
  listGearMods,
  type GearModDoc,
  type GearModKind,
} from '@/lib/destiny/gearCatalog'
import { ARMOR_ARCHETYPES, ARMOR_STAT_ORDER } from '@/lib/destiny/armorStats'

export const dynamic = 'force-dynamic'

/**
 * Public gear catalog for loadout optimizer / viewer.
 * Query:
 *   kind=armor|weapon|ghost|weapon-perk|armor-perk|all
 *   family=general|raid|tuning|…
 *   q=search
 *   name=exact mod/perk name
 *   hash=inventory item hash
 *   limit=1-2000
 *   include=stats,archetypes,mods,meta (comma list; default all)
 */
function modPayload(mod: GearModDoc) {
  return {
    hash: mod.hash,
    kind: mod.kind,
    name: mod.name,
    description: mod.description,
    itemTypeDisplayName: mod.itemTypeDisplayName,
    plugCategoryIdentifier: mod.plugCategoryIdentifier,
    family: mod.family,
    armorSlot: mod.armorSlot,
    energyCost: mod.energyCost,
    investmentStats: mod.investmentStats,
    iconUrl: mod.iconUrl,
    iconPath: mod.iconPath,
  }
}

export async function GET(req: NextRequest) {
  const includeRaw = req.nextUrl.searchParams.get('include') || 'stats,archetypes,mods,meta'
  const include = new Set(includeRaw.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean))

  const hashRaw = req.nextUrl.searchParams.get('hash')
  const exactName = req.nextUrl.searchParams.get('name')?.trim()
  if (hashRaw || exactName) {
    const hash = hashRaw ? Number(hashRaw) : NaN
    const mod =
      Number.isFinite(hash) && hash > 0
        ? await findGearModByHash(hash)
        : exactName
          ? await findGearModByName(exactName)
          : null
    const res = NextResponse.json({ mods: mod ? [modPayload(mod)] : [] })
    res.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
    return res
  }

  const kindParam = (req.nextUrl.searchParams.get('kind') || 'armor,weapon').toLowerCase()
  const kinds: GearModKind[] =
    kindParam === 'all'
      ? [...GEAR_MOD_KINDS]
      : kindParam
          .split(',')
          .filter((kind): kind is GearModKind => (GEAR_MOD_KINDS as string[]).includes(kind))

  const family = req.nextUrl.searchParams.get('family') || undefined
  const q = req.nextUrl.searchParams.get('q') || undefined
  const limitRaw = Number(req.nextUrl.searchParams.get('limit') || '800')
  const limit = Number.isFinite(limitRaw) ? limitRaw : 800

  const [meta, statsDb, archetypesDb, mods] = await Promise.all([
    include.has('meta') ? getGearCatalogMeta() : Promise.resolve(null),
    include.has('stats') ? listArmorStatsFromCatalog() : Promise.resolve([]),
    include.has('archetypes') ? listArmorArchetypesFromCatalog() : Promise.resolve([]),
    include.has('mods')
      ? listGearMods({ kind: kinds.length ? kinds : undefined, family, q, limit })
      : Promise.resolve([]),
  ])

  const stats =
    statsDb.length > 0
      ? statsDb
      : ARMOR_STAT_ORDER.map((s) => ({
          key: s.key,
          legacyKey: s.legacyKey,
          hash: s.hash,
          order: ARMOR_STAT_ORDER.findIndex((x) => x.key === s.key),
          name: s.label,
          iconUrl: s.iconUrl,
          iconPath: s.iconPath,
        }))

  const archetypes = archetypesDb.length > 0 ? archetypesDb : [...ARMOR_ARCHETYPES]

  const res = NextResponse.json({
    meta: meta ?? {
      syncedAt: null,
      counts: { mods: mods.length, stats: stats.length, archetypes: archetypes.length },
      source: statsDb.length ? 'mongo' : 'static_fallback',
    },
    stats,
    archetypes,
    mods: mods.map((m) => modPayload(m)),
  })
  res.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
  return res
}
