import { getConfiguredActiveSeason, seasonBannerLabel, SEASON_TIME_ZONE } from '@/lib/destiny/seasonConfig'

/** Static scoring and eligibility copy for the Leaderboards rules panel. */
export const LEADERBOARD_RULES_SUMMARY = (): string => {
  const season = getConfiguredActiveSeason()
  const when = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { timeZone: SEASON_TIME_ZONE, month: 'short', day: 'numeric', year: 'numeric' })
  return `${seasonBannerLabel()}. ${season.name} is ${when(season.startDate)} – ${when(season.endDate)} Pacific. Seasons last 3 months after Season 1 restarts on Jan 1. #1 on the Raid, Dungeon and New Bonds boards each win a Destiny 2 3D print (USA/Canada, shipping covered) or a $50 CAD Steam gift card (UK). Other countries are not prize-eligible.`
}

export const LEADERBOARD_RULES_BULLETS = [
  'Points only for verified full completions',
  'Base: 3 pts per raid clear · 1 pt per dungeon clear · +2 pts for each MVP vote on the raid and dungeon boards',
  'New Bonds: +15 (raid) / +10 (dungeon) for each fireteam member you have never cleared with — no cap on strangers',
  'Growing bonds: +4 for your 2nd and 3rd clear with the same Guardian, then bonus stops',
  'Anti-farm: max 6 new bonds scored per 24h; teammates must complete and play ≥50% of the run; very short clears earn no bond bonus; alt-account rings are disqualified',
  'Checkpoint runs tracked but not scored unless admin approved',
  'Weekly contracts earn season tier points (titles, frames, badges) and do not change leaderboard scores',
  'Suspicious runs blocked until review (score 70+)',
] as const

export const LEADERBOARD_RULES_APPEALS_EMAIL = 'bulletbait604@gmail.com'

export const LEADERBOARD_RULES_POLICY =
  'Cheating the system or abuse of this by purposely circumventing the rules may result in disqualification and/or permanent bans at our administration\'s discretion. Appeals can be made to'
