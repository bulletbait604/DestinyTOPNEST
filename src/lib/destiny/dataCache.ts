/**
 * Shared Data Cache helpers for Vercel / Next.js `unstable_cache`.
 * Cuts Active CPU + Provisioned Memory by avoiding repeated Mongo/enrich work
 * across concurrent invocations of the same region.
 */

import { revalidateTag, unstable_cache } from 'next/cache'
import { enrichBuildsResponse, enrichLeaderboardEntries, buildWeeklyResetInfo } from '@/lib/destiny/enrich'
import { metaResearchSummary } from '@/lib/destiny/externalMetaResearch'
import { aggregateGuardianLeaderboard } from '@/lib/destiny/leaderboards'
import { COMMANDER_RANK_LIMIT } from '@/lib/destiny/mvpVoting'
import { getSeasonCountdown } from '@/lib/destiny/seasonConfig'
import { computeSeasonStandings } from '@/lib/destiny/seasonPrizes'
import {
  getBuildIntelligenceCards,
  getExternalBuildSources,
  getLeaderboardEntries,
  getMetaResearchMeta,
  getSeasonData,
  getSeasonStandingsInput,
  loadAllMvpVotes,
  loadUsersMap,
} from '@/lib/destiny/store'
import type { LeaderboardCategory, LeaderboardPeriod, Season } from '@/lib/destiny/types'

export const CACHE_TAGS = {
  overview: 'destiny-overview',
  leaderboards: 'destiny-leaderboards',
  builds: 'destiny-builds',
  season: 'destiny-season',
  mvp: 'destiny-mvp',
} as const

/** Invalidate shared destiny caches after mutations (sync, admin review, etc.). */
export function invalidateDestinySharedCaches(tags: Array<(typeof CACHE_TAGS)[keyof typeof CACHE_TAGS]> = [
  CACHE_TAGS.overview,
  CACHE_TAGS.leaderboards,
  CACHE_TAGS.builds,
  CACHE_TAGS.season,
  CACHE_TAGS.mvp,
]): void {
  for (const tag of tags) {
    revalidateTag(tag)
  }
}

export const getCachedLeaderboardPayload = unstable_cache(
  async (category: LeaderboardCategory, period: LeaderboardPeriod) => {
    const entries = await enrichLeaderboardEntries(await getLeaderboardEntries(category, period))
    return { entries, category, period }
  },
  ['destiny-leaderboard'],
  { revalidate: 45, tags: [CACHE_TAGS.leaderboards] }
)

export const getCachedBuildsPayload = unstable_cache(
  async (activity: string) => {
    const [verifiedBuilds, externalBuilds] = await Promise.all([
      getBuildIntelligenceCards(),
      getExternalBuildSources(),
    ])

    const filteredVerified = activity
      ? verifiedBuilds.filter((b) => b.activityName.toLowerCase().includes(activity.toLowerCase()))
      : verifiedBuilds

    const filteredExternal = activity
      ? externalBuilds.filter(
          (b) =>
            b.activityFocus?.toLowerCase().includes(activity.toLowerCase()) ||
            b.title.toLowerCase().includes(activity.toLowerCase())
        )
      : externalBuilds

    const aiSummary =
      filteredVerified.length > 0
        ? `Showing ${filteredVerified.length} verified build(s) from Top Nest PGCR data.`
        : 'No verified PGCR builds yet — sync runs from Home after linking Bungie.'

    const researchSummary = metaResearchSummary(filteredExternal)
    const meta = await getMetaResearchMeta()
    const weeklyLine = meta.weeklySync.syncedAt
      ? `Checked with the ${meta.weekLabel} weekly reset${
          meta.weeklySync.featuredActivities.length
            ? ` (${meta.weeklySync.featuredActivities.join(', ')})`
            : ''
        } on ${new Date(meta.weeklySync.syncedAt).toLocaleDateString()}.`
      : `Weekly check for ${meta.weekLabel} runs on first load after reset.`

    return {
      ...(await enrichBuildsResponse({
        verifiedBuilds: filteredVerified,
        externalBuilds: filteredExternal,
        aiSummary,
        metaResearchSummary: [researchSummary, weeklyLine].filter(Boolean).join(' '),
        activity: activity || 'all',
      })),
      metaResearch: meta,
    }
  },
  ['destiny-builds'],
  { revalidate: 120, tags: [CACHE_TAGS.builds] }
)

export interface CachedSeasonShared {
  season: Season
  countdown: ReturnType<typeof getSeasonCountdown>
  weeklyReset: Awaited<ReturnType<typeof buildWeeklyResetInfo>>
  eligibility: Awaited<ReturnType<typeof computeSeasonStandings>>['eligibility']
  hallOfFame: Awaited<ReturnType<typeof computeSeasonStandings>>['hallOfFame']
  seasonEnded: boolean
}

export const getCachedSeasonShared = unstable_cache(
  async (): Promise<CachedSeasonShared> => {
    const season = await getSeasonData()
    const weeklyReset = await buildWeeklyResetInfo()
    const { runs, usersById, votes } = await getSeasonStandingsInput()
    const { hallOfFame, eligibility } = await computeSeasonStandings(runs, usersById, season, votes)
    const seasonEnded =
      season.status === 'archived' || Date.now() >= new Date(season.endDate).getTime()

    return {
      season,
      countdown: getSeasonCountdown(season),
      weeklyReset,
      eligibility,
      hallOfFame,
      seasonEnded,
    }
  },
  ['destiny-season-shared'],
  { revalidate: 90, tags: [CACHE_TAGS.season] }
)

export const getCachedMvpBoard = unstable_cache(
  async (period: 'season' | 'monthly') => {
    const [season, usersById, votes] = await Promise.all([
      getSeasonData(),
      loadUsersMap(),
      loadAllMvpVotes(),
    ])
    const leaders = aggregateGuardianLeaderboard(votes, usersById, period, season, 10)
    const commanders = leaders.filter((entry) => entry.rank <= COMMANDER_RANK_LIMIT)
    return { leaders, commanders, period }
  },
  ['destiny-mvp-board'],
  { revalidate: 45, tags: [CACHE_TAGS.mvp] }
)
