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

export function recentRunLines(
  runs: Array<ScoreRunRow & { teamMembers?: { membershipId?: string; displayName?: string }[] }>
): { id: string; line: string; teammates: { membershipId: string; displayName: string }[] }[] {
  return runs.slice(0, 8).map((run) => {
    const when = run.completedAt
      ? new Date(run.completedAt).toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles' })
      : ''
    const mates = run.teammateCount ?? run.teamMembers?.length ?? 0
    const bond = run.bondPoints ? ` · +${run.bondPoints} new teammates` : ''
    const seen = new Set<string>()
    const teammates: { membershipId: string; displayName: string }[] = []
    for (const member of run.teamMembers ?? []) {
      const membershipId = member.membershipId?.trim() ?? ''
      if (!/^\d{1,22}$/.test(membershipId) || seen.has(membershipId)) continue
      seen.add(membershipId)
      teammates.push({ membershipId, displayName: member.displayName || membershipId })
    }
    return {
      id: run.id,
      line: `${run.activityName}${when ? ` · ${when}` : ''} · ${mates} teammates · +${run.pointsAwarded ?? 0} pts${bond}`,
      teammates,
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
