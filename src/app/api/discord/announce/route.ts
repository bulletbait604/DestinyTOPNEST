import { NextRequest, NextResponse } from 'next/server'
import { postDiscordChannelMessage } from '@/discord/announce'
import { renderAnnouncement } from '@/discord/commands'
import { authorizeDiscordCron } from '@/discord/guard'
import { evaluateClanWars } from '@/lib/destiny/clanWars'
import { getConfiguredActiveSeason } from '@/lib/destiny/seasonConfig'
import { getFireteamLobbies, listVerifiedFullClears } from '@/lib/destiny/store'
import { DEFAULT_WEEKLY_CONTRACTS } from '@/lib/destiny/weeklyContractCatalog'
import { refreshLiveWeeklyRotationBounded } from '@/lib/destiny/bungieWeekly'
import { getWeeklyResetState } from '@/lib/destiny/weeklyRotation'

export const dynamic = 'force-dynamic'

/**
 * Optional announcement post. Idle when DISCORD_BOT_TOKEN is unset.
 * Once the token is set, callers must send Authorization: Bearer <CRON_SECRET>.
 */
export async function POST(req: NextRequest) {
  const gate = authorizeDiscordCron(req.headers.get('authorization'))
  if (!gate.ok) {
    return NextResponse.json(
      { ok: gate.status === 200, posted: false, error: gate.status === 401 ? gate.reason : undefined, reason: gate.reason },
      { status: gate.status }
    )
  }

  const now = new Date()
  await refreshLiveWeeklyRotationBounded(now)
  const week = getWeeklyResetState(now)
  let topClan = null
  let historyNote = ''
  try {
    const clears = await listVerifiedFullClears(2000)
    const season = getConfiguredActiveSeason()
    const board = evaluateClanWars({
      runs: clears.runs,
      season: { startDate: season.startDate, endDate: season.endDate },
      historyComplete: clears.complete,
    })
    topClan = board.standings[0] ?? null
    if (!clears.complete) historyNote = 'Clan standings use a capped clear history.'
  } catch (error) {
    console.warn('[discord] clan standings skipped', error)
  }

  let lfgLines: string[] = []
  try {
    const lobbies = await getFireteamLobbies()
    lfgLines = lobbies
      .filter((lobby) => lobby.status === 'open')
      .slice(0, 5)
      .map((lobby) => `${lobby.activityName} · ${lobby.hostDisplayName} · ${lobby.currentPlayers}/${lobby.maxPlayers}`)
  } catch (error) {
    console.warn('[discord] lfg skipped', error)
  }

  const content = renderAnnouncement({
    weekLabel: week.weekLabel,
    contractLines: DEFAULT_WEEKLY_CONTRACTS.map((contract) => `${contract.title} (+${contract.tierPoints} tier pts)`),
    lfgLines,
    topClan,
  })
  const result = await postDiscordChannelMessage(historyNote ? `${content}\n${historyNote}` : content)
  return NextResponse.json({ ok: true, ...result })
}
