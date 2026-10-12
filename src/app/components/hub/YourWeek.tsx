'use client'

import { useEffect } from 'react'
import { useBungieLink } from '@/contexts/BungieLinkContext'
import { useProfileData } from '@/contexts/ProfileDataContext'
import { navigateDestinyTab, navigateProfileSection } from '@/lib/routing/tabUrl'

export default function YourWeek() {
  const bungie = useBungieLink()
  const { fullProfile, fullLoading, ensureFullProfile } = useProfileData()

  useEffect(() => {
    void ensureFullProfile()
  }, [ensureFullProfile])

  const contracts = fullProfile?.weeklyContracts
  const passport = fullProfile?.passport
  const chemistry = fullProfile?.chemistry
  const nightOps = fullProfile?.nightOps
  const upcoming = nightOps?.events.filter((event) => event.status === 'upcoming' || event.status === 'live') ?? []
  const done = contracts?.contracts.filter((contract) => contract.completed).length ?? 0
  const needsLink = !bungie.linked || bungie.status?.needsReconnect
  const noClears = (passport?.clearStamps ?? 0) === 0

  return (
    <section className="gh-stack" aria-labelledby="gh-your-week">
      <header>
        <p className="gh-kicker">Your week</p>
        <h1 id="gh-your-week">What to do before Tuesday&apos;s reset</h1>
        <p className="gh-lede">
          Contracts, stamps, and people you already clear with. Leaderboard points stay on the boards. This view is
          badges, titles, and frames.
        </p>
      </header>

      {needsLink ? (
        <div className="gh-card">
          <h2>Link Bungie to fill this in</h2>
          <p className="gh-muted">
            Sign-in created your account. Link Bungie next so verified clears can stamp your passport and complete
            contracts.
          </p>
          <button type="button" className="gh-btn gh-btn-primary" onClick={() => bungie.connect()}>
            Link Bungie
          </button>
        </div>
      ) : null}

      {fullLoading && !fullProfile ? <p className="gh-muted">Loading your week…</p> : null}

      {!needsLink && noClears && !fullLoading ? (
        <ol className="gh-steps">
          <li>Sync your Guardian with the refresh button.</li>
          <li>Finish a raid or dungeon from the start, or post a fireteam.</li>
          <li>Come back here for contract progress and teammate suggestions.</li>
        </ol>
      ) : null}

      <div className="gh-grid">
        <article className="gh-card">
          <h2>Contracts</h2>
          {contracts ? (
            <>
              <p className="gh-muted">
                {done} of {contracts.contracts.length} done · {contracts.seasonTier.title} ·{' '}
                {contracts.resetsInLabel} until reset
              </p>
              <ul className="gh-plain-list">
                {contracts.contracts.map((contract) => (
                  <li key={contract.id}>
                    {contract.completed ? 'Done' : 'Open'} · {contract.title}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="gh-muted">Contract progress shows up after your Guardian is linked and synced.</p>
          )}
          <button type="button" className="gh-text-btn" onClick={() => navigateDestinyTab('contracts')}>
            Read the weekly goals
          </button>
        </article>

        <article className="gh-card">
          <h2>Recent stamps</h2>
          {passport && passport.recentStamps.length ? (
            <ul className="gh-plain-list">
              {passport.recentStamps.slice(0, 3).map((stamp) => (
                <li key={stamp.runId}>
                  {stamp.activityName}
                  {stamp.newGuardianNames.length ? ` · new: ${stamp.newGuardianNames.join(', ')}` : ''}
                </li>
              ))}
            </ul>
          ) : (
            <p className="gh-muted">No stamps yet. A verified full clear from the start of the activity adds the first one.</p>
          )}
          <button type="button" className="gh-text-btn" onClick={() => navigateProfileSection('passport')}>
            Open passport
          </button>
        </article>

        <article className="gh-card">
          <h2>Suggested teammates</h2>
          {chemistry && chemistry.suggestions.length ? (
            <ul className="gh-plain-list">
              {chemistry.suggestions.slice(0, 3).map((suggestion) => (
                <li key={suggestion.membershipId}>
                  {suggestion.displayName} · {suggestion.reason}
                </li>
              ))}
            </ul>
          ) : (
            <p className="gh-muted">
              Suggestions appear after you have a verified clear with someone. Play two runs with the same group to see
              a squad.
            </p>
          )}
          <button type="button" className="gh-text-btn" onClick={() => navigateDestinyTab('fireteam')}>
            Find a fireteam
          </button>
        </article>

        <article className="gh-card">
          <h2>Night Ops</h2>
          {upcoming.length ? (
            <ul className="gh-plain-list">
              {upcoming.slice(0, 3).map((event) => (
                <li key={event.event.id}>
                  {event.status === 'live' ? 'Live' : 'Upcoming'} · {event.event.title}
                  {event.attended ? ' · attended' : ''}
                </li>
              ))}
            </ul>
          ) : (
            <p className="gh-muted">No upcoming Night Ops. The events tab lists the schedule when one is posted.</p>
          )}
          <button type="button" className="gh-text-btn" onClick={() => navigateDestinyTab('events')}>
            See events
          </button>
        </article>
      </div>
    </section>
  )
}
