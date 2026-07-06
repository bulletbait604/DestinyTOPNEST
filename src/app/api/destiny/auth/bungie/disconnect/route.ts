import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth, AuthError, createAuthErrorResponse } from '@/lib/auth/verifyAuth'
import { clearBungieOAuth } from '@/lib/destiny/destinyUserStore'

export const dynamic = 'force-dynamic'

/** Unlink Bungie OAuth — site login cookie is preserved so you stay signed in. */
export async function POST(req: NextRequest) {
  try {
    const user = await verifyAuth(req)
    await clearBungieOAuth(user.username.toLowerCase())
    return NextResponse.json({ ok: true, unlinked: true })
  } catch (error) {
    if (error instanceof AuthError) return createAuthErrorResponse(error)
    return NextResponse.json({ error: 'Failed to disconnect Bungie account' }, { status: 500 })
  }
}
