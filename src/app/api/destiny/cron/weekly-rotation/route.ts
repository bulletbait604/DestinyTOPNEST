import { timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { refreshLiveWeeklyRotation } from '@/lib/destiny/bungieWeekly'
import { cronSecret } from '@/lib/destiny/env'
import { getWeeklyResetState } from '@/lib/destiny/weeklyRotation'

export const dynamic = 'force-dynamic'

/**
 * Vercel cron — Tuesday 17:10 UTC, ten minutes after the weekly reset.
 * Pulls Destiny2/Milestones, then a weekly reset post, and caches the pair in Mongo.
 * Set CRON_SECRET and send Authorization: Bearer <CRON_SECRET>.
 */
export async function GET(req: NextRequest) {
  const secret = cronSecret()
  const auth = req.headers.get('authorization')
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET is not configured' }, { status: 503 })
  }
  if (!auth || !safeEqual(auth, `Bearer ${secret}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  await refreshLiveWeeklyRotation(now)
  const state = getWeeklyResetState(now)
  return NextResponse.json({
    weekStart: state.weekStart,
    rotationSource: state.rotationSource,
    featuredRaids: state.featuredRaids.map((raid) => raid.name),
    featuredDungeons: state.featuredDungeons.map((dungeon) => dungeon.name),
    pantheon: state.pantheon ?? null,
    nightfall: state.nightfall ?? null,
  })
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  return ab.length === bb.length && timingSafeEqual(ab, bb)
}
