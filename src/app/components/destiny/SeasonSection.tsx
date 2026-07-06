'use client'

import { useCallback, useEffect, useState } from 'react'
import { Clock, Trophy, Target } from 'lucide-react'
import type { LeaderboardEntry, PrizeClaim, Season, SeasonWinner, WeeklyResetInfo } from '@/lib/destiny/types'
import type { UserPrizeTrackEntry } from '@/lib/destiny/seasonPrizes'
import SeasonPrizeClaimSection from '@/app/components/destiny/SeasonPrizeClaimSection'
import { ActivityBadge, GlassCard, ItemIcon, LoadingBlock, SectionTitle } from '@/app/components/destiny/DestinyUi'
import { formatDuration, getDestinyTheme } from '@/app/components/destiny/destinyTheme'
import { leaderboardCategoryIconUrl } from '@/lib/destiny/activityIconPaths'
import { cn } from '@/lib/utils'

const CATEGORY_LABELS: Record<string, string> = {
  raid: 'Raid leaders',
  dungeon: 'Dungeon leaders',
  pantheon: 'Pantheon squads',
  top_guardians: 'Top Guardians (Commanders)',
}

/** Season prizes, hall of fame, and rules — rendered inside Leaderboards. */
export default function SeasonSection({ darkMode }: { darkMode: boolean }) {
  const [season, setSeason] = useState<Season | null>(null)
  const [countdown, setCountdown] = useState<{ days: number; hours: number; label: string } | null>(null)
  const [eligibility, setEligibility] = useState('')
  const [hallOfFame, setHallOfFame] = useState<SeasonWinner[]>([])
  const [prizeTrack, setPrizeTrack] = useState<UserPrizeTrackEntry[]>([])
  const [prizeClaims, setPrizeClaims] = useState<PrizeClaim[]>([])
  const [prizeEligible, setPrizeEligible] = useState<UserPrizeTrackEntry[]>([])
  const [seasonEnded, setSeasonEnded] = useState(false)
  const [myStandings, setMyStandings] = useState<LeaderboardEntry[]>([])
  const [weeklyReset, setWeeklyReset] = useState<WeeklyResetInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const t = getDestinyTheme(darkMode)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/destiny/season', { credentials: 'include' })
      if (res.ok) {
        const json = await res.json()
        setSeason(json.season)
        setCountdown(json.countdown)
        setEligibility(json.eligibility)
        setHallOfFame(json.hallOfFame ?? [])
        setPrizeTrack(json.prizeTrack ?? [])
        setPrizeEligible(json.prizeEligible ?? [])
        setPrizeClaims(json.prizeClaims ?? [])
        setSeasonEnded(Boolean(json.seasonEnded))
        setMyStandings(json.myStandings ?? [])
        setWeeklyReset(json.weeklyReset ?? null)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (loading) return <LoadingBlock darkMode={darkMode} label="Loading season…" />
  if (!season) return null

  const grouped = {
    raid: hallOfFame.filter((w) => w.category === 'raid'),
    dungeon: hallOfFame.filter((w) => w.category === 'dungeon'),
    pantheon: hallOfFame.filter((w) => w.category === 'pantheon'),
    top_guardians: hallOfFame.filter((w) => w.category === 'top_guardians'),
  }

  return (
    <div className="space-y-4 pt-2 border-t border-white/[0.08]">
      <SectionTitle
        title="Season standings"
        subtitle="Verified clears and MVP votes decide who leads each board"
        darkMode={darkMode}
      />

      <GlassCard darkMode={darkMode}>
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <h3 className="text-2xl font-bold text-white">{season.name} Season</h3>
            <p className={cn('text-sm', t.muted)}>
              {new Date(season.startDate).toLocaleDateString()} —{' '}
              {new Date(season.endDate).toLocaleDateString()}
            </p>
          </div>
          {countdown && (
            <div className="flex items-center gap-2 ml-auto">
              <Clock className="w-4 h-4 text-purple-400" />
              <span className={cn('text-sm font-medium', t.purple)}>
                {countdown.days}d {countdown.hours}h left
              </span>
            </div>
          )}
        </div>
      </GlassCard>

      {prizeTrack.length > 0 && (
        <GlassCard darkMode={darkMode}>
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-4 h-4 text-amber-400" />
            <SectionTitle title="Your standings" subtitle="Current ranks across active boards" darkMode={darkMode} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {prizeTrack.map((track) => (
              <div key={track.category} className="rounded-xl ring-1 ring-white/10 bg-white/[0.03] p-3">
                <div className="flex items-center gap-2 mb-1">
                  <ItemIcon
                    iconUrl={leaderboardCategoryIconUrl(track.category)}
                    name={CATEGORY_LABELS[track.category] ?? track.category}
                    size={28}
                  />
                  <p className={cn('text-xs uppercase tracking-wide', t.caption)}>
                    {CATEGORY_LABELS[track.category] ?? track.category}
                  </p>
                </div>
                <p className={cn('text-2xl font-semibold tabular-nums mt-1', t.gold)}>#{track.rank}</p>
                <p className={cn('text-xs mt-1', t.muted)}>
                  {track.points} pts ·{' '}
                  {track.category === 'pantheon' ? `${track.verifiedClears} encounters` : `${track.verifiedClears} clears`}
                </p>
                {track.fastestClearSeconds ? (
                  <p className={cn('text-[10px] mt-1', t.caption)}>
                    Best {track.fastestActivityName}: {formatDuration(track.fastestClearSeconds)}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      <SeasonPrizeClaimSection
        darkMode={darkMode}
        prizeEligible={prizeEligible}
        prizeClaims={prizeClaims}
        seasonEnded={seasonEnded}
        onClaimed={() => void load()}
      />

      {season?.status === 'archived' && (
        <GlassCard darkMode={darkMode}>
          <SectionTitle title="Season complete" darkMode={darkMode} />
          <p className={cn('text-sm', t.muted)}>
            Winners are locked. Final hall of fame below reflects official season results.
          </p>
        </GlassCard>
      )}

      {myStandings.length > 0 && prizeTrack.length === 0 && (
        <GlassCard darkMode={darkMode}>
          <SectionTitle title="Your season standings" darkMode={darkMode} />
          {myStandings.map((entry) => (
            <div key={entry.category} className="py-2 border-b border-white/5 flex justify-between text-sm">
              <span className={t.body}>{CATEGORY_LABELS[entry.category] ?? entry.category}</span>
              <span className={t.gold}>#{entry.rank} · {entry.points} pts</span>
            </div>
          ))}
        </GlassCard>
      )}

      {weeklyReset && (
        <GlassCard darkMode={darkMode}>
          <SectionTitle
            title="This Week's Featured Activities"
            subtitle={`${weeklyReset.weekLabel} · ${weeklyReset.resetTimeLabel}`}
            iconUrl={weeklyReset.featuredRaids[0]?.iconUrl}
            darkMode={darkMode}
          />
          <p className={cn('text-xs mb-3', t.blue)}>Reset in {weeklyReset.resetsInLabel}</p>
          {weeklyReset.pantheon ? (
            <div className="flex items-center gap-2 mb-3 p-2 rounded-lg bg-white/[0.03] ring-1 ring-white/10">
              <ItemIcon iconUrl={weeklyReset.pantheonIconUrl} name="Pantheon" size={32} />
              <div>
                <p className={cn('text-[10px] uppercase tracking-wide', t.caption)}>Pantheon</p>
                <p className="text-sm text-white">{weeklyReset.pantheon}</p>
              </div>
            </div>
          ) : null}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              {weeklyReset.featuredRaids.map((r) => (
                <ActivityBadge key={r.name} activityRef={r} name={r.name} darkMode={darkMode} />
              ))}
            </div>
            <div className="space-y-2">
              {weeklyReset.featuredDungeons.map((d) => (
                <ActivityBadge key={d.name} activityRef={d} name={d.name} darkMode={darkMode} />
              ))}
            </div>
          </div>
        </GlassCard>
      )}

      <GlassCard darkMode={darkMode}>
        <SectionTitle title="Eligibility & rules" darkMode={darkMode} />
        <p className={cn('text-sm', t.muted)}>{eligibility}</p>
        <ul className={cn('text-xs mt-3 space-y-1 list-disc list-inside', t.muted)}>
          <li>Points only for verified full completions</li>
          <li>2 pts per clan member · 5 pts per rando (raid max 2 randos, dungeon max 1)</li>
          <li>Pantheon squads: each boss encounter counts as one raid worth of points for the fireteam</li>
          <li>MVP votes: +1 pt for voting, +3 pts for the Guardian you pick (Top Guardians board)</li>
          <li>Checkpoint runs tracked but not scored unless admin approved</li>
          <li>Suspicious runs blocked until review (score 70+)</li>
        </ul>
      </GlassCard>

      <GlassCard darkMode={darkMode}>
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-4 h-4 text-amber-400" />
          <SectionTitle
            title="Hall of Fame"
            subtitle="Current season leaders — ranks lock at season end"
            darkMode={darkMode}
          />
        </div>
        {hallOfFame.length ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
            {(Object.entries(grouped) as Array<[keyof typeof grouped, SeasonWinner[]]>).map(
              ([category, winners]) => (
                <div key={category}>
                  <div className="flex items-center gap-2 mb-2">
                    <ItemIcon
                      iconUrl={leaderboardCategoryIconUrl(category)}
                      name={CATEGORY_LABELS[category] ?? category}
                      size={22}
                    />
                    <p className={cn('text-xs font-semibold', t.gold)}>
                      {CATEGORY_LABELS[category] ?? category}
                    </p>
                  </div>
                  {winners.length ? (
                    winners.map((w, i) => (
                      <div key={i} className="py-2 border-b border-white/5 flex items-center gap-2">
                        {w.emblemUrl ? (
                          <ItemIcon iconUrl={w.emblemUrl} name={w.displayName} size={28} className="rounded-sm shrink-0" />
                        ) : null}
                        <span className="text-white text-sm truncate">
                          #{w.rank} {w.displayName} {w.clanTag}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className={cn('text-xs', t.muted)}>No leaders yet.</p>
                  )}
                </div>
              )
            )}
          </div>
        ) : (
          <p className={t.muted}>Sync verified runs to populate season leaders.</p>
        )}
      </GlassCard>
    </div>
  )
}
