import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth/verifyAuth'
import { destinyAuthHandler } from '@/lib/destiny/apiHandler'
import { getPostGameCarnageReport, getPlayerProfile, searchPlayer } from '@/lib/destiny/bungieClient'
import { getDestinyUserByBungieMembershipId, getDestinyUserBySiteUserId, getValidAccessToken } from '@/lib/destiny/destinyUserStore'
import { resolveActivityByHash } from '@/lib/destiny/manifest'
import { invalidateOverviewCache } from '@/lib/destiny/overviewCache'
import {
  buildLookupRows,
  collectRaidDungeonHistory,
  parseLookupQuery,
  syncHistoryDepth,
  type HistoryActivity,
} from '@/lib/destiny/runLookup'
import { resolveUnregisteredKickOwner } from '@/lib/destiny/kickGuardians'
import { scoreSelectedRuns } from '@/lib/destiny/runIngestion'
import { getRunRecordsByPgcrIds } from '@/lib/destiny/store'
import type { ActivityType } from '@/lib/destiny/types'

export const dynamic = 'force-dynamic'

type ProfileShape = { characters?: { data?: Record<string, unknown> } }

function activityTypeFromDetails(details: { mode?: number; modes?: number[] } | undefined): 'raid' | 'dungeon' | null {
  const modes = [details?.mode, ...(details?.modes ?? [])]
  if (modes.includes(82)) return 'dungeon'
  if (modes.includes(4)) return 'raid'
  return null
}

async function activityNames(activities: HistoryActivity[]): Promise<Record<string, string>> {
  const hashes = Array.from(new Set(activities.map((row) => row.referenceId).filter((hash): hash is number => Boolean(hash))))
  const names: Record<string, string> = {}
  await Promise.all(
    hashes.map(async (hash) => {
      try {
        const def = await resolveActivityByHash(hash)
        if (def?.name) names[String(hash)] = def.name
      } catch {
        /* mode label is enough when the manifest misses */
      }
    })
  )
  return names
}

export async function GET(req: NextRequest) {
  return destinyAuthHandler(req, async () => {
    try {
    const authUser = await verifyAuth(req)
    const siteUserId = authUser.username.toLowerCase()
    const stored = await getDestinyUserBySiteUserId(siteUserId)
    const accessToken = stored ? (await getValidAccessToken(stored)) ?? undefined : undefined
    const params = req.nextUrl.searchParams
    const q = params.get('q') ?? ''
    const parsed = parseLookupQuery(q)
    if (parsed.kind === 'invalid') {
      return NextResponse.json({ error: 'Use a Bungie name like Name#1234, or a PGCR id.' }, { status: 400 })
    }

    const pages = syncHistoryDepth({
      includePrevious: params.get('includePrevious') === '1' || params.get('pages') === '6',
      pages: Number(params.get('pages') || '') || undefined,
    }).pages

    let membershipId = params.get('membershipId')?.trim() || ''
    let membershipType = Number(params.get('membershipType') || '') || 0
    let displayName = stored?.bungieDisplayName || 'Guardian'

    if (parsed.kind === 'pgcr') {
      const pgcr = (await getPostGameCarnageReport(parsed.pgcrId, accessToken)) as {
        period?: string
        activityDetails?: { instanceId?: string; mode?: number; modes?: number[]; referenceId?: number; directorActivityHash?: number }
        entries?: unknown[]
      }
      const type = activityTypeFromDetails(pgcr.activityDetails)
      if (!type) return NextResponse.json({ error: 'That activity is not a raid or dungeon clear.' }, { status: 400 })
      const activity: HistoryActivity = {
        instanceId: String(pgcr.activityDetails?.instanceId || parsed.pgcrId),
        type,
        period: pgcr.period,
        durationSeconds: 0,
        completed: true,
        referenceId: Number(pgcr.activityDetails?.referenceId ?? pgcr.activityDetails?.directorActivityHash ?? 0) || undefined,
        playerCount: pgcr.entries?.length ?? 0,
      }
      if (!membershipId && stored?.bungieMembershipId) {
        membershipId = stored.bungieMembershipId
        membershipType = stored.destinyMembershipType ?? 3
      }
      const existing = await getRunRecordsByPgcrIds([activity.instanceId])
      const rows = buildLookupRows({
        activities: [activity],
        existing,
        names: await activityNames([activity]),
        membershipId,
        membershipType: membershipType || 3,
        displayName,
      })
      return NextResponse.json({ displayName, membershipId, membershipType: membershipType || 3, runs: rows })
    }

    if (parsed.kind === 'name') {
      const hits = await searchPlayer(parsed.displayName, parsed.code)
      const hit = hits?.[0]
      if (!hit?.membershipId) return NextResponse.json({ error: 'No Guardian matched that Bungie name.' }, { status: 404 })
      membershipId = String(hit.membershipId)
      membershipType = hit.membershipType
      displayName = hit.displayName?.includes('#')
        ? hit.displayName
        : `${parsed.displayName}#${String(parsed.code).padStart(4, '0')}`
    } else if (!membershipId) {
      if (!stored?.bungieMembershipId || !stored.destinyMembershipType) {
        return NextResponse.json({ error: 'Sign in with Bungie, or look up a Name#1234.' }, { status: 400 })
      }
      membershipId = stored.bungieMembershipId
      membershipType = stored.destinyMembershipType
      displayName = stored.bungieDisplayName
    }
    if (!membershipType) membershipType = 3

    const profile = (await getPlayerProfile(membershipType, membershipId, [100, 200], accessToken)) as ProfileShape
    const characterIds = Object.keys(profile.characters?.data ?? {})
    if (!characterIds.length) {
      return NextResponse.json({ error: 'Bungie did not share characters for that Guardian.' }, { status: 404 })
    }

    const activities = await collectRaidDungeonHistory({
      membershipType,
      membershipId,
      characterIds,
      pages,
      countPerPage: 25,
      accessToken,
    })
    const existing = await getRunRecordsByPgcrIds(activities.map((row) => row.instanceId))
    const runs = buildLookupRows({
      activities,
      existing,
      names: await activityNames(activities),
      membershipId,
      membershipType,
      displayName,
    })
    return NextResponse.json({ displayName, membershipId, membershipType, runs })
    } catch (error) {
      console.error('[destiny/runs/lookup]', error)
      return NextResponse.json({ error: 'Bungie did not return that history. Try again in a moment.' }, { status: 502 })
    }
  })
}

export async function POST(req: NextRequest) {
  return destinyAuthHandler(req, async () => {
    const body = (await req.json().catch(() => ({}))) as {
      membershipId?: string
      membershipType?: number
      displayName?: string
      runs?: { instanceId?: string; type?: ActivityType }[]
      instanceIds?: string[]
    }
    const requested = (body.runs ?? [])
      .filter((row) => row.instanceId && (row.type === 'raid' || row.type === 'dungeon'))
      .map((row) => ({ instanceId: String(row.instanceId), type: row.type as 'raid' | 'dungeon' }))
    const fromIds = (body.instanceIds ?? []).map((id) => ({ instanceId: String(id), type: 'raid' as const }))
    const runs = requested.length ? requested : fromIds
    if (!runs.length) return NextResponse.json({ error: 'Pick at least one run to score.' }, { status: 400 })

    const authUser = await verifyAuth(req)
    const viewer = await getDestinyUserBySiteUserId(authUser.username.toLowerCase())
    const membershipId = body.membershipId?.trim() || viewer?.bungieMembershipId || ''
    const registered = membershipId ? await getDestinyUserByBungieMembershipId(membershipId) : viewer
    const displayName = typeof body.displayName === 'string' ? body.displayName.trim() : ''
    const kickOwner =
      registered?.bungieMembershipId
        ? null
        : await resolveUnregisteredKickOwner({
            membershipId,
            displayName,
            membershipType: Number(body.membershipType) || viewer?.destinyMembershipType || 3,
          })
    const target = registered?.bungieMembershipId ? registered : kickOwner
    if (!target?.bungieMembershipId) {
      return NextResponse.json(
        { error: 'That Guardian is not on TopNest yet. They can sign in, then these clears can be scored.' },
        { status: 404 }
      )
    }

    try {
      const result = await scoreSelectedRuns(target, runs)
      if (result.synced > 0 || result.imported > 0) invalidateOverviewCache()
      return NextResponse.json({
        ok: true,
        synced: result.synced,
        imported: result.imported,
        flagged: result.flagged,
        skipped: result.skipped,
        newRuns: result.newRuns,
        message: `Added ${result.synced} run(s) to scoring${result.imported ? ` · ${result.imported} new` : ''}.`,
      })
    } catch (error) {
      console.error('[destiny/runs/lookup]', error)
      return NextResponse.json({ error: 'Could not add those runs. Try again in a moment.' }, { status: 502 })
    }
  })
}
