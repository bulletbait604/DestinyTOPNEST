import { NextRequest, NextResponse } from 'next/server'
import {
  bungieOAuthConfigured,
  bungieOAuthRedirectUriFromRequest,
  destinyApiConfigured,
} from '@/lib/destiny/env'

export const dynamic = 'force-dynamic'

/** Public OAuth setup hints for the login screen (no secrets). */
export async function GET(req: NextRequest) {
  return NextResponse.json({
    configured: bungieOAuthConfigured(),
    destinyApiConfigured: destinyApiConfigured(),
    redirectUri: bungieOAuthRedirectUriFromRequest(req),
  })
}
