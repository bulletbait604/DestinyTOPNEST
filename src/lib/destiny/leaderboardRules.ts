import { getConfiguredActiveSeason } from '@/lib/destiny/seasonConfig'

/** Static scoring and eligibility copy for the Leaderboards rules panel. */
export const LEADERBOARD_RULES_SUMMARY = (): string => {
  const season = getConfiguredActiveSeason()
  const endLabel = new Date(season.endDate).toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles' })
  return `${season.name} runs ${new Date(season.startDate).toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles' })} – ${endLabel} PT (seasons are 3 months). #1 on the Raid, Dungeon and New Bonds boards each win a Destiny 2 3D print (USA/Canada, shipping covered) or a $50 CAD Steam gift card (UK). Other countries are not prize-eligible.`
}

export const LEADERBOARD_RULES_BULLETS = [
  'Points only for verified full completions',
  'Base: 10 pts per raid clear · 6 pts per dungeon clear',
  'New Bonds: +15 (raid) / +10 (dungeon) for each fireteam member you have never cleared with — no cap on strangers',
  'Growing bonds: +4 for your 2nd and 3rd clear with the same Guardian, then bonus stops',
  'Anti-farm: max 6 new bonds scored per 24h; teammates must complete and play ≥50% of the run; very short clears earn no bond bonus; alt-account rings are disqualified',
  'Pantheon squads: each boss encounter counts as one raid worth of points for the fireteam',
  'MVP votes: pick one MVP per verified run in Previous Activities (Top Guardians ranked by MVP crowns)',
  'Checkpoint runs tracked but not scored unless admin approved',
  'Weekly contracts earn season tier points (titles, frames, badges) and do not change leaderboard scores',
  'Suspicious runs blocked until review (score 70+)',
] as const

export const LEADERBOARD_RULES_APPEALS_EMAIL = 'bulletbait604@gmail.com'

export const LEADERBOARD_RULES_POLICY =
  'Cheating the system or abuse of this by purposely circumventing the rules may result in disqualification and/or permanent bans at our administration\'s discretion. Appeals can be made to'
