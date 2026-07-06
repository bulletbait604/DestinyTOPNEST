'use client'

import { useCallback, useEffect, useState } from 'react'
import { Trophy, Unlink, Loader2 } from 'lucide-react'
import type { PlayerProfile } from '@/lib/destiny/types'
import BungieConnectBanner from '@/app/components/destiny/BungieConnectBanner'
import EmblemPicker from '@/app/components/destiny/EmblemPicker'
import PlayerCardDetail from '@/app/components/destiny/PlayerCardDetail'
import StatCardEditor from '@/app/components/destiny/StatCardEditor'
import FireteamReviewSection from '@/app/components/destiny/FireteamReviewSection'
import ReputationSummarySection from '@/app/components/destiny/ReputationSummarySection'
import ProfileLoadoutsSection from '@/app/components/destiny/ProfileLoadoutsSection'
import PreviousActivitiesSection from '@/app/components/destiny/PreviousActivitiesSection'
import {
  GlassCard,
  LoadingBlock,
  SectionTitle,
  SegmentedControl,
  StatusPill,
} from '@/app/components/destiny/DestinyUi'
import { formatDuration, getDestinyTheme } from '@/app/components/destiny/destinyTheme'
import { DEFAULT_PROFILE_FLEX_STATS } from '@/lib/destiny/profileFlex'
import { useBungieLink } from '@/hooks/useBungieLink'
import { cn } from '@/lib/utils'

type ProfileView = 'guardian' | 'activities' | 'loadouts'
type LoadoutSection = 'mine' | 'community' | 'builder'

interface Props {
  darkMode: boolean
  initialView?: ProfileView
  initialLoadoutSection?: LoadoutSection
}

export default function ProfilePanel({
  darkMode,
  initialView = 'guardian',
  initialLoadoutSection,
}: Props) {
  const [profile, setProfile] = useState<PlayerProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [switchingCharacter, setSwitchingCharacter] = useState(false)
  const [view, setView] = useState<ProfileView>(initialView)
  const bungie = useBungieLink()
  const t = getDestinyTheme(darkMode)

  useEffect(() => {
    setView(initialView)
  }, [initialView])

  const load = useCallback(async (characterId?: string) => {
    if (!characterId) setLoading(true)
    else setSwitchingCharacter(true)

    try {
      const qs = new URLSearchParams({ scope: 'full' })
      if (characterId) qs.set('characterId', characterId)
      const profileRes = await fetch(`/api/destiny/profile?${qs.toString()}`, { credentials: 'include' })
      if (profileRes.ok) {
        const profileJson = await profileRes.json()
        setProfile(profileJson?.profile ?? null)
      }
    } finally {
      setLoading(false)
      setSwitchingCharacter(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load, bungie.linked])

  const handleCharacterSelect = useCallback(
    async (characterId: string) => {
      if (!profile || characterId === profile.activeCharacterId) return
      setSwitchingCharacter(true)
      try {
        const res = await fetch('/api/destiny/profile', {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ activeCharacterId: characterId }),
        })
        if (res.ok) {
          const json = await res.json()
          setProfile(json?.profile ?? null)
        } else {
          await load(characterId)
        }
      } finally {
        setSwitchingCharacter(false)
      }
    },
    [load, profile]
  )

  if (loading) return <LoadingBlock darkMode={darkMode} label="Loading profile from Bungie…" />

  const linked = bungie.linked

  if (!profile) {
    return (
      <div className="space-y-4">
        <BungieConnectBanner darkMode={darkMode} bungie={bungie} variant="compact" />
      </div>
    )
  }

  return (
    <div className="space-y-4 d2-profile-page">
      <SegmentedControl
        label="Profile"
        darkMode={darkMode}
        value={view}
        onChange={setView}
        options={[
          { value: 'guardian', label: 'Guardian' },
          { value: 'activities', label: 'Previous Activities' },
          { value: 'loadouts', label: 'Loadouts' },
        ]}
      />

      {view === 'activities' ? (
        <div className="space-y-4">
          <PreviousActivitiesSection darkMode={darkMode} />
          <FireteamReviewSection darkMode={darkMode} linked={linked} />
        </div>
      ) : view === 'loadouts' ? (
        <ProfileLoadoutsSection darkMode={darkMode} initialSection={initialLoadoutSection} />
      ) : (
        <>
          {linked && (
            <div className="flex flex-wrap items-center justify-end gap-2 rounded-xl border border-white/[0.08] bg-black/25 px-3 py-2.5">
              <button
                type="button"
                disabled={bungie.disconnecting}
                onClick={() => void bungie.disconnect()}
                className={cn(
                  'ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs',
                  'ring-1 ring-red-500/30 text-red-300 bg-red-500/10'
                )}
              >
                {bungie.disconnecting ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Unlink className="w-3 h-3" />
                )}
                Sign out
              </button>
            </div>
          )}

          <PlayerCardDetail
              profile={profile}
              darkMode={darkMode}
              switchingCharacter={switchingCharacter}
              onCharacterSelect={(id) => void handleCharacterSelect(id)}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <EmblemPicker
                darkMode={darkMode}
                selectedSource={profile.displayEmblemSource}
                selectedHash={profile.displayEmblemHash}
                onSaved={() => void load()}
              />
              <StatCardEditor
                darkMode={darkMode}
                initialSelection={profile.profileFlexStats ?? DEFAULT_PROFILE_FLEX_STATS}
              onSaved={() => void load()}
            />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
            {[
              { label: 'Raid pts', value: profile.raidPoints },
              { label: 'Dungeon pts', value: profile.dungeonPoints },
              { label: 'Pantheon pts', value: profile.pantheonPoints ?? 0 },
              { label: 'Guardian pts', value: profile.guardianPoints ?? profile.fullClanPoints ?? 0 },
              { label: 'Verified clears', value: profile.verifiedClears },
            ].map((stat) => (
              <div key={stat.label} className="d2-profile-stat-tile">
                <p className="d2-profile-stat-label">{stat.label}</p>
                <p className="d2-profile-stat-value">{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
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
                <p className={cn('text-sm', t.muted)}>Sync runs to see your best times.</p>
              )}
            </GlassCard>

            <GlassCard darkMode={darkMode} padding="compact">
              <SectionTitle title="Prize eligibility" darkMode={darkMode} compact />
              <p className={cn('text-sm leading-relaxed', t.body)}>{profile.prizeEligibility}</p>
              {profile.favoriteTeammates.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {profile.favoriteTeammates.map((name) => (
                    <StatusPill key={name} label={name} tone="blue" />
                  ))}
                </div>
              )}
            </GlassCard>
          </div>

          <FireteamReviewSection darkMode={darkMode} linked={linked} />
          <ReputationSummarySection darkMode={darkMode} />

          <GlassCard darkMode={darkMode} padding="compact">
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="w-4 h-4 text-amber-400/80" />
              <SectionTitle title="Recent runs" darkMode={darkMode} compact />
            </div>
            {profile.recentRuns.length ? (
              profile.recentRuns.map((run) => (
                <div key={run.id} className="d2-profile-list-row">
                  <span className={cn('text-sm', t.body)}>{run.activityName}</span>
                  <StatusPill
                    label={run.verificationStatus}
                    tone={run.verificationStatus === 'verified' ? 'green' : 'gold'}
                  />
                </div>
              ))
            ) : (
              <p className={cn('text-sm', t.muted)}>No runs synced yet.</p>
            )}
          </GlassCard>
        </>
      )}
    </div>
  )
}
