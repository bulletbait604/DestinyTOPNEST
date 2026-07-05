import { NextRequest, NextResponse } from 'next/server'
import { getSessionSecret } from '@/lib/auth/sessionJwt'
import {
  bungieOAuthConfigured,
  bungieOAuthRedirectUriFromRequest,
  destinyApiConfigured,
} from '@/lib/destiny/env'

export const dynamic = 'force-dynamic'

/** Public readiness probe — no secrets exposed. */
export async function GET(req: NextRequest) {
  const mongoUri = process.env.MONGODB_URI?.trim()

  return NextResponse.json({
    bungieOAuthConfigured: bungieOAuthConfigured(),
    destinyApiConfigured: destinyApiConfigured(),
    sessionConfigured: Boolean(getSessionSecret()),
    mongoConfigured: Boolean(mongoUri),
    redirectUri: bungieOAuthRedirectUriFromRequest(req),
  })
}
