import {
  formatPlayed,
  SLOT_LABELS,
  type GuardianDossier,
  type TrendPoint,
} from '@/lib/destiny/characterSnapshot'
import { classLabel } from '@/lib/destiny/guardianDirectory'

const FALLBACK_BANNER = 'https://www.bungie.net/img/destiny_content/pgcr/raid_kings_fall.jpg'

function barPercent(value: number, max: number): number {
  if (max <= 0) return 0
  return Math.max(8, Math.round((value / max) * 100))
}

function trendHeight(point: TrendPoint, min: number, max: number): number {
  if (max <= min) return 70
  return 28 + ((point.light - min) / (max - min)) * 72
}

export default function CharacterDossier({
  displayName,
  meta,
  status,
  dossier,
}: {
  displayName: string
  meta: string
  status: string
  dossier?: GuardianDossier
}) {
  const banner = dossier?.characters.find((character) => character.emblemBackgroundUrl)?.emblemBackgroundUrl || FALLBACK_BANNER
  const maxClears = Math.max(0, ...(dossier?.activityClears.map((row) => row.clears) ?? [0]))
  const maxKills = Math.max(0, ...(dossier?.weaponKills.map((row) => row.kills) ?? [0]))
  const trend = dossier?.trend ?? []
  const lights = trend.map((point) => point.light)
  const minLight = lights.length ? Math.min(...lights) : 0
  const maxLight = lights.length ? Math.max(...lights) : 0
  const first = trend[0]
  const last = trend[trend.length - 1]

  return (
    <div className="gh-dossier">
      <header
        className="gh-emblem-banner"
        style={{ ['--banner-url' as string]: `url("${banner}")` }}
      >
        <p className="gh-kicker">{status}</p>
        <h1 id="gh-profile-title">{displayName}</h1>
        {meta ? <p className="gh-banner-meta">{meta}</p> : null}
        {dossier ? (
          <p className="gh-banner-meta">
            Saved {dossier.day}
            {dossier.guardianRank ? ` · Rank ${dossier.guardianRank}` : ''}
            {dossier.triumphScore != null ? ` · ${dossier.triumphScore.toLocaleString('en-US')} triumph score` : ''}
          </p>
        ) : null}
      </header>

      <section className="gh-card gh-bond-note" aria-labelledby="gh-new-bond">
        <h2 id="gh-new-bond">Play with new friends</h2>
        <p>You earn a new bond the first time you clear with this Guardian.</p>
        {dossier?.guidesFirstClears ? (
          <p>
            <strong>Guides first clears.</strong> This Guardian has helped newer players finish activities on Top Nest.
          </p>
        ) : (
          <p>A first clear together is worth more than running with the same group again.</p>
        )}
      </section>

      {dossier?.characters.length ? (
        <section className="gh-card" aria-labelledby="gh-dossier-characters">
          <h2 id="gh-dossier-characters">Characters</h2>
          <ul className="gh-character-grid">
            {dossier.characters.map((character) => (
              <li key={character.characterId}>
                <strong>
                  {character.light || '—'} {classLabel(character.className)}
                </strong>
                <span>
                  {character.subclassName || 'Subclass hidden'}
                  {character.titleName ? ` · ${character.titleName}` : ''}
                </span>
                <span>
                  {formatPlayed(character.minutesPlayedTotal)} played
                  {character.artifactPower != null ? ` · artifact +${character.artifactPower}` : ''}
                </span>
                {character.equipped.length ? (
                  <ul className="gh-slot-list">
                    {character.equipped.map((slot) => (
                      <li key={slot.bucket}>
                        {SLOT_LABELS[slot.bucket]}
                        {slot.name ? ` · ${slot.name}` : ''}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="gh-split">
        <section className="gh-card" aria-labelledby="gh-clears">
          <h2 id="gh-clears">Raid and dungeon clears</h2>
          {dossier?.activityClears.length ? (
            <>
              <ul className="gh-bar-list">
                {dossier.activityClears.map((row) => (
                  <li key={`${row.mode}-${row.name}`}>
                    <span>
                      {row.name}
                      <small> · {row.mode}</small>
                    </span>
                    <span className="gh-bar-track" aria-hidden="true">
                      <span style={{ width: `${barPercent(row.clears, maxClears)}%` }} />
                    </span>
                    <strong>{row.clears}</strong>
                  </li>
                ))}
              </ul>
              <p className="gh-muted">Recent tracked clears from the last saved raids and dungeons, not a lifetime total.</p>
            </>
          ) : (
            <p className="gh-muted">Per-activity clears show up after this Guardian signs in and a day is saved.</p>
          )}
          {dossier?.recentHistory.length ? (
            <ul className="gh-list">
              {dossier.recentHistory.map((entry) => (
                <li key={`${entry.mode}-${entry.name}-${entry.period ?? ''}`}>
                  <span>
                    {entry.name}
                    <small className="gh-muted"> · {entry.completed ? 'clear' : 'attempt'}</small>
                  </span>
                  <span className="gh-muted">{entry.period ? entry.period.slice(0, 10) : entry.mode}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <section className="gh-card" aria-labelledby="gh-weapons">
          <h2 id="gh-weapons">Weapon kills</h2>
          {dossier?.weaponKills.length ? (
            <ul className="gh-bar-list">
              {dossier.weaponKills.map((weapon) => (
                <li key={weapon.name}>
                  <span>{weapon.name}</span>
                  <span className="gh-bar-track" aria-hidden="true">
                    <span style={{ width: `${barPercent(weapon.kills, maxKills)}%` }} />
                  </span>
                  <strong>{weapon.kills.toLocaleString('en-US')}</strong>
                </li>
              ))}
            </ul>
          ) : (
            <p className="gh-muted">Top weapon kills are saved once a day for the highest-power character.</p>
          )}
        </section>
      </div>

      <section className="gh-card" aria-labelledby="gh-trend">
        <h2 id="gh-trend">Power over time</h2>
        {trend.length >= 2 && first && last ? (
          <>
            <div
              className="gh-trend"
              role="img"
              aria-label={`Power moved from ${first.light} on ${first.day} to ${last.light} on ${last.day}`}
            >
              {trend.map((point) => (
                <span
                  key={point.day}
                  style={{ height: `${trendHeight(point, minLight, maxLight)}%` }}
                  title={`${point.day}: ${point.light} power${point.triumphScore != null ? `, ${point.triumphScore} triumph score` : ''}`}
                />
              ))}
            </div>
            <p className="gh-muted">
              {first.day} {first.light}
              {first.triumphScore != null ? ` · ${first.triumphScore.toLocaleString('en-US')} triumphs` : ''} → {last.day}{' '}
              {last.light}
              {last.triumphScore != null ? ` · ${last.triumphScore.toLocaleString('en-US')} triumphs` : ''}
            </p>
          </>
        ) : (
          <p className="gh-muted">
            {dossier
              ? 'Trends show up after this Guardian is saved on a second day.'
              : 'No saved character history yet. It appears after this Guardian signs in to Top Nest.'}
          </p>
        )}
      </section>
    </div>
  )
}
