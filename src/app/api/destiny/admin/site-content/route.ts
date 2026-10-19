import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth/verifyAuth'
import { destinyStaffHandler } from '@/lib/destiny/apiHandler'
import { logAdminActivity } from '@/lib/destiny/adminActivityLog'
import { bungieOAuthConfigured, bungieOAuthRedirectUriFromRequest } from '@/lib/destiny/env'
import { DEFAULT_WEEKLY_CONTRACTS } from '@/lib/destiny/weeklyContractCatalog'
import {
  DEFAULT_PRIZE_COPY,
  loadNightOpsEvents,
  loadPrizeCopy,
  loadWeeklyGoals,
  readSiteContent,
  resolvePrizesEnabled,
  saveEvents,
  savePrizeSettings,
  saveWeeklyGoals,
  SiteContentError,
  resetWeeklyGoals,
} from '@/lib/destiny/siteContent'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  return destinyStaffHandler(req, async () => {
    const saved = await readSiteContent()
    const [contracts, events, prizesEnabled, prizeCopy] = await Promise.all([
      loadWeeklyGoals(),
      loadNightOpsEvents(),
      resolvePrizesEnabled(),
      loadPrizeCopy(),
    ])
    return NextResponse.json({
      contracts,
      contractsCustomized: Boolean(saved?.contracts?.length),
      builtinContracts: DEFAULT_WEEKLY_CONTRACTS,
      events,
      eventsCustomized: Boolean(saved?.eventsCustomized),
      prizesEnabled,
      prizeCopy: prizeCopy ?? DEFAULT_PRIZE_COPY,
      bungieReady: bungieOAuthConfigured(),
      redirectUri: bungieOAuthRedirectUriFromRequest(req),
    })
  })
}

export async function POST(req: NextRequest) {
  return destinyStaffHandler(req, async () => {
    const authUser = await verifyAuth(req)
    const body = (await req.json().catch(() => ({}))) as {
      action?: string
      contracts?: unknown
      events?: unknown
      prizesEnabled?: unknown
      prizeCopy?: unknown
    }
    try {
      if (body.action === 'save_goals') {
        const contracts = await saveWeeklyGoals(body.contracts)
        await logAdminActivity({
          kind: 'site_content',
          actorId: authUser.username,
          actorLabel: authUser.displayName,
          summary: `Saved ${contracts.length} weekly goals`,
        })
        return NextResponse.json({ ok: true, contracts })
      }
      if (body.action === 'reset_goals') {
        const contracts = await resetWeeklyGoals()
        await logAdminActivity({
          kind: 'site_content',
          actorId: authUser.username,
          actorLabel: authUser.displayName,
          summary: 'Restored the built-in weekly goals',
        })
        return NextResponse.json({ ok: true, contracts })
      }
      if (body.action === 'save_events') {
        const events = await saveEvents(body.events)
        await logAdminActivity({
          kind: 'site_content',
          actorId: authUser.username,
          actorLabel: authUser.displayName,
          summary: events.length ? `Saved ${events.length} events` : 'Cleared the event schedule',
        })
        return NextResponse.json({ ok: true, events })
      }
      if (body.action === 'save_prizes') {
        const saved = await savePrizeSettings({ prizesEnabled: body.prizesEnabled, prizeCopy: body.prizeCopy })
        await logAdminActivity({
          kind: 'site_content',
          actorId: authUser.username,
          actorLabel: authUser.displayName,
          summary: saved.prizesEnabled ? 'Turned prize claims on' : 'Turned prize claims off',
        })
        return NextResponse.json({ ok: true, ...saved })
      }
      return NextResponse.json({ error: 'Choose a save action.' }, { status: 400 })
    } catch (error) {
      if (error instanceof SiteContentError) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      console.error('[admin/site-content]', error)
      return NextResponse.json({ error: 'Could not save. Try again in a moment.' }, { status: 500 })
    }
  })
}
