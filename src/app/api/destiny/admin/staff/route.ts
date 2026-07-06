import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth/verifyAuth'
import { destinyOwnerHandler, destinyStaffHandler } from '@/lib/destiny/apiHandler'
import { logAdminActivity } from '@/lib/destiny/adminActivityLog'
import { grantAdminRole, listStaffMembers, revokeAdminRole } from '@/lib/destiny/adminStaff'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  return destinyStaffHandler(req, async () => {
    const staff = await listStaffMembers()
    return NextResponse.json({ staff })
  })
}

export async function POST(req: NextRequest) {
  return destinyOwnerHandler(req, async () => {
    const authUser = await verifyAuth(req)
    const body = (await req.json().catch(() => ({}))) as {
      action?: string
      username?: string
    }

    const username = body.username?.trim()
    if (!username) {
      return NextResponse.json({ error: 'username is required' }, { status: 400 })
    }

    const actorId = authUser.username.toLowerCase()
    const actorLabel = authUser.displayName

    if (body.action === 'grant_admin') {
      try {
        const target = await grantAdminRole(username)
        await logAdminActivity({
          kind: 'staff_grant',
          actorId,
          actorLabel,
          targetUserId: target.userId,
          targetLabel: target.bungieDisplayName,
          summary: `Granted admin to ${target.bungieDisplayName}`,
        })
        return NextResponse.json({ ok: true, action: 'grant_admin', user: target })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Grant failed'
        return NextResponse.json({ error: message }, { status: 400 })
      }
    }

    if (body.action === 'revoke_admin') {
      try {
        const target = await revokeAdminRole(username)
        await logAdminActivity({
          kind: 'staff_revoke',
          actorId,
          actorLabel,
          targetUserId: target.userId,
          targetLabel: target.bungieDisplayName,
          summary: `Revoked admin from ${target.bungieDisplayName}`,
        })
        return NextResponse.json({ ok: true, action: 'revoke_admin', user: target })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Revoke failed'
        return NextResponse.json({ error: message }, { status: 400 })
      }
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  })
}
