import { NextRequest, NextResponse } from 'next/server'
import { AuthError, extractSessionToken, verifyAuth } from '@/lib/auth/verifyAuth'
import { getActivityHistory, getPlayerProfile } from '@/lib/destiny/bungieClient'
import { getDestinyUserBySiteUserId, getValidAccessToken } from '@/lib/destiny/destinyUserStore'
import { resolveActivityByHash } from '@/lib/destiny/manifest'
import { refreshLiveWeeklyRotationBounded } from '@/lib/destiny/bungieWeekly'
import {
  buildWeekPayload,
  loadPersonalWeek,
  SIGNED_OUT_MESSAGE,
  type RawHistoryActivity,
} from '@/lib/destiny/weekChecklist'
import { getWeeklyResetState } from '@/lib/destiny/weeklyRotation'

export const dynamic = 'force-dynamic'

/**
 * Featured raids and dungeons for the current week, plus the signed-in
 * Guardian's completions since reset. The response is private because it
 * can include that Guardian's activity results.
 */
export async function GET(req: NextRequest) {
  const now = new Date()
  try {
    await refreshLiveWeeklyRotationBounded(now)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error'
    console.warn('[week] rotation refresh failed:', message)
  }
  const state = getWeeklyResetState(now)
  const draft = buildWeekPayload(state, { status: 'signed_out', message: SIGNED_OUT_MESSAGE })

  let personal = draft.personal
  if (extractSessionToken(req)) {
    try {
      const user = await verifyAuth(req)
      const stored = await getDestinyUserBySiteUserId(user.username.toLowerCase())
      const token = stored ? await getValidAccessToken(stored) : null
      personal = await loadPersonalWeek({
        account: stored
          ? {
              bungieMembershipId: stored.bungieMembershipId,
              destinyMembershipType: stored.destinyMembershipType,
              bungieDisplayName: stored.bungieDisplayName || user.displayName,
            }
          : null,
        token,
        resetAt: state.resetAt,
        activities: draft.activities,
        deps: {
          getCharacterIds: async (membershipType, membershipId, accessToken) => {
            const profile = (await getPlayerProfile(membershipType, membershipId, [200], accessToken)) as {
              characters?: { data?: Record<string, unknown> }
            }
            return Object.keys(profile.characters?.data ?? {})
          },
          fetchPage: async (membershipType, membershipId, characterId, mode, page, accessToken) => {
            const response = (await getActivityHistory(
              membershipType,
              membershipId,
              characterId,
              mode,
              25,
              accessToken,
              page
            )) as { activities?: RawHistoryActivity[] }
            return { activities: response.activities ?? [] }
          },
          resolveName: async (hash) => {
            try {
              const definition = await resolveActivityByHash(hash)
              return definition.name || null
            } catch {
              return null
            }
          },
        },
      })
    } catch (error) {
      if (error instanceof AuthError && error.statusCode === 401) {
        personal = { status: 'signed_out', message: SIGNED_OUT_MESSAGE }
      } else {
        const message = error instanceof Error ? error.message : 'Your clears could not be checked.'
        console.warn('[week] personal clears failed:', message)
        personal = {
          status: 'unavailable',
          message: error instanceof AuthError ? error.message : 'Your clears could not be checked.',
        }
      }
    }
  }

  const res = NextResponse.json(buildWeekPayload(state, personal))
  res.headers.set('Cache-Control', 'private, no-store')
  return res
}
