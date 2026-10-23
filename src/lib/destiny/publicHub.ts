import { evaluateClanWars } from '@/lib/destiny/clanWars'
import type { StoredDestinyUser } from '@/lib/destiny/destinyUserStore'
import { aggregateLeaderboard } from '@/lib/destiny/leaderboards'
import { listOpenLobbies } from '@/lib/destiny/fireteamLobbyService'
import { evaluateNightOps } from '@/lib/destiny/nightOps'
import { evaluateSherpaRanks } from '@/lib/destiny/sherpaRanks'
import { getConfiguredActiveSeason } from '@/lib/destiny/seasonConfig'
import { listFeaturedCommunityBuilds } from '@/lib/destiny/communityBuildStore'
import { featuredBuildRecords } from '@/lib/destiny/featuredBuilds'
import { ensureFeaturedBuildsSeed } from '@/lib/destiny/featuredBuildSeed'
import { listVerifiedFullClears } from '@/lib/destiny/store'
import type { FireteamLobby, NightOpsEvent, RunRecord, WeeklyContractDefinition } from '@/lib/destiny/types'
import { resolveWeeklyContractCatalog } from '@/lib/destiny/weeklyContractCatalog'
import { loadNightOpsEvents, loadWeeklyGoals } from '@/lib/destiny/siteContent'
import { refreshLiveWeeklyRotationBounded } from '@/lib/destiny/bungieWeekly'
import { getWeeklyResetState } from '@/lib/destiny/weeklyRotation'
import { loadKickGuardianMembershipIds } from '@/lib/destiny/kickGuardians'

export interface PublicContractCard {
  id: string
  title: string
  description: string
  tierPoints: number
}

export interface PublicSherpaRow {
  rank: number
  displayName: string
  title: string
  points: number
  guidedClears: number
  learnerMvps: number
}

export interface PublicClanRow {
  rank: number
  clanName: string
  division: string
  seasonPoints: number
  weeklyPoints: number
  recruitBonuses: number
}

export interface PublicEventCard {
  id: string
  title: string
  hostName: string
  startsAt: string
  endsAt: string
  status: 'upcoming' | 'live' | 'ended'
  activityName?: string
  twitchUrl?: string
  kickUrl?: string
}

export interface PublicFireteamCard {
  id: string
  activityName: string
  hostDisplayName: string
  currentPlayers: number
  maxPlayers: number
  goal: string
  status: string
}

export interface PublicScoringNote {
  title: string
  body: string
}

export interface PublicTopGuardian {
  board: 'raid' | 'dungeon' | 'new_bonds'
  boardLabel: string
  displayName: string
  points: number
  rank: number
  bungieMembershipId?: string
  mvpVotes?: number
}

export interface PublicFeaturedBuild {
  id: string
  name: string
  characterClass: string
  subclass: string
  activity: string
  likes: number
  ownerDisplayName: string
  listing?: 'featured' | 'player'
  creditName?: string
  creditUrl?: string
}

export interface PublicHubSnapshot {
  weekLabel: string
  resetsInLabel: string
  featuredDungeons: string[]
  featuredRaids: string[]
  pantheon?: string
  nightfall?: string
  contracts: PublicContractCard[]
  sherpas: PublicSherpaRow[]
  clans: PublicClanRow[]
  events: PublicEventCard[]
  fireteams: PublicFireteamCard[]
  scoring: PublicScoringNote[]
  historyComplete: boolean
  topGuardians: PublicTopGuardian[]
  featuredBuilds: PublicFeaturedBuild[]
}

/** Plain-language rules. These do not award points; the evaluators do. */
export const HUB_SCORING: PublicScoringNote[] = [
  {
    title: 'Leaderboard points',
    body: 'A verified full clear from the start scores 10 (raid) or 6 (dungeon). Every fireteam member you have never cleared with adds a New Bonds bonus: 15 on a raid, 10 on a dungeon. Your 2nd and 3rd clears with someone add 4 each. Up to 6 new bonds score per 24 hours, and a teammate must finish and play at least half the run. A checkpoint clear scores only if a moderator approves it.',
  },
  {
    title: 'Passport stamps',
    body: 'Each verified full clear is one stamp. A teammate you have never cleared with adds another full stamp. Someone you have cleared with before adds a quarter stamp.',
  },
  {
    title: 'Weekly contracts',
    body: 'Contracts reset every Tuesday at 17:00 UTC. Finishing one adds season tier points for a title and a profile frame. Those points do not change the leaderboard.',
  },
  {
    title: 'Sherpa ranks',
    body: 'You get a sherpa point when you guide someone through their first verified clear of an activity you have already cleared. If they vote you MVP, you get one more point. The vote is stored on your Bungie membership, so it still counts if you join Top Nest later.',
  },
  {
    title: 'Clan Wars',
    body: 'A clan scores when two or more tagged clanmates finish a verified clear together. Helping a clanmate on their first clear of that activity adds a recruit bonus. Divisions are Ember, Ash, Iron, and Steel.',
  },
  {
    title: 'Night Ops',
    body: 'Community sessions can include a Kick or Twitch link. You earn the event badge when a verified clear finishes during the scheduled window.',
  },
]

const PUBLIC_VIEWER = { membershipId: 'public-hub', displayName: 'Guest' }

function publicFireteams(lobbies: FireteamLobby[]): PublicFireteamCard[] {
  return lobbies
    .filter((lobby) => lobby.status === 'open' || lobby.status === 'in_progress' || lobby.status === 'full')
    .slice(0, 8)
    .map((lobby) => ({
      id: lobby.id,
      activityName: lobby.activityName,
      hostDisplayName: lobby.hostDisplayName,
      currentPlayers: lobby.currentPlayers,
      maxPlayers: lobby.maxPlayers,
      goal: lobby.goal.replace(/_/g, ' '),
      status: lobby.status,
    }))
}

const BOARD_LABEL = {
  raid: 'Raid',
  dungeon: 'Dungeon',
  new_bonds: 'New Teammates',
} as const

/** Season leaders for the homepage. Names come from verified clears, not private profiles. */
export function topGuardiansFromRuns(
  runs: RunRecord[],
  now: Date,
  kickMembershipIds?: ReadonlySet<string>
): PublicTopGuardian[] {
  const season = getConfiguredActiveSeason(now)
  const users = new Map<string, StoredDestinyUser>()
  const rows: PublicTopGuardian[] = []
  for (const board of ['raid', 'dungeon', 'new_bonds'] as const) {
    const entries = aggregateLeaderboard(runs, users, board, 'season', season, kickMembershipIds).slice(0, 3)
    for (const entry of entries) {
      rows.push({
        board,
        boardLabel: BOARD_LABEL[board],
        displayName: entry.bungieDisplayName,
        points: entry.points,
        rank: entry.rank,
        bungieMembershipId: entry.bungieMembershipId,
        mvpVotes: entry.mvpVotes,
      })
    }
  }
  return rows
}

/** Build the logged-out boards from stored clears. No Bungie calls and no private profiles. */
export function assemblePublicHub(input: {
  now?: Date
  runs?: RunRecord[]
  lobbies?: FireteamLobby[]
  events?: NightOpsEvent[]
  contracts?: WeeklyContractDefinition[]
  historyComplete?: boolean
  featuredBuilds?: PublicFeaturedBuild[]
  kickMembershipIds?: ReadonlySet<string>
}): PublicHubSnapshot {
  const now = input.now ?? new Date()
  const runs = input.runs ?? []
  const week = getWeeklyResetState(now)
  const season = getConfiguredActiveSeason(now)
  const seasonWindow = { startDate: season.startDate, endDate: season.endDate }
  const sherpa = evaluateSherpaRanks({
    runs,
    season: seasonWindow,
    historyComplete: input.historyComplete !== false,
  })
  const clans = evaluateClanWars({
    runs,
    season: seasonWindow,
    now,
    historyComplete: input.historyComplete !== false,
  })
  const nightOps = evaluateNightOps({
    runs: [],
    viewer: PUBLIC_VIEWER,
    now,
    events: input.events,
  })

  return {
    weekLabel: week.weekLabel,
    resetsInLabel: week.resetsInLabel,
    featuredDungeons: week.featuredDungeons.map((activity) => activity.name),
    featuredRaids: week.featuredRaids.map((activity) => activity.name),
    pantheon: week.pantheon,
    nightfall: week.nightfall,
    contracts: resolveWeeklyContractCatalog(input.contracts).map((contract) => ({
      id: contract.id,
      title: contract.title,
      description: contract.description,
      tierPoints: contract.tierPoints,
    })),
    sherpas: sherpa.hallOfFame.slice(0, 8).map((row) => ({
      rank: row.rank,
      displayName: row.displayName,
      title: row.title,
      points: row.points,
      guidedClears: row.guidedClears,
      learnerMvps: row.learnerMvps,
    })),
    clans: clans.standings.slice(0, 8).map((row) => ({
      rank: row.rank,
      clanName: row.clanName,
      division: row.division,
      seasonPoints: row.seasonPoints,
      weeklyPoints: row.weeklyPoints,
      recruitBonuses: row.recruitBonuses,
    })),
    events: nightOps.events.map((card) => ({
      id: card.event.id,
      title: card.event.title,
      hostName: card.event.hostName,
      startsAt: card.event.startsAt,
      endsAt: card.event.endsAt,
      status: card.status,
      activityName: card.event.activityName,
      twitchUrl: card.event.twitchUrl,
      kickUrl: card.event.kickUrl,
    })),
    fireteams: publicFireteams(input.lobbies ?? []),
    scoring: HUB_SCORING,
    historyComplete: input.historyComplete !== false,
    topGuardians: topGuardiansFromRuns(runs, now, input.kickMembershipIds),
    featuredBuilds: input.featuredBuilds ?? [],
  }
}

function toPublicFeatured(build: {
  id: string
  name: string
  characterClass: string
  subclass: string
  activityTags?: string[]
  upvoteCount?: number
  ownerDisplayName: string
  listing?: 'featured' | 'player'
  creditName?: string
  creditUrl?: string
}): PublicFeaturedBuild {
  return {
    id: build.id,
    name: build.name,
    characterClass: build.characterClass,
    subclass: build.subclass,
    activity: build.activityTags?.[0] ?? 'general',
    likes: build.upvoteCount ?? 0,
    ownerDisplayName: build.ownerDisplayName,
    listing: build.listing === 'featured' ? 'featured' : 'player',
    creditName: build.creditName,
    creditUrl: build.creditUrl,
  }
}

async function loadFeaturedBuilds(): Promise<PublicFeaturedBuild[]> {
  try {
    await ensureFeaturedBuildsSeed()
    const rows = await listFeaturedCommunityBuilds({ sort: 'top', limit: 12, offset: 0, scope: 'public' })
    if (rows.length) return previewByClass(rows).map((build) => toPublicFeatured(build))
  } catch (error) {
    console.warn('[hub] featured builds unavailable', error)
  }
  return previewByClass(featuredBuildRecords()).map((build) => toPublicFeatured(build))
}

function previewByClass<T extends { characterClass: string }>(rows: T[]): T[] {
  const picked: T[] = []
  for (const characterClass of ['hunter', 'titan', 'warlock']) {
    picked.push(...rows.filter((row) => row.characterClass === characterClass).slice(0, 2))
  }
  return picked.length ? picked : rows.slice(0, 6)
}

export async function loadPublicHubSnapshot(now = new Date()): Promise<PublicHubSnapshot> {
  await refreshLiveWeeklyRotationBounded(now)
  const [events, contracts, kickMembershipIds] = await Promise.all([
    loadNightOpsEvents().catch(() => []),
    loadWeeklyGoals().catch(() => undefined),
    loadKickGuardianMembershipIds(),
  ])
  try {
    const [clears, lobbies, featuredBuilds] = await Promise.all([
      listVerifiedFullClears(2000),
      listOpenLobbies(),
      loadFeaturedBuilds(),
    ])
    return assemblePublicHub({
      now,
      runs: clears.runs,
      lobbies,
      events,
      contracts,
      historyComplete: clears.complete,
      featuredBuilds,
      kickMembershipIds,
    })
  } catch (error) {
    console.warn('[hub] public snapshot fell back to the contract catalog', error)
    return assemblePublicHub({
      now,
      runs: [],
      lobbies: [],
      events,
      contracts,
      historyComplete: false,
      featuredBuilds: previewByClass(featuredBuildRecords()).map((build) => toPublicFeatured(build)),
    })
  }
}
