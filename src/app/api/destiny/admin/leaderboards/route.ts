import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth/verifyAuth'
import { destinyStaffHandler } from '@/lib/destiny/apiHandler'
import { logAdminActivity } from '@/lib/destiny/adminActivityLog'
import {
  buildLeaderboardWithAdjustments,
  clearLeaderboardAdjustment,
  loadLeaderboardAdjustments,
  upsertLeaderboardAdjustment,
} from '@/lib/destiny/leaderboardAdjustments'
import type { LeaderboardCategory, LeaderboardPeriod } from '@/lib/destiny/types'
import {
  getSeasonData,
  getSeasonStandingsInput,
} from '@/lib/destiny/store'

export const dynamic = 'force-dynamic'

const CATEGORIES: LeaderboardCategory[] = ['raid', 'dungeon', 'pantheon', 'top_guardians']
const PERIODS: LeaderboardPeriod[] = ['weekly', 'monthly', 'season', 'all_time']

function parseCategory(raw: string | null): LeaderboardCategory | null {
  return raw && CATEGORIES.includes(raw as LeaderboardCategory) ? (raw as LeaderboardCategory) : null
}

function parsePeriod(raw: string | null): LeaderboardPeriod | null {
  return raw && PERIODS.includes(raw as LeaderboardPeriod) ? (raw as LeaderboardPeriod) : null
}

export async function GET(req: NextRequest) {
  return destinyStaffHandler(req, async () => {
    const category = parseCategory(req.nextUrl.searchParams.get('category'))
    const period = parsePeriod(req.nextUrl.searchParams.get('period'))
    if (!category || !period) {
      return NextResponse.json({ error: 'category and period are required' }, { status: 400 })
    }

    const season = await getSeasonData()
    const { runs, usersById, votes } = await getSeasonStandingsInput()
    const [entries, adjustments] = await Promise.all([
      buildLeaderboardWithAdjustments(category, period, season, runs, usersById, votes),
      loadLeaderboardAdjustments(category, period, season.id),
    ])

    return NextResponse.json({ entries, adjustments, category, period, seasonId: season.id })
  })
}

export async function POST(req: NextRequest) {
  return destinyStaffHandler(req, async () => {
    const authUser = await verifyAuth(req)
    const actorId = authUser.username.toLowerCase()
    const body = (await req.json().catch(() => ({}))) as {
      action?: string
      entryKey?: string
      displayName?: string
      category?: LeaderboardCategory
      period?: LeaderboardPeriod
      points?: number
      pointsDelta?: number
      verifiedClears?: number
      notes?: string
    }

    const category = body.category && CATEGORIES.includes(body.category) ? body.category : null
    const period = body.period && PERIODS.includes(body.period) ? body.period : null
    const entryKey = body.entryKey?.trim()
    if (!category || !period || !entryKey) {
      return NextResponse.json({ error: 'entryKey, category, and period are required' }, { status: 400 })
    }

    const season = await getSeasonData()

    if (body.action === 'clear') {
      const ok = await clearLeaderboardAdjustment(entryKey, category, period, season.id)
      if (!ok) {
        return NextResponse.json({ error: 'No adjustment found to clear' }, { status: 404 })
      }
      await logAdminActivity({
        kind: 'leaderboard_adjust',
        actorId,
        actorLabel: authUser.displayName,
        targetUserId: entryKey.toLowerCase(),
        summary: `Cleared leaderboard adjustment (${category} · ${period})`,
      })
      return NextResponse.json({ ok: true, action: 'clear' })
    }

    if (body.action === 'exclude') {
      await upsertLeaderboardAdjustment({
        entryKey,
        displayName: body.displayName,
        category,
        period,
        seasonId: season.id,
        adjustedBy: actorId,
        excluded: true,
        notes: body.notes,
      })
      await logAdminActivity({
        kind: 'leaderboard_adjust',
        actorId,
        actorLabel: authUser.displayName,
        targetUserId: entryKey.toLowerCase(),
        summary: `Excluded from ${category} leaderboard (${period})`,
        detail: body.notes,
      })
      return NextResponse.json({ ok: true, action: 'exclude' })
    }

    if (body.action === 'set_points') {
      if (body.points == null || !Number.isFinite(body.points)) {
        return NextResponse.json({ error: 'points is required' }, { status: 400 })
      }
      await upsertLeaderboardAdjustment({
        entryKey,
        displayName: body.displayName,
        category,
        period,
        seasonId: season.id,
        adjustedBy: actorId,
        pointsOverride: Math.max(0, Math.round(body.points)),
        verifiedClearsOverride:
          body.verifiedClears != null && Number.isFinite(body.verifiedClears)
            ? Math.max(0, Math.round(body.verifiedClears))
            : undefined,
        notes: body.notes,
      })
      await logAdminActivity({
        kind: 'leaderboard_adjust',
        actorId,
        actorLabel: authUser.displayName,
        targetUserId: entryKey.toLowerCase(),
        summary: `Set ${category} points to ${Math.round(body.points)} (${period})`,
        detail: body.notes,
        metadata: { points: Math.round(body.points), category, period },
      })
      return NextResponse.json({ ok: true, action: 'set_points' })
    }

    if (body.action === 'add_delta') {
      if (body.pointsDelta == null || !Number.isFinite(body.pointsDelta)) {
        return NextResponse.json({ error: 'pointsDelta is required' }, { status: 400 })
      }
      await upsertLeaderboardAdjustment({
        entryKey,
        displayName: body.displayName,
        category,
        period,
        seasonId: season.id,
        adjustedBy: actorId,
        pointsDelta: Math.round(body.pointsDelta),
        verifiedClearsDelta:
          body.verifiedClears != null && Number.isFinite(body.verifiedClears)
            ? Math.round(body.verifiedClears)
            : undefined,
        notes: body.notes,
      })
      await logAdminActivity({
        kind: 'leaderboard_adjust',
        actorId,
        actorLabel: authUser.displayName,
        targetUserId: entryKey.toLowerCase(),
        summary: `Adjusted ${category} by ${Math.round(body.pointsDelta)} pts (${period})`,
        detail: body.notes,
        metadata: { pointsDelta: Math.round(body.pointsDelta), category, period },
      })
      return NextResponse.json({ ok: true, action: 'add_delta' })
    }

    return NextResponse.json(
      { error: 'Use action: set_points, add_delta, exclude, or clear' },
      { status: 400 }
    )
  })
}
