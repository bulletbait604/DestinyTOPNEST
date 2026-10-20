'use client'

import { useEffect, useState } from 'react'
import { Award, Gift, ShieldCheck, Sparkles, Users } from 'lucide-react'
import SeasonHall from '@/app/components/destiny/SeasonHall'
import type { SeasonWinner } from '@/lib/destiny/types'
import { NEST_SEASON_CATALOG, PRIZE_ELIGIBILITY, resolveActiveSeasonByDate } from '@/lib/destiny/seasonCatalog'
import { BOND_RULES } from '@/lib/destiny/bonds'
import { LEADERBOARD_RULES_APPEALS_EMAIL } from '@/lib/destiny/leaderboardRules'

function pt(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles', month: 'short', day: 'numeric', year: 'numeric' })
}

/** Season, prize and rules page — shared by the Season tab and /rules. */
export default function SeasonRulesPanel({ now = new Date() }: { now?: Date }) {
  const [physicalPrize, setPhysicalPrize] = useState<string>(PRIZE_ELIGIBILITY.physicalPrize)
  const [giftCardPrize, setGiftCardPrize] = useState<string>(PRIZE_ELIGIBILITY.giftCardPrize)
  const [cardLabel, setCardLabel] = useState('Destiny 2 3D print · or Steam card (UK)')
  const [hall, setHall] = useState<SeasonWinner[]>([])
  const season = resolveActiveSeasonByDate(now)

  useEffect(() => {
    void fetch('/api/destiny/site-content')
      .then(async (res) => {
        if (!res.ok) return null
        return res.json() as Promise<{ physicalPrize?: string; giftCardPrize?: string; cardLabel?: string }>
      })
      .then((json) => {
        if (!json) return
        if (json.physicalPrize) setPhysicalPrize(json.physicalPrize)
        if (json.giftCardPrize) setGiftCardPrize(json.giftCardPrize)
        if (json.cardLabel) setCardLabel(json.cardLabel)
      })
      .catch(() => undefined)
    void fetch('/api/destiny/hall')
      .then(async (res) => {
        if (!res.ok) return null
        return res.json() as Promise<{ hallOfFame?: SeasonWinner[] }>
      })
      .then((json) => {
        if (json?.hallOfFame) setHall(json.hallOfFame)
      })
      .catch(() => undefined)
  }, [])
  const next = NEST_SEASON_CATALOG.find((s) => Date.parse(s.startDate) > Date.parse(season.endDate) - 1)
  const daysLeft = Math.max(0, Math.ceil((Date.parse(season.endDate) - now.getTime()) / 86400000))
  return (
    <div className="space-y-4">
      <header className="gh-page-head">
        <div>
          <p className="gh-kicker">Season {season.seasonNumber} · {daysLeft} days left</p>
          <h1>{season.name}</h1>
          <p className="gh-lede">
            {season.tagline} {pt(season.startDate)} – {pt(season.endDate)} PT.
          </p>
        </div>
      </header>

      <SeasonHall season={season} winners={hall} />

      <div className="nest-grid">
        {[
          { title: 'Raid board', body: 'Most points from verified raid clears (incl. bond bonuses).' },
          { title: 'Dungeon board', body: 'Most points from verified dungeon clears (incl. bond bonuses).' },
          { title: 'New Bonds board', body: 'Most bond points — clearing with Guardians you had never played with.' },
        ].map((b) => (
          <div key={b.title} className="nest-card">
            <div className="nest-kicker">
              <Award size={12} style={{ display: 'inline' }} /> #1 wins
            </div>
            <h3>{b.title}</h3>
            <p className="nest-muted">{b.body}</p>
            <p style={{ marginTop: '0.5rem' }}>
              <span className="nest-prize">{cardLabel}</span>
            </p>
          </div>
        ))}
      </div>

      <section className="nest-card">
        <h2>
          <Gift size={18} style={{ display: 'inline' }} /> Prize eligibility
        </h2>
        <ul className="nest-muted" style={{ paddingLeft: '1.1rem', lineHeight: 1.7 }}>
          <li>
            <strong>USA &amp; Canada:</strong> {physicalPrize}.
          </li>
          <li>
            <strong>United Kingdom:</strong> {giftCardPrize} instead of the print.
          </li>
          <li>
            <strong>All other countries:</strong> you can play and rank, but you are not eligible for prizes.
          </li>
          <li>One prize per leaderboard per season (Raid, Dungeon, New Bonds). One player can win more than one board.</li>
          <li>Winners are confirmed after a 7-day verification window once the season ends; staff contact you to arrange delivery.</li>
        </ul>
      </section>

      <section className="nest-card">
        <h2>
          <Users size={18} style={{ display: 'inline' }} /> How points work
        </h2>
        <table className="nest-table">
          <tbody>
            <tr><td>Verified raid / dungeon full clear</td><td>{BOND_RULES.basePoints.raid} / {BOND_RULES.basePoints.dungeon}</td></tr>
            <tr><td>Each fireteam member you have <strong>never</strong> cleared with (raid / dungeon)</td><td>+{BOND_RULES.newBondPoints.raid} / +{BOND_RULES.newBondPoints.dungeon}</td></tr>
            <tr><td>2nd and 3rd clear with the same Guardian</td><td>+{BOND_RULES.repeatBondPoints} each</td></tr>
            <tr><td>Bringing someone through their first clear (sherpa)</td><td>+{BOND_RULES.sherpaBonusPoints}</td></tr>
          </tbody>
        </table>
        <p className="nest-muted" style={{ marginTop: '0.5rem' }}>
          No limit on how many strangers you bring — random fireteams are encouraged. Bonds are detected from Bungie
          post-game reports: the teammate must be in your fireteam, finish the activity and play at least half of it.
        </p>
      </section>

      <section className="nest-card">
        <h2>
          <ShieldCheck size={18} style={{ display: 'inline' }} /> Fair play
        </h2>
        <ul className="nest-muted" style={{ paddingLeft: '1.1rem', lineHeight: 1.7 }}>
          <li>Only verified full clears count; checkpoint runs need staff approval.</li>
          <li>Each pair of Guardians earns the new-bond bonus once, ever.</li>
          <li>At most {BOND_RULES.dailyNewBondCap} new bonds score per 24 hours.</li>
          <li>Unusually short clears earn no bond bonus; runs with suspicion score 70+ are held for review.</li>
          <li>Alt-account rings, paid carries for points, account sharing or exploits lead to disqualification.</li>
          <li>Appeals: {LEADERBOARD_RULES_APPEALS_EMAIL}</li>
        </ul>
      </section>

      {next ? (
        <p className="nest-muted">
          <Sparkles size={14} style={{ display: 'inline' }} /> Next: {next.name} starts {pt(next.startDate)} PT.
        </p>
      ) : null}
    </div>
  )
}
