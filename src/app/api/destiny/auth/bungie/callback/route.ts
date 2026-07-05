import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth, AuthError } from '@/lib/auth/verifyAuth'
import { ensureSiteUserRecord, signSessionCookieForUser } from '@/lib/auth/issueSession'
import {
  exchangeBungieAuthorizationCode,
  fetchLinkedGuardianSummary,
  formatBungieDisplayName,
  getDestinyMembershipsForCurrentUser,
  pickPrimaryDestinyMembership,
  platformFromMembershipType,
} from '@/lib/destiny/bungieOAuth'
import { consumeBungieOAuthState } from '@/lib/destiny/bungieOAuthStateStore'
import {
  getDestinyUserByBungieMembershipId,
  getDestinyUserBySiteUserId,
  upsertDestinyUser,
} from '@/lib/destiny/destinyUserStore'
import { bungieOAuthRedirectUriFromRequest } from '@/lib/destiny/env'
import { defaultBungieReturnPath } from '@/lib/routing/tabUrl'
import { sessionCookieSecure } from '@/lib/sessionCookie'

export const dynamic = 'force-dynamic'

const LOGIN_FLOW_USER = 'login'

function redirectAfterOAuth(
  params: Record<string, string>,
  req: NextRequest,
  returnPath?: string
): NextResponse {
  const safeReturn =
    returnPath && returnPath.startsWith('/') && !returnPath.startsWith('//')
      ? returnPath
      : defaultBungieReturnPath()

  const target = new URL(safeReturn, req.url)
  for (const [k, v] of Object.entries(params)) {
    target.searchParams.set(k, v)
  }

  const res = NextResponse.redirect(target)
  const secure = sessionCookieSecure(req)
  res.cookies.set('bungieOAuthState', '', {
    httpOnly: true,
    secure,
    sameSite: secure ? 'none' : 'lax',
    path: '/',
    maxAge: 0,
  })
  return res
}

export async function GET(req: NextRequest) {
  let returnPath: string | undefined

  try {
    const { searchParams } = new URL(req.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    const stateRecord = state ? await consumeBungieOAuthState(state) : null
    returnPath = stateRecord?.returnPath

    if (error) {
      return redirectAfterOAuth({ bungie: 'error', message: error }, req, returnPath)
    }

    if (!code || !state) {
      return redirectAfterOAuth({ bungie: 'error', message: 'missing_code' }, req, returnPath)
    }

    if (!stateRecord) {
      const cookieState = req.cookies.get('bungieOAuthState')?.value
      if (!cookieState || cookieState !== state) {
        return redirectAfterOAuth({ bungie: 'error', message: 'invalid_state' }, req, returnPath)
      }
      return redirectAfterOAuth({ bungie: 'error', message: 'invalid_state' }, req, returnPath)
    }

    const redirectUri =
      stateRecord.redirectUri ||
      req.cookies.get('bungieOAuthRedirect')?.value ||
      bungieOAuthRedirectUriFromRequest(req)

    const tokens = await exchangeBungieAuthorizationCode(code, redirectUri)
    const memberships = await getDestinyMembershipsForCurrentUser(tokens.accessToken)
    const primary = pickPrimaryDestinyMembership(
      memberships.destinyMemberships ?? [],
      memberships.primaryMembershipId
    )

    if (!primary) {
      return redirectAfterOAuth({ bungie: 'error', message: 'no_destiny_account' }, req, returnPath)
    }

    const displayName = formatBungieDisplayName(primary)
    const existingByBungie = await getDestinyUserByBungieMembershipId(primary.membershipId)
    let siteUserId = (existingByBungie?.userId ?? primary.membershipId).toLowerCase()

    const stateUserId = stateRecord.userId?.toLowerCase()
    const isLoginFlow = !stateUserId || stateUserId === LOGIN_FLOW_USER

    if (!isLoginFlow) {
      if (stateUserId !== siteUserId) {
        const stored = await getDestinyUserBySiteUserId(stateUserId)
        if (
          stored?.bungieMembershipId &&
          stored.bungieMembershipId !== primary.membershipId
        ) {
          return redirectAfterOAuth({ bungie: 'error', message: 'account_mismatch' }, req, returnPath)
        }
        siteUserId = stateUserId
      }

      try {
        const sessionUser = await verifyAuth(req)
        if (sessionUser.username.toLowerCase() !== siteUserId) {
          return redirectAfterOAuth({ bungie: 'error', message: 'account_mismatch' }, req, returnPath)
        }
      } catch (authError) {
        if (!(authError instanceof AuthError)) throw authError
      }
    }

    let summary: Awaited<ReturnType<typeof fetchLinkedGuardianSummary>> | undefined
    try {
      summary = await fetchLinkedGuardianSummary(
        primary.membershipType,
        primary.membershipId,
        tokens.accessToken
      )
    } catch (summaryError) {
      console.warn('[destiny/auth/bungie/callback] Guardian summary fetch failed:', summaryError)
    }

    await upsertDestinyUser(siteUserId, {
      bungieMembershipId: primary.membershipId,
      bungieNetMembershipId: tokens.membershipId,
      destinyMembershipType: primary.membershipType,
      bungieDisplayName: displayName,
      platform: platformFromMembershipType(primary.membershipType) as
        | 'steam'
        | 'xbox'
        | 'playstation'
        | 'epic',
      emblemUrl: summary?.emblemUrl,
      powerLevel: summary?.powerLevel,
      characterClass: summary?.characterClass,
      guardianRank: undefined,
      connectedAt: new Date().toISOString(),
      oauth: tokens,
    })

    const role = await ensureSiteUserRecord(siteUserId, primary.membershipId, displayName)
    const res = redirectAfterOAuth({ bungie: 'linked' }, req, returnPath)
    await signSessionCookieForUser(siteUserId, displayName, role, req, res)

    return res
  } catch (error) {
    console.error('[destiny/auth/bungie/callback]', error)
    const detail = error instanceof Error ? error.message : 'exchange_failed'
    const lower = detail.toLowerCase()
    const message =
      lower.includes('redirect_uri') || lower.includes('redirect uri')
        ? 'redirect_uri_mismatch'
        : detail.slice(0, 180)
    return redirectAfterOAuth({ bungie: 'error', message }, req, returnPath)
  }
}
