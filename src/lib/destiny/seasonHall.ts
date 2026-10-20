import type { LeaderboardCategory, SeasonWinner } from '@/lib/destiny/types'

export const SEASON_HALL_BOARDS: {
  category: LeaderboardCategory
  label: string
  why: string
}[] = [
  {
    category: 'raid',
    label: 'Raid board',
    why: 'Points from verified raid clears this season, including bonuses for new teammates.',
  },
  {
    category: 'dungeon',
    label: 'Dungeon board',
    why: 'Points from verified dungeon clears this season, including bonuses for new teammates.',
  },
  {
    category: 'new_bonds',
    label: 'New friends board',
    why: 'New Bonds points only: extra points for clearing with Guardians you had not played with before.',
  },
]

export function hallBoardLabel(category: string): string {
  return SEASON_HALL_BOARDS.find((board) => board.category === category)?.label ?? 'Season board'
}

/** Why this person is on the Hall. Rank 1 is the prize leader. Ranks 2 and 3 are listed, not paid. */
export function hallRankReason(rank: number): string {
  if (rank === 1) {
    return 'Prize leader on this board. Still #1 when the season ends and they win the season prize.'
  }
  if (rank === 2 || rank === 3) {
    return `Listed because they are #${rank} right now. The prize for this board goes to #1.`
  }
  return 'Listed from this season’s verified clears.'
}

export function groupHallByBoard(winners: SeasonWinner[]): Record<LeaderboardCategory, SeasonWinner[]> {
  const grouped: Record<LeaderboardCategory, SeasonWinner[]> = {
    raid: [],
    dungeon: [],
    new_bonds: [],
  }
  for (const winner of winners) {
    if (winner.category !== 'raid' && winner.category !== 'dungeon' && winner.category !== 'new_bonds') continue
    grouped[winner.category].push(winner)
  }
  for (const board of SEASON_HALL_BOARDS) {
    grouped[board.category].sort((a, b) => a.rank - b.rank)
  }
  return grouped
}
