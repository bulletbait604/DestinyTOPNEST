import type { ClanWarStanding, FireteamLobby, PassportProfile, SherpaBoard, WeeklyContractsSnapshot } from '@/lib/destiny/types'
import { formatStampPoints } from '@/lib/destiny/passport'

const MAX_DISCORD_LENGTH = 1800

function clip(text: string): string {
  if (text.length <= MAX_DISCORD_LENGTH) return text
  return `${text.slice(0, MAX_DISCORD_LENGTH - 1)}…`
}

export function renderPassportCommand(input: {
  displayName: string
  passport?: PassportProfile | null
  sherpa?: SherpaBoard | null
  contracts?: WeeklyContractsSnapshot | null
}): string {
  if (!input.passport) {
    return `${input.displayName} has no Fireteam Passport yet. Link Bungie on https://topnest.app and sync a verified full clear.`
  }
  const lines = [
    `**${input.displayName}** — ${input.passport.displayTitle}`,
    `Stamps ${formatStampPoints(input.passport.totalStamps)} · ${input.passport.distinctTeammates} teammates · ${input.passport.activities.length} activities`,
  ]
  if (input.sherpa) {
    lines.push(
      `Sherpa: ${input.sherpa.title} · ${input.sherpa.guidedClears} guided clears · ${input.sherpa.learnerMvps} learner MVPs`
    )
  }
  if (input.contracts) {
    const done = input.contracts.contracts.filter((contract) => contract.completed).length
    lines.push(
      `Season tier ${input.contracts.seasonTier.tier} (${input.contracts.seasonTier.title}) · ${done}/${input.contracts.contracts.length} contracts this week`
    )
  }
  lines.push('Badges, titles, and frames only — no cash prizes.')
  return clip(lines.join('\n'))
}

export function renderClanCommand(input: { clanName?: string; standing: ClanWarStanding | null; weekLabel: string }): string {
  if (!input.standing) {
    return `${input.clanName ?? 'That clan'} has no verified clanmate clears on the Clan Wars board yet.`
  }
  const row = input.standing
  return clip(
    [
      `**${row.clanName}** · ${row.division} division · season rank #${row.rank}`,
      `${row.seasonPoints} season pts · ${row.weeklyPoints} this week (${input.weekLabel})`,
      `${row.verifiedClears} clanmate clears · ${row.recruitBonuses} recruit bonuses`,
      'Standings are titles and divisions, not prizes.',
    ].join('\n')
  )
}

export function renderLfgCommand(lobbies: FireteamLobby[]): string {
  const open = lobbies.filter((lobby) => lobby.status === 'open' || lobby.status === 'in_progress').slice(0, 8)
  if (!open.length) return 'No open fireteams on Top Nest right now. Post one at https://topnest.app'
  const lines = ['**Looking for fireteam**']
  for (const lobby of open) {
    lines.push(
      `• ${lobby.activityName} · ${lobby.hostDisplayName} · ${lobby.currentPlayers}/${lobby.maxPlayers} · ${lobby.goal.replace(/_/g, ' ')}`
    )
  }
  lines.push('Join at https://topnest.app')
  return clip(lines.join('\n'))
}

export function renderAnnouncement(input: {
  weekLabel: string
  contractLines: string[]
  lfgLines: string[]
  topClan?: ClanWarStanding | null
}): string {
  const lines = [`**Fireteam HQ** · ${input.weekLabel}`]
  if (input.contractLines.length) {
    lines.push('Weekly contracts:')
    for (const line of input.contractLines) lines.push(`• ${line}`)
  }
  if (input.topClan) {
    lines.push(
      `Clan Wars: #${input.topClan.rank} ${input.topClan.clanName} (${input.topClan.division}, ${input.topClan.seasonPoints} pts)`
    )
  }
  if (input.lfgLines.length) {
    lines.push('Open fireteams:')
    for (const line of input.lfgLines) lines.push(`• ${line}`)
  } else {
    lines.push('No open fireteams posted.')
  }
  lines.push('Rewards are badges, titles, frames, and tiers.')
  return clip(lines.join('\n'))
}
