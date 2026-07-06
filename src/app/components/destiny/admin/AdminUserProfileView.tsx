'use client'

import type { PlayerProfile } from '@/lib/destiny/types'
import GuardianHeroCard from '@/app/components/destiny/GuardianHeroCard'
import PlayerCardDetail from '@/app/components/destiny/PlayerCardDetail'
import StatCardPreview from '@/app/components/destiny/StatCardPreview'
import { CharacterTileRow } from '@/app/components/destiny/CharacterTile'
import {
  GlassCard,
  SectionTitle,
  StatusPill,
} from '@/app/components/destiny/DestinyUi'
import { formatDuration, getDestinyTheme } from '@/app/components/destiny/destinyTheme'
import { cn } from '@/lib/utils'

export default function AdminUserProfileView({
  profile,
  bungieLinked,
  darkMode,
}: {
  profile: PlayerProfile | null | undefined
  bungieLinked: boolean
  darkMode: boolean
}) {
  const t = getDestinyTheme(darkMode)

  if (!bungieLinked || !profile) {
    return (
      <GlassCard darkMode={darkMode}>
        <SectionTitle
          title="Guardian profile"
          subtitle="Live Bungie data"
          darkMode={darkMode}
        />
        <p className={cn('text-sm', t.muted)}>
          This account has not linked Bungie — no guardian or loadout data available.
        </p>
      </GlassCard>
    )
  }

  const pointTiles = [
    { label: 'Raid pts', value: profile.raidPoints },
    { label: 'Dungeon pts', value: profile.dungeonPoints },
    { label: 'Pantheon pts', value: profile.pantheonPoints ?? 0 },
    { label: 'MVP crowns', value: profile.guardianPoints ?? 0 },
    { label: 'Verified clears', value: profile.verifiedClears },
    { label: 'Reputation', value: profile.reputationScore },
  ]

  return (
    <div className="space-y-4">
      <GlassCard darkMode={darkMode}>
        <SectionTitle
          title="Guardian profile"
          subtitle="Same view as the user sees on their Profile tab"
          darkMode={darkMode}
        />
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 mb-4">
          {pointTiles.map((stat) => (
            <div key={stat.label} className="d2-profile-stat-tile">
              <p className="d2-profile-stat-label">{stat.label}</p>
              <p className="d2-profile-stat-value">{stat.value}</p>
            </div>
          ))}
        </div>

        {profile.badges.length ? (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {profile.badges.map((badge) => (
              <StatusPill key={badge} label={badge} tone="gold" />
            ))}
          </div>
        ) : null}

        <p className={cn('text-xs mb-4', t.muted)}>{profile.prizeEligibility}</p>

        <GuardianHeroCard profile={profile} darkMode={darkMode} linked={bungieLinked} />
      </GlassCard>

      {profile.characters?.length ? (
        <GlassCard darkMode={darkMode}>
          <SectionTitle title="Characters" subtitle="Account roster" darkMode={darkMode} />
          <CharacterTileRow
            characters={profile.characters}
            activeCharacterId={profile.activeCharacterId}
            selectable={false}
          />
        </GlassCard>
      ) : null}

      <GlassCard darkMode={darkMode}>
        <SectionTitle
          title="Current loadout"
          subtitle="Live equipped gear from Bungie"
          darkMode={darkMode}
        />
        <PlayerCardDetail profile={profile} darkMode={darkMode} />
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GlassCard darkMode={darkMode}>
          <SectionTitle title="Stat card" darkMode={darkMode} compact />
          <StatCardPreview stats={profile.flexStats ?? []} darkMode={darkMode} />
        </GlassCard>

        <GlassCard darkMode={darkMode} padding="compact">
          <SectionTitle title="Top completions" darkMode={darkMode} compact />
          {profile.topCompletions.length ? (
            profile.topCompletions.map((c, i) => (
              <div key={i} className="d2-profile-list-row">
                <span className={cn('text-sm', t.body)}>{c.activityName}</span>
                <span className={cn('text-sm tabular-nums font-semibold', t.gold)}>
                  {formatDuration(c.durationSeconds)}
                </span>
              </div>
            ))
          ) : (
            <p className={cn('text-sm', t.muted)}>No verified completions yet.</p>
          )}
        </GlassCard>
      </div>

      {profile.favoriteTeammates.length || profile.favoriteActivities.length ? (
        <GlassCard darkMode={darkMode} padding="compact">
          <SectionTitle title="Activity highlights" darkMode={darkMode} compact />
          {profile.favoriteActivities.length ? (
            <p className={cn('text-xs mb-2', t.muted)}>
              Favorite activities: {profile.favoriteActivities.join(' · ')}
            </p>
          ) : null}
          {profile.favoriteTeammates.length ? (
            <p className={cn('text-xs', t.muted)}>
              Frequent fireteam: {profile.favoriteTeammates.join(' · ')}
            </p>
          ) : null}
        </GlassCard>
      ) : null}
    </div>
  )
}
