'use client'

import { Stamp } from 'lucide-react'
import WeeklyContractsPanel from '@/app/components/destiny/WeeklyContractsPanel'
import { GlassCard, SectionTitle, StatusPill } from '@/app/components/destiny/DestinyUi'
import { getDestinyTheme } from '@/app/components/destiny/destinyTheme'
import { activityTypeLabel, formatStampPoints } from '@/lib/destiny/passport'
import { PASSPORT_FRAME_LABELS } from '@/lib/destiny/weeklyContractCatalog'
import type { PassportProfile, WeeklyContractsSnapshot } from '@/lib/destiny/types'
import { cn } from '@/lib/utils'

const FRAME_CLASS: Record<string, string> = {
  recruit: 'ring-white/30',
  bronze: 'ring-amber-700/80',
  silver: 'ring-zinc-200/80',
  gold: 'ring-yellow-300/80',
  prismatic: 'ring-fuchsia-400/80',
}

export default function PassportPanel({
  passport,
  weeklyContracts,
  darkMode,
}: {
  passport: PassportProfile
  weeklyContracts?: WeeklyContractsSnapshot
  darkMode: boolean
}) {
  const t = getDestinyTheme(darkMode)
  const frame = weeklyContracts?.seasonTier.frame ?? 'recruit'
  const earnedTitles = passport.titles.filter((title) => title.earned)

  return (
    <div className="space-y-3">
      <GlassCard darkMode={darkMode} padding="compact">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'shrink-0 w-16 h-16 rounded-full ring-2 border border-dashed border-amber-200/40 flex items-center justify-center bg-black/30',
              FRAME_CLASS[frame]
            )}
            aria-hidden
          >
            <Stamp className="w-7 h-7 text-amber-200" />
          </div>
          <div className="min-w-0 flex-1">
            <SectionTitle
              title="Fireteam Passport"
              subtitle="Stamps from verified full clears — started from the beginning, or staff-approved"
              darkMode={darkMode}
              compact
            />
            <p className={cn('text-sm mt-1', t.heading)}>{passport.displayTitle}</p>
            <p className={cn('text-xs mt-1', t.muted)}>
              {PASSPORT_FRAME_LABELS[frame]}
              {weeklyContracts ? ` · Season tier ${weeklyContracts.seasonTier.tier}` : ''}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mt-3">
          <div className="d2-profile-stat-tile">
            <p className="d2-profile-stat-label">Stamps</p>
            <p className="d2-profile-stat-value">{formatStampPoints(passport.totalStamps)}</p>
          </div>
          <div className="d2-profile-stat-tile">
            <p className="d2-profile-stat-label">New Guardians</p>
            <p className="d2-profile-stat-value">{passport.newGuardianStamps}</p>
          </div>
          <div className="d2-profile-stat-tile">
            <p className="d2-profile-stat-label">Distinct teammates</p>
            <p className="d2-profile-stat-value">{passport.distinctTeammates}</p>
          </div>
          <div className="d2-profile-stat-tile">
            <p className="d2-profile-stat-label">Activities</p>
            <p className="d2-profile-stat-value">{passport.activities.length}</p>
          </div>
        </div>
        <p className={cn('text-[11px] mt-2', t.caption)}>
          Each full clear is one stamp. A teammate you have never cleared with adds a new Guardian stamp. Repeat teammates still count, at a quarter stamp.
        </p>
        {earnedTitles.length ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {earnedTitles.map((title) => (
              <StatusPill key={title.id} label={title.title} tone="gold" />
            ))}
          </div>
        ) : (
          <p className={cn('text-sm mt-3', t.muted)}>Sync a verified full clear to open your passport.</p>
        )}
      </GlassCard>

      <GlassCard darkMode={darkMode} padding="compact">
        <SectionTitle
          title="Activity collection"
          subtitle="One badge per raid, dungeon, or Pantheon you have stamped"
          darkMode={darkMode}
          compact
        />
        {passport.activities.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
            {passport.activities.map((activity) => (
              <div key={activity.activityKey} className="rounded-xl ring-1 ring-white/10 bg-white/[0.03] p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className={cn('text-sm font-medium', t.body)}>{activity.activityName}</p>
                  <StatusPill label={activityTypeLabel(activity.activityType)} tone="blue" />
                </div>
                <p className={cn('text-xs mt-2', t.gold)}>{activity.badgeLabel}</p>
                <p className={cn('text-[11px] mt-1', t.caption)}>
                  {activity.clearCount} {activity.clearCount === 1 ? 'clear' : 'clears'}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className={cn('text-sm mt-2', t.muted)}>No activity stamps yet.</p>
        )}
      </GlassCard>

      <GlassCard darkMode={darkMode} padding="compact">
        <SectionTitle title="Recent stamps" darkMode={darkMode} compact />
        {passport.recentStamps.length ? (
          passport.recentStamps.map((stamp) => (
            <div key={stamp.runId} className="d2-profile-list-row">
              <div className="min-w-0">
                <p className={cn('text-sm', t.body)}>{stamp.activityName}</p>
                <p className={cn('text-[11px]', t.caption)}>
                  {stamp.newGuardianStamps > 0
                    ? `New Guardians: ${stamp.newGuardianNames.join(', ')}`
                    : stamp.repeatTeammateCredit > 0
                      ? 'Repeat teammates'
                      : 'Solo stamp'}
                </p>
              </div>
              <span className={cn('text-sm tabular-nums font-semibold', t.gold)}>
                +{formatStampPoints(stamp.stampTotal)}
              </span>
            </div>
          ))
        ) : (
          <p className={cn('text-sm', t.muted)}>Stamps show up after a verified full clear.</p>
        )}
      </GlassCard>

      {weeklyContracts ? <WeeklyContractsPanel board={weeklyContracts} darkMode={darkMode} compact /> : null}
    </div>
  )
}
