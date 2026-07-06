import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth, AuthError } from '@/lib/auth/verifyAuth'
import { safeReturnPath } from '@/lib/auth/safeReturnPath'
import { ensureSiteUserRecord, signSessionCookieForUser } from '@/lib/auth/issueSession'
import { getSessionSecret } from '@/lib/auth/sessionJwt'
import {
  exchangeBungieAuthorizationCode,
  fetchLinkedGuardianSummary,
  formatBungieDisplayName,
  getDestinyMembershipsForCurrentUser,
  pickPrimaryDestinyMembership,
  platformFromMembershipType,
} from '@/lib/destiny/bungieOAuth'
import { consumeBungieOAuthState } from '@/lib/destiny/bungieOAuthState'
import { verifySignedBungieOAuthState } from '@/lib/destiny/bungieOAuthStateCookie'
import {
  getDestinyUserByBungieMembershipId,
  getDestinyUserBySiteUserId,
  upsertDestinyUser,
} from '@/lib/destiny/destinyUserStore'
import { bungieOAuthRedirectUriFromRequest, TOPNEST_PRODUCTION_ORIGIN } from '@/lib/destiny/env'
import { defaultBungieReturnPath } from '@/lib/routing/tabUrl'
import { sessionCookieSecure } from '@/lib/sessionCookie'

export const dynamic = 'force-dynamic'

const LOGIN_FLOW_USER = 'login'

function redirectBase(req: NextRequest): string {
  const base = process.env.NEXT_PUBLIC_BASE_URL?.trim()
  if (base) return base.replace(/\/$/, '')
  if (process.env.VERCEL_ENV === 'production') return TOPNEST_PRODUCTION_ORIGIN
  try {
    return new URL(req.url).origin
  } catch {
    return TOPNEST_PRODUCTION_ORIGIN
  }
}

function redirectAfterOAuth(
  params: Record<string, string>,
  req: NextRequest,
  returnPath?: string
): NextResponse {
  const safeReturn = safeReturnPath(returnPath, redirectBase(req), defaultBungieReturnPath())

  const target = new URL(safeReturn, redirectBase(req))
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

async function resolveOAuthState(
  state: string,
  req: NextRequest
): Promise<{
  userId: string
  redirectUri: string
  returnPath: string
} | null> {
  const signed = verifySignedBungieOAuthState(state)
  if (signed) {
    return {
      userId: signed.userId,
      redirectUri: signed.redirectUri,
      returnPath: signed.returnPath,
    }
  }

  const mongoRecord = await consumeBungieOAuthState(state)
  if (mongoRecord) {
    return {
      userId: mongoRecord.userId,
      redirectUri: mongoRecord.redirectUri,
      returnPath: mongoRecord.returnPath,
    }
  }

  const cookieState = req.cookies.get('bungieOAuthState')?.value
  if (cookieState === state) {
    const cookieSigned = verifySignedBungieOAuthState(cookieState)
    if (cookieSigned) {
      return {
        userId: cookieSigned.userId,
        redirectUri: cookieSigned.redirectUri,
        returnPath: cookieSigned.returnPath,
      }
    }
  }

  return null
}

export async function GET(req: NextRequest) {
  let returnPath: string | undefined

  try {
    const { searchParams } = new URL(req.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    if (error) {
      return redirectAfterOAuth({ bungie: 'error', message: error }, req, returnPath)
    }

    if (!code || !state) {
      return redirectAfterOAuth({ bungie: 'error', message: 'missing_code' }, req, returnPath)
    }

    const stateRecord = await resolveOAuthState(state, req)
    if (!stateRecord) {
      return redirectAfterOAuth({ bungie: 'error', message: 'invalid_state' }, req, returnPath)
    }

    returnPath = safeReturnPath(stateRecord.returnPath, redirectBase(req), defaultBungieReturnPath())

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

    if (!getSessionSecret()) {
      return redirectAfterOAuth({ bungie: 'error', message: 'session_not_configured' }, req, returnPath)
    }

    const role = await ensureSiteUserRecord(siteUserId, primary.membershipId, displayName)
    const res = redirectAfterOAuth({ bungie: 'linked' }, req, returnPath)
    const cookieSet = await signSessionCookieForUser(siteUserId, displayName, role, req, res)

    if (!cookieSet) {
      return redirectAfterOAuth({ bungie: 'error', message: 'session_not_configured' }, req, returnPath)
    }

    return res
  } catch (error) {
    console.error('[destiny/auth/bungie/callback]', error)
    const detail = error instanceof Error ? error.message : ''
    const lower = detail.toLowerCase()
    const message =
      lower.includes('redirect_uri') || lower.includes('redirect uri')
        ? 'redirect_uri_mismatch'
        : lower.includes('mongodb') || lower.includes('mongo')
          ? 'database_unavailable'
          : 'exchange_failed'
    return redirectAfterOAuth({ bungie: 'error', message }, req, returnPath)
  }
}
