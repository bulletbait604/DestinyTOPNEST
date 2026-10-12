import { NextRequest, NextResponse } from 'next/server'
import { renderClanCommand, renderLfgCommand, renderPassportCommand } from '@/discord/commands'
import { discordBotStatus } from '@/discord/config'
import { respondToDiscordInteraction } from '@/discord/interactions'
import { evaluatePassport } from '@/lib/destiny/passport'
import { getConfiguredActiveSeason } from '@/lib/destiny/seasonConfig'
import { evaluateSherpaRanks } from '@/lib/destiny/sherpaRanks'
import { evaluateClanWars } from '@/lib/destiny/clanWars'
import {
  getFireteamLobbies,
  getRunsForParticipant,
  listVerifiedFullClears,
  loadAllMvpVotes,
  loadUsersMap,
} from '@/lib/destiny/store'
import type { StoredDestinyUser } from '@/lib/destiny/destinyUserStore'
import type { RunRecord } from '@/lib/destiny/types'

export const dynamic = 'force-dynamic'

function unionRuns(groups: RunRecord[][]): RunRecord[] {
  const byId = new Map<string, RunRecord>()
  for (const group of groups) {
    for (const run of group) byId.set(run.id, run)
  }
  return Array.from(byId.values())
}

function membershipToUserId(users: Map<string, StoredDestinyUser>): Map<string, string> {
  const map = new Map<string, string>()
  for (const user of Array.from(users.values())) {
    if (user.bungieMembershipId && user.userId) map.set(user.bungieMembershipId, user.userId)
  }
  return map
}

function usersByName(users: Map<string, StoredDestinyUser>, name: string): StoredDestinyUser | undefined {
  const needle = name.trim().toLowerCase()
  return Array.from(users.values()).find((user) => user.bungieDisplayName?.toLowerCase() === needle)
}

export async function GET() {
  return NextResponse.json(discordBotStatus())
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const result = await respondToDiscordInteraction(
    rawBody,
    req.headers.get('x-signature-ed25519'),
    req.headers.get('x-signature-timestamp'),
    {
      passport: async (guardian) => {
        const users = await loadUsersMap()
        const match = guardian ? usersByName(users, guardian) : undefined
        if (!match?.bungieMembershipId) {
          return guardian
            ? `No linked Guardian named ${guardian}. Open https://topnest.app and sync Bungie.`
            : 'Use /passport guardian:<Bungie name> for a linked Top Nest player.'
        }
        const [participantRuns, clears, votes] = await Promise.all([
          getRunsForParticipant(match.userId, match.bungieMembershipId, 500),
          listVerifiedFullClears(2000),
          loadAllMvpVotes().catch(() => []),
        ])
        const runs = unionRuns([participantRuns, clears.runs])
        const viewer = {
          userId: match.userId,
          membershipId: match.bungieMembershipId,
          clanId: match.clanId,
          displayName: match.bungieDisplayName,
        }
        const passport = evaluatePassport(runs, viewer)
        const sherpa = evaluateSherpaRanks({
          runs,
          votes,
          membershipToUserId: membershipToUserId(users),
          season: seasonWindow(),
          viewerMembershipId: match.bungieMembershipId,
          historyComplete: clears.complete,
        })
        return renderPassportCommand({
          displayName: match.bungieDisplayName,
          passport,
          sherpa,
        })
      },
      clan: async (clan) => {
        const clears = await listVerifiedFullClears(2000)
        const board = evaluateClanWars({
          runs: clears.runs,
          season: seasonWindow(),
          historyComplete: clears.complete,
        })
        const needle = clan?.trim().toLowerCase()
        const standing = needle
          ? board.standings.find(
              (row) => row.clanName.toLowerCase() === needle || row.clanId.toLowerCase() === needle
            ) ?? null
          : board.standings[0] ?? null
        return renderClanCommand({
          clanName: clan,
          standing,
          weekLabel: board.weekLabel,
        })
      },
      lfg: async () => renderLfgCommand(await getFireteamLobbies()),
    }
  )
  return NextResponse.json(result.body, { status: result.status })
}

function seasonWindow() {
  const season = getConfiguredActiveSeason()
  return { startDate: season.startDate, endDate: season.endDate }
}
