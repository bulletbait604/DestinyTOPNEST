import type { Season, SeasonWinner } from '@/lib/destiny/types'
import { groupHallByBoard, hallRankReason, SEASON_HALL_BOARDS } from '@/lib/destiny/seasonHall'

function formatDay(iso: string): string {
  const parsed = Date.parse(iso)
  if (!Number.isFinite(parsed)) return ''
  return new Date(parsed).toLocaleDateString('en-US', {
    timeZone: 'America/Los_Angeles',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/** What the Hall is, who is on it, and why — grouped by prize board. */
export default function SeasonHall({
  season,
  winners,
}: {
  season: Pick<Season, 'name' | 'seasonNumber' | 'startDate' | 'endDate'>
  winners: SeasonWinner[]
}) {
  const grouped = groupHallByBoard(winners)
  const start = formatDay(season.startDate)
  const end = formatDay(season.endDate)
  const number = season.seasonNumber ? `Season ${season.seasonNumber}` : 'This season'

  return (
    <section className="gh-hall" aria-labelledby="season-hall-title">
      <p className="gh-kicker">
        {number}
        {start && end ? ` · ${start} – ${end} PT` : ''}
      </p>
      <h2 id="season-hall-title">Season Hall of Fame</h2>
      <p className="gh-lede">
        The top three Guardians on each prize board for {season.name}. A name is here because of verified clears
        this season, not lifetime stats. This is not the teachers list.
      </p>
      <p className="gh-muted">
        #1 on a board is the prize leader: a Destiny 2 3D print in the US and Canada, or a $50 CAD Steam gift card in
        the UK. Other countries can rank and be listed. #2 and #3 are listed for the season. The prize goes to #1
        after a 7-day check when the season ends.
      </p>
      <div className="gh-hall-boards">
        {SEASON_HALL_BOARDS.map((board) => {
          const rows = grouped[board.category]
          return (
            <article key={board.category} className="gh-hall-board">
              <h3>{board.label}</h3>
              <p className="gh-muted">{board.why}</p>
              {rows.length === 0 ? (
                <p className="gh-hall-empty">No verified clears on this board yet.</p>
              ) : (
                <ol className="gh-hall-list">
                  {rows.map((row) => (
                    <li key={`${row.category}-${row.rank}-${row.displayName}`}>
                      <p>
                        <span className="gh-hall-rank">#{row.rank}</span> {row.displayName}
                        {row.clanTag ? <span className="gh-muted"> [{row.clanTag}]</span> : null}
                      </p>
                      <p className="gh-muted">{hallRankReason(row.rank)}</p>
                    </li>
                  ))}
                </ol>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}
