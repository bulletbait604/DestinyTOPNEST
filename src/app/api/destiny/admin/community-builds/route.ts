import { NextRequest } from 'next/server'
import { verifyAuth } from '@/lib/auth/verifyAuth'
import { destinyStaffHandler } from '@/lib/destiny/apiHandler'
import { logAdminActivity } from '@/lib/destiny/adminActivityLog'
import { communityBuildError, communityBuildJson, readJsonObject } from '@/lib/destiny/communityBuildHttp'
import {
  isCommunityBuildId,
  toCommunityBuildPublic,
  validateModerationNote,
  type CommunityBuildStatus,
} from '@/lib/destiny/communityBuildModel'
import {
  deleteCommunityBuild,
  listCommunityBuildsForStaff,
  setCommunityBuildStatus,
} from '@/lib/destiny/communityBuildStore'

export const dynamic = 'force-dynamic'

const ACTIONS = ['hide', 'restore', 'remove', 'delete'] as const
type ModerationAction = (typeof ACTIONS)[number]

function statusFor(action: ModerationAction): CommunityBuildStatus | null {
  if (action === 'hide') return 'hidden'
  if (action === 'restore') return 'published'
  if (action === 'remove') return 'removed'
  return null
}

export async function GET(req: NextRequest) {
  return destinyStaffHandler(req, async () => {
    const builds = await listCommunityBuildsForStaff(40)
    return communityBuildJson({
      builds: builds.map((build) => ({
        ...toCommunityBuildPublic(build, { staff: true, userId: build.ownerUserId }),
        ownerUserId: build.ownerUserId,
      })),
    })
  })
}

export async function POST(req: NextRequest) {
  return destinyStaffHandler(req, async () => {
    const authUser = await verifyAuth(req)
    const body = await readJsonObject(req)
    if (!body) return communityBuildError('Moderation request must be an object.', 400)

    const action = typeof body.action === 'string' ? body.action : ''
    if (!ACTIONS.includes(action as ModerationAction)) {
      return communityBuildError('Unknown moderation action.', 400)
    }
    const buildId = typeof body.buildId === 'string' ? body.buildId : ''
    if (!isCommunityBuildId(buildId)) return communityBuildError('Build not found.', 404)

    const note = validateModerationNote(body.note)
    const actorId = authUser.username.toLowerCase()
    const typed = action as ModerationAction

    if (typed === 'delete') {
      const result = await deleteCommunityBuild(buildId, actorId, true)
      if (!result.ok) return communityBuildError(result.error, result.status)
      await logAdminActivity({
        kind: 'community_build_moderate',
        actorId,
        actorLabel: authUser.displayName,
        summary: 'Deleted a shared build',
        detail: note || undefined,
        metadata: { buildId },
      })
      return communityBuildJson({ ok: true })
    }

    const status = statusFor(typed)
    if (!status) return communityBuildError('Unknown moderation action.', 400)
    const updated = await setCommunityBuildStatus(buildId, status, note)
    if (!updated.ok) return communityBuildError(updated.error, updated.status)

    await logAdminActivity({
      kind: 'community_build_moderate',
      actorId,
      actorLabel: authUser.displayName,
      targetUserId: updated.build.ownerUserId,
      targetLabel: updated.build.ownerDisplayName,
      summary: `${typed === 'restore' ? 'Restored' : typed === 'hide' ? 'Hid' : 'Removed'} shared build “${updated.build.name}”`,
      detail: note || undefined,
      metadata: { buildId, status },
    })

    return communityBuildJson({
      build: {
        ...toCommunityBuildPublic(updated.build, { staff: true, userId: updated.build.ownerUserId }),
        ownerUserId: updated.build.ownerUserId,
      },
    })
  })
}
