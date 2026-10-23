export type ScoreStanding = {
  category: string
  rank: number
  points: number
}

export type ScoreRunRow = {
  id: string
  activityName: string
  pointsAwarded?: number
  bondPoints?: number
  teammateCount?: number
  completedAt: string
}

const BOARD_LABEL: Record<string, string> = {
  raid: 'Raid',
  dungeon: 'Dungeon',
  new_bonds: 'New Teammates',
}

const BOARDS = ['raid', 'dungeon', 'new_bonds'] as const

export function scoreBoardLines(entries: ScoreStanding[]): string[] {
  return BOARDS.map((id) => {
    const row = entries.find((entry) => entry.category === id)
    const label = BOARD_LABEL[id]
    if (!row) return `${label} board: not ranked yet`
    return `${label} board: #${row.rank} · ${row.points} pts`
  })
}

export function recentRunLines(runs: ScoreRunRow[]): { id: string; line: string }[] {
  return runs.slice(0, 8).map((run) => {
    const when = run.completedAt
      ? new Date(run.completedAt).toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles' })
      : ''
    const mates = run.teammateCount ?? 0
    const bond = run.bondPoints ? ` · +${run.bondPoints} new teammates` : ''
    return {
      id: run.id,
      line: `${run.activityName}${when ? ` · ${when}` : ''} · ${mates} teammates · +${run.pointsAwarded ?? 0} pts${bond}`,
    }
  })
}

export function scorePointsLine(input: {
  raidPoints?: number
  dungeonPoints?: number
  verifiedClears?: number
}): string {
  return `Raid ${input.raidPoints ?? 0} pts · Dungeon ${input.dungeonPoints ?? 0} pts · ${input.verifiedClears ?? 0} verified clears`
}
