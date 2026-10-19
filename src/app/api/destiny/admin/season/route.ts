import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth/verifyAuth'
import { destinyStaffHandler } from '@/lib/destiny/apiHandler'
import { logAdminActivity } from '@/lib/destiny/adminActivityLog'
import {
  finalizeActiveSeason,
  getPendingPrizeClaims,
  getSeasonData,
  getSeasonStandingsInput,
  saveSeasonData,
  updatePrizeClaimStatus,
} from '@/lib/destiny/store'
import { resolvePrizesEnabled } from '@/lib/destiny/siteContent'
import { computeSeasonStandings } from '@/lib/destiny/seasonPrizes'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  return destinyStaffHandler(req, async () => {
    const season = await getSeasonData()
    const { runs, usersById, votes } = await getSeasonStandingsInput()
    const { hallOfFame } = await computeSeasonStandings(runs, usersById, season, votes)
    const pendingClaims = await getPendingPrizeClaims()

    return NextResponse.json({
      season,
      hallOfFamePreview: hallOfFame.slice(0, 15),
      pendingClaims,
      canFinalize: season.status === 'active',
    })
  })
}

export async function POST(req: NextRequest) {
  return destinyStaffHandler(req, async () => {
    const authUser = await verifyAuth(req)
    const actorId = authUser.username.toLowerCase()
    const body = (await req.json().catch(() => ({}))) as {
      action?: string
      claimId?: string
      claimStatus?: 'fulfilled' | 'rejected'
      adminNotes?: string
      season?: { name?: string; tagline?: string; startDate?: string; endDate?: string }
    }

    if (body.action === 'update_season') {
      const patch = body.season ?? {}
      const valid = (v?: string) => v === undefined || (typeof v === 'string' && !Number.isNaN(Date.parse(v)))
      if (!valid(patch.startDate) || !valid(patch.endDate)) {
        return NextResponse.json({ error: 'Enter a valid start and end.' }, { status: 400 })
      }
      if (patch.startDate && patch.endDate && Date.parse(patch.endDate) <= Date.parse(patch.startDate)) {
        return NextResponse.json({ error: 'The end must be after the start.' }, { status: 400 })
      }
      const season = await getSeasonData()
      const adminOverride = {
        ...(season.adminOverride ?? {}),
        ...(patch.name ? { name: String(patch.name).slice(0, 80) } : {}),
        ...(patch.tagline ? { tagline: String(patch.tagline).slice(0, 200) } : {}),
        ...(patch.startDate ? { startDate: new Date(patch.startDate).toISOString() } : {}),
        ...(patch.endDate ? { endDate: new Date(patch.endDate).toISOString() } : {}),
      }
      await saveSeasonData({ ...season, adminOverride })
      await logAdminActivity({
        kind: 'season_finalize',
        actorId,
        actorLabel: authUser.displayName,
        summary: `Updated season ${season.id}`,
        metadata: { seasonId: season.id, ...adminOverride },
      })
      return NextResponse.json({ ok: true, season: await getSeasonData() })
    }

    if (body.action === 'finalize') {
      const season = await getSeasonData()
      if (season.status !== 'active') {
        return NextResponse.json({ error: 'No active season to finalize' }, { status: 400 })
      }
      const archived = await finalizeActiveSeason()
      await logAdminActivity({
        kind: 'season_finalize',
        actorId,
        actorLabel: authUser.displayName,
        summary: `Finalized season ${archived.name}`,
        metadata: { seasonId: archived.id },
      })
      return NextResponse.json({
        ok: true,
        message: 'Season finalized and winners locked.',
        season: archived,
      })
    }

    if (body.action === 'update_claim') {
      if (!(await resolvePrizesEnabled())) {
        return NextResponse.json(
          { error: 'Prize claims are turned off. Turn them on under Season, then try again.' },
          { status: 403 }
        )
      }
      if (!body.claimId || !body.claimStatus) {
        return NextResponse.json({ error: 'claimId and claimStatus required' }, { status: 400 })
      }
      const ok = await updatePrizeClaimStatus(body.claimId, body.claimStatus, body.adminNotes)
      if (!ok) {
        return NextResponse.json({ error: 'Claim not found' }, { status: 404 })
      }
      await logAdminActivity({
        kind: 'prize_claim',
        actorId,
        actorLabel: authUser.displayName,
        summary: `Prize claim ${body.claimStatus} — ${body.claimId}`,
        detail: body.adminNotes,
        metadata: { claimId: body.claimId, status: body.claimStatus },
      })
      return NextResponse.json({ ok: true, claimId: body.claimId, status: body.claimStatus })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  })
}
