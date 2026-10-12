'use client'

import { Radio, Shield, Swords, Users } from 'lucide-react'
import { GlassCard, SectionTitle, StatusPill } from '@/app/components/destiny/DestinyUi'
import { formatDuration, getDestinyTheme } from '@/app/components/destiny/destinyTheme'
import type { ChemistryBoard, ClanWarsBoard, NightOpsBoard, SherpaBoard } from '@/lib/destiny/types'
import { cn } from '@/lib/utils'

export function SherpaPanel({
  board,
  darkMode,
  showHall = true,
}: {
  board: SherpaBoard
  darkMode: boolean
  showHall?: boolean
}) {
  const t = getDestinyTheme(darkMode)
  return (
    <GlassCard darkMode={darkMode} padding="compact">
      <div className="flex items-start gap-2">
        <Shield className="w-4 h-4 mt-0.5 text-amber-200 shrink-0" />
        <SectionTitle
          title="Sherpa ranks"
          subtitle="Verified first clears you guided. A learner MVP vote adds a bonus. Titles only."
          darkMode={darkMode}
          compact
        />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
        <div className="d2-profile-stat-tile">
          <p className="d2-profile-stat-label">Rank</p>
          <p className="d2-profile-stat-value">{board.rank ?? '—'}</p>
        </div>
        <div className="d2-profile-stat-tile">
          <p className="d2-profile-stat-label">Guided</p>
          <p className="d2-profile-stat-value">{board.guidedClears}</p>
        </div>
        <div className="d2-profile-stat-tile">
          <p className="d2-profile-stat-label">Learner MVPs</p>
          <p className="d2-profile-stat-value">{board.learnerMvps}</p>
        </div>
        <div className="d2-profile-stat-tile">
          <p className="d2-profile-stat-label">Title</p>
          <p className="d2-profile-stat-value text-base sm:text-lg">{board.title}</p>
        </div>
      </div>
      {!board.historyComplete ? (
        <p className={cn('text-[11px] mt-2', t.caption)}>Clear history is capped, so older sherpa credits may be missing.</p>
      ) : null}
      {showHall && board.hallOfFame.length ? (
        <div className="mt-3 space-y-1">
          <p className={cn('text-xs uppercase tracking-wide', t.caption)}>Hall of fame</p>
          {board.hallOfFame.map((row) => (
            <div key={row.membershipId} className="d2-profile-list-row">
              <span className={cn('text-sm', t.body)}>
                #{row.rank} {row.displayName}
              </span>
              <span className={cn('text-xs', t.gold)}>
                {row.title} · {row.points} pts
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </GlassCard>
  )
}

export function ClanWarsPanel({ board, darkMode }: { board: ClanWarsBoard; darkMode: boolean }) {
  const t = getDestinyTheme(darkMode)
  return (
    <GlassCard darkMode={darkMode} padding="compact">
      <div className="flex items-start gap-2">
        <Swords className="w-4 h-4 mt-0.5 text-sky-300 shrink-0" />
        <SectionTitle
          title="Clan Wars"
          subtitle={`${board.weekLabel} · divisions from verified clanmate clears, plus a recruit bonus`}
          darkMode={darkMode}
          compact
        />
      </div>
      {board.viewerClan ? (
        <p className={cn('text-sm mt-2', t.body)}>
          Your clan: #{board.viewerClan.rank} {board.viewerClan.clanName} · {board.viewerClan.division} ·{' '}
          {board.viewerClan.seasonPoints} season pts · {board.viewerClan.weeklyPoints} this week
        </p>
      ) : (
        <p className={cn('text-sm mt-2', t.muted)}>Your clan has no verified clanmate clears this season yet.</p>
      )}
      {board.standings.length ? (
        <div className="mt-2">
          {board.standings.slice(0, 8).map((row) => (
            <div key={row.clanId} className="d2-profile-list-row">
              <span className={cn('text-sm', t.body)}>
                #{row.rank} {row.clanName}
              </span>
              <span className={cn('text-xs', t.gold)}>
                {row.division} · {row.seasonPoints} pts
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className={cn('text-sm mt-2', t.muted)}>No clan standings yet.</p>
      )}
    </GlassCard>
  )
}

export function NightOpsPanel({ board, darkMode }: { board: NightOpsBoard; darkMode: boolean }) {
  const t = getDestinyTheme(darkMode)
  return (
    <GlassCard darkMode={darkMode} padding="compact">
      <div className="flex items-start gap-2">
        <Radio className="w-4 h-4 mt-0.5 text-fuchsia-300 shrink-0" />
        <SectionTitle
          title="Community Night Ops"
          subtitle="Kick and Twitch raid nights. A badge needs a verified clear inside the event window."
          darkMode={darkMode}
          compact
        />
      </div>
      {board.badges.length ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {board.badges.map((badge) => (
            <StatusPill key={badge} label={badge} tone="purple" />
          ))}
        </div>
      ) : null}
      {board.events.length ? (
        <div className="mt-3 space-y-2">
          {board.events.map((card) => (
            <div key={card.event.id} className="rounded-xl ring-1 ring-white/10 bg-white/[0.03] p-3">
              <div className="flex items-center justify-between gap-2">
                <p className={cn('text-sm font-medium', t.body)}>{card.event.title}</p>
                <StatusPill
                  label={card.attended ? 'Attended' : card.status}
                  tone={card.attended ? 'green' : card.status === 'live' ? 'gold' : 'neutral'}
                />
              </div>
              <p className={cn('text-xs mt-1', t.muted)}>
                {card.event.hostName}
                {card.event.activityName ? ` · ${card.event.activityName}` : ''}
              </p>
              <div className="mt-2 flex flex-wrap gap-3 text-xs">
                {card.event.twitchUrl ? (
                  <a className="text-sky-300 underline" href={card.event.twitchUrl} target="_blank" rel="noreferrer">
                    Twitch
                  </a>
                ) : null}
                {card.event.kickUrl ? (
                  <a className="text-emerald-300 underline" href={card.event.kickUrl} target="_blank" rel="noreferrer">
                    Kick
                  </a>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className={cn('text-sm mt-2', t.muted)}>
          No Night Ops are scheduled. Add events with FIRETEAM_HQ_NIGHT_OPS_JSON.
        </p>
      )}
    </GlassCard>
  )
}

export function ChemistryPanel({ board, darkMode }: { board: ChemistryBoard; darkMode: boolean }) {
  const t = getDestinyTheme(darkMode)
  return (
    <GlassCard darkMode={darkMode} padding="compact">
      <div className="flex items-start gap-2">
        <Users className="w-4 h-4 mt-0.5 text-emerald-300 shrink-0" />
        <SectionTitle
          title="Fireteam chemistry"
          subtitle="Squads ranked by clear rate, then faster average clears. Suggestions come from people you already play with."
          darkMode={darkMode}
          compact
        />
      </div>
      {board.squads.length ? (
        <div className="mt-3 space-y-1">
          {board.squads.map((squad) => (
            <div key={squad.squadKey} className="d2-profile-list-row">
              <span className={cn('text-sm truncate', t.body)}>{squad.memberNames.join(' · ')}</span>
              <span className={cn('text-xs shrink-0', t.gold)}>
                {Math.round(squad.clearRate * 100)}%
                {squad.averageClearSeconds != null ? ` · ${formatDuration(squad.averageClearSeconds)}` : ''}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className={cn('text-sm mt-2', t.muted)}>Play two runs with the same fireteam to see a squad.</p>
      )}
      {board.suggestions.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {board.suggestions.map((suggestion) => (
            <StatusPill key={suggestion.membershipId} label={`${suggestion.displayName} · ${suggestion.reason}`} tone="blue" />
          ))}
        </div>
      ) : null}
    </GlassCard>
  )
}
