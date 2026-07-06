import { NextRequest, NextResponse } from 'next/server'
import { getSessionSecret } from '@/lib/auth/sessionJwt'
import { destinyStaffHandler } from '@/lib/destiny/apiHandler'
import {
  bungieOAuthConfigured,
  destinyApiConfigured,
} from '@/lib/destiny/env'
import { getPersistenceHealth } from '@/lib/destiny/persistenceHealth'
import { getMongoDbName } from '@/lib/database'

export const dynamic = 'force-dynamic'

/** Staff-only deployment readiness — no redirect URIs or infra details exposed publicly. */
export async function GET(req: NextRequest) {
  return destinyStaffHandler(req, async () => {
    const persistence = await getPersistenceHealth()

    return NextResponse.json({
      bungieOAuthConfigured: bungieOAuthConfigured(),
      destinyApiConfigured: destinyApiConfigured(),
      sessionConfigured: Boolean(getSessionSecret()),
      mongoConfigured: Boolean(process.env.MONGODB_URI?.trim()),
      mongoDatabase: getMongoDbName(),
      persistence,
    })
  })
}
