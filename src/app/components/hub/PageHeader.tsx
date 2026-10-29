'use client'

import { useId, type ReactNode } from 'react'
import { BOND_RULES } from '@/lib/destiny/bonds'
import { getConfiguredActiveSeason } from '@/lib/destiny/seasonConfig'

export const BOARD_POINTS_HINT = `A verified raid clear from the start is ${BOND_RULES.basePoints.raid} points. A dungeon clear is ${BOND_RULES.basePoints.dungeon}. A first clear with a new teammate adds ${BOND_RULES.newBondPoints.raid} on a raid or ${BOND_RULES.newBondPoints.dungeon} on a dungeon. Contracts add tier points for a title and frame, and those do not change the boards.`

export function PageHeader({
  title,
  subtitle,
  kicker,
  titleId,
  extra,
}: {
  title: string
  subtitle?: string
  kicker?: string
  titleId?: string
  extra?: ReactNode
}) {
  return (
    <header className="gh-page-head">
      <div>
        <h1 id={titleId}>{title}</h1>
        {subtitle ? (
          <details className="gh-disclosure ios-detail">
            <summary>Details</summary>
            <p className="gh-lede">{subtitle}</p>
          </details>
        ) : null}
        {kicker ? <p className="gh-sr">{kicker}</p> : null}
      </div>
      {extra}
    </header>
  )
}

export function PointsChip({
  label,
  value,
  hint,
}: {
  label: string
  value: string | number
  hint: string
}) {
  const tipId = useId()
  return (
    <span className="gh-points-chip">
      <span className="gh-points-chip-label">{label}</span>
      <strong>{value}</strong>
      <button
        type="button"
        className="gh-points-chip-info"
        aria-label={`How ${label} points are earned`}
        aria-describedby={tipId}
      >
        i
      </button>
      <span id={tipId} role="tooltip" className="gh-points-tip">
        {hint}
      </span>
    </span>
  )
}

/** One season label, one score, and a short explanation of how that score is earned. */
export function SeasonPointsBar() {
  const season = getConfiguredActiveSeason()
  return (
    <div className="gh-points-bar" aria-label="Season points">
      <span className="gh-kicker">How scoring works</span>
      <span className="gh-kicker">Season {season.seasonNumber}</span>
      <PointsChip label="Raid clear" value={BOND_RULES.basePoints.raid} hint={BOARD_POINTS_HINT} />
    </div>
  )
}
