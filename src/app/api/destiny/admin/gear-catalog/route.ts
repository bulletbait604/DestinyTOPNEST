import { NextRequest, NextResponse } from 'next/server'
import { destinyStaffHandler } from '@/lib/destiny/apiHandler'
import { getGearCatalogMeta, listGearMods } from '@/lib/destiny/gearCatalog'

export const dynamic = 'force-dynamic'

/** Staff-only gear catalog status. Icons are refreshed from the admin season tools. */
export async function GET(req: NextRequest) {
  return destinyStaffHandler(req, async () => {
    const meta = await getGearCatalogMeta()
    const sample = await listGearMods({ kind: ['armor', 'weapon'], limit: 5 })
    return NextResponse.json({
      meta,
      sample,
    })
  })
}
