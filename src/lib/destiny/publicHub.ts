import { evaluateClanWars } from '@/lib/destiny/clanWars'
import { listOpenLobbies } from '@/lib/destiny/fireteamLobbyService'
import { evaluateNightOps, resolveNightOpsCatalog } from '@/lib/destiny/nightOps'
import { evaluateSherpaRanks } from '@/lib/destiny/sherpaRanks'
import { getConfiguredActiveSeason } from '@/lib/destiny/seasonConfig'
import { listVerifiedFullClears } from '@/lib/destiny/store'
import type { FireteamLobby, NightOpsEvent, RunRecord } from '@/lib/destiny/types'
import { resolveWeeklyContractCatalog } from '@/lib/destiny/weeklyContractCatalog'
import { refreshLiveWeeklyRotationBounded } from '@/lib/destiny/bungieWeekly'
import { getWeeklyResetState } from '@/lib/destiny/weeklyRotation'

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
    body: 'You get a sherpa point when you guide someone through their first verified clear of an activity you have already cleared. If they vote you MVP, you get one more point.',
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

/** Build the logged-out boards from stored clears. No Bungie calls and no private profiles. */
export function assemblePublicHub(input: {
  now?: Date
  runs?: RunRecord[]
  lobbies?: FireteamLobby[]
  events?: NightOpsEvent[]
  historyComplete?: boolean
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
    events: input.events ?? resolveNightOpsCatalog(),
  })

  return {
    weekLabel: week.weekLabel,
    resetsInLabel: week.resetsInLabel,
    featuredDungeons: week.featuredDungeons.map((activity) => activity.name),
    featuredRaids: week.featuredRaids.map((activity) => activity.name),
    pantheon: week.pantheon,
    nightfall: week.nightfall,
    contracts: resolveWeeklyContractCatalog().map((contract) => ({
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
  }
}

export async function loadPublicHubSnapshot(now = new Date()): Promise<PublicHubSnapshot> {
  await refreshLiveWeeklyRotationBounded(now)
  try {
    const [clears, lobbies] = await Promise.all([listVerifiedFullClears(2000), listOpenLobbies()])
    return assemblePublicHub({
      now,
      runs: clears.runs,
      lobbies,
      historyComplete: clears.complete,
    })
  } catch (error) {
    console.warn('[hub] public snapshot fell back to the contract catalog', error)
    return assemblePublicHub({ now, runs: [], lobbies: [], historyComplete: false })
  }
}
