import type { LeaderboardEntry } from '@/lib/destiny/types'

export interface BoardFilter {
  name?: string
  platform?: string
  activity?: string
}

/** Client-side filters for a leaderboard page. They do not change stored points. */
export function filterLeaderboardEntries(entries: LeaderboardEntry[], filter: BoardFilter): LeaderboardEntry[] {
  const name = filter.name?.trim().toLowerCase() ?? ''
  const platform = filter.platform?.trim().toLowerCase() ?? ''
  const activity = filter.activity?.trim().toLowerCase() ?? ''

  return entries.filter((entry) => {
    if (name && !entry.bungieDisplayName.toLowerCase().includes(name)) return false
    if (platform && platform !== 'all' && entry.platform !== platform) return false
    if (activity && !(entry.fastestActivityName ?? '').toLowerCase().includes(activity)) return false
    return true
  })
}
