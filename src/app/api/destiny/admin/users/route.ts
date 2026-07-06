import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth/verifyAuth'
import { banUsername, unbanUsername } from '@/lib/bannedUsers'
import { destinyStaffHandler } from '@/lib/destiny/apiHandler'
import { logAdminActivity } from '@/lib/destiny/adminActivityLog'
import {
  getAdminUserDetail,
  listBannedUsers,
  searchAdminUsers,
} from '@/lib/destiny/adminUsers'
import { buildUserProfile } from '@/lib/destiny/profileService'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  return destinyStaffHandler(req, async () => {
    const userId = req.nextUrl.searchParams.get('userId')?.trim()
    if (userId) {
      const detail = await getAdminUserDetail(userId)
      if (!detail) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }
      const characterId = req.nextUrl.searchParams.get('characterId')?.trim() || undefined
      const { profile, bungieLinked } = await buildUserProfile(userId, 'full', characterId)
      return NextResponse.json({
        user: {
          ...detail,
          profile,
          bungieLinked,
        },
      })
    }

    const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''
    const [users, banned] = await Promise.all([searchAdminUsers(q, 25), listBannedUsers()])
    return NextResponse.json({ users, banned })
  })
}

export async function POST(req: NextRequest) {
  return destinyStaffHandler(req, async () => {
    const authUser = await verifyAuth(req)
    const body = (await req.json().catch(() => ({}))) as {
      action?: string
      username?: string
      reason?: string
      note?: string
    }

    const username = body.username?.trim()
    if (!username) {
      return NextResponse.json({ error: 'username is required' }, { status: 400 })
    }

    const actorId = authUser.username.toLowerCase()
    const actorLabel = authUser.displayName

    if (body.action === 'ban') {
      try {
        await banUsername({ username, bannedBy: actorId, reason: body.reason })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Ban failed'
        return NextResponse.json({ error: message }, { status: 400 })
      }

      await logAdminActivity({
        kind: 'user_ban',
        actorId,
        actorLabel,
        targetUserId: username.toLowerCase(),
        targetLabel: username,
        summary: `Banned ${username}`,
        detail: body.reason?.trim(),
      })

      return NextResponse.json({ ok: true, action: 'ban', username: username.toLowerCase() })
    }

    if (body.action === 'unban') {
      const ok = await unbanUsername(username)
      if (!ok) {
        return NextResponse.json({ error: 'User was not banned' }, { status: 404 })
      }

      await logAdminActivity({
        kind: 'user_unban',
        actorId,
        actorLabel,
        targetUserId: username.toLowerCase(),
        targetLabel: username,
        summary: `Unbanned ${username}`,
      })

      return NextResponse.json({ ok: true, action: 'unban', username: username.toLowerCase() })
    }

    if (body.action === 'note') {
      const note = body.note?.trim()
      if (!note) {
        return NextResponse.json({ error: 'note is required' }, { status: 400 })
      }

      await logAdminActivity({
        kind: 'user_note',
        actorId,
        actorLabel,
        targetUserId: username.toLowerCase(),
        targetLabel: username,
        summary: `Staff note on ${username}`,
        detail: note.slice(0, 2000),
      })

      return NextResponse.json({ ok: true, action: 'note' })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  })
}
