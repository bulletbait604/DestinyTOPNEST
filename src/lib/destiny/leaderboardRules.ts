import { getConfiguredActiveSeason } from '@/lib/destiny/seasonConfig'

/** Static scoring and eligibility copy for the Leaderboards rules panel. */
export const LEADERBOARD_RULES_SUMMARY = (): string => {
  const season = getConfiguredActiveSeason()
  const endLabel = new Date(season.endDate).toLocaleDateString()
  return `${season.name} ends ${endLabel}. Pantheon squads score per boss encounter (raid-equivalent points). Top 3 monthly Commanders are crowned from MVP votes — vote in Previous Activities.`
}

export const LEADERBOARD_RULES_BULLETS = [
  'Points only for verified full completions',
  '2 pts per clan member · 5 pts per Random Fireteam Member (found through site fireteam finder) (raid max 2, dungeon max 1)',
  'Pantheon squads: each boss encounter counts as one raid worth of points for the fireteam',
  'MVP votes: pick one MVP per verified run in Previous Activities (Top Guardians ranked by MVP crowns)',
  'Checkpoint runs tracked but not scored unless admin approved',
  'Suspicious runs blocked until review (score 70+)',
] as const

export const LEADERBOARD_RULES_APPEALS_EMAIL = 'bulletbait604@gmail.com'

export const LEADERBOARD_RULES_POLICY =
  'Cheating the system or abuse of this by purposely circumventing the rules may result in disqualification and/or permanent bans at our administration\'s discretion. Appeals can be made to'
