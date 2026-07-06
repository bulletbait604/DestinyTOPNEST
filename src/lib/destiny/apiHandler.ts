import { NextRequest, NextResponse } from 'next/server'
import { AuthError, createAuthErrorResponse, verifyAuth } from '@/lib/auth/verifyAuth'
import { verifyOwnerUser, verifyStaffUser } from '@/lib/auth/staffAccess'

export const dynamic = 'force-dynamic'

/** Requires any logged-in Bungie user — default for Top Nest player features. */
export async function destinyAuthHandler(
  req: NextRequest,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    await verifyAuth(req)
    return await handler()
  } catch (error) {
    if (error instanceof AuthError) return createAuthErrorResponse(error)
    console.error('[destiny]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** Requires admin or owner — admin review, diagnostics. */
export async function destinyStaffHandler(
  req: NextRequest,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    await verifyStaffUser(req)
    return await handler()
  } catch (error) {
    if (error instanceof AuthError) return createAuthErrorResponse(error)
    console.error('[destiny]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** Requires primary owner — staff grants and other owner-only actions. */
export async function destinyOwnerHandler(
  req: NextRequest,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    await verifyOwnerUser(req)
    return await handler()
  } catch (error) {
    if (error instanceof AuthError) return createAuthErrorResponse(error)
    console.error('[destiny]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
