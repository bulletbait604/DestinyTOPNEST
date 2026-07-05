import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth, AuthError, createAuthErrorResponse } from '@/lib/auth/verifyAuth'
import { deleteDestinyUser, getDestinyUserBySiteUserId } from '@/lib/destiny/destinyUserStore'
import { sessionCookieSecure } from '@/lib/sessionCookie'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const user = await verifyAuth(req)
    const stored = await getDestinyUserBySiteUserId(user.username.toLowerCase())
    if (stored) {
      await deleteDestinyUser(user.username.toLowerCase())
    }

    const res = NextResponse.json({ ok: true, loggedOut: true })
    const secure = sessionCookieSecure(req)
    res.cookies.set('session', '', {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    })
    return res
  } catch (error) {
    if (error instanceof AuthError) return createAuthErrorResponse(error)
    return NextResponse.json({ error: 'Failed to disconnect Bungie account' }, { status: 500 })
  }
}
