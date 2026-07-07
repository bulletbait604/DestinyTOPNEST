'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Trophy } from 'lucide-react'
import BungieConnectBanner from '@/app/components/destiny/BungieConnectBanner'
import EmblemPicker from '@/app/components/destiny/EmblemPicker'
import PlayerCardDetail from '@/app/components/destiny/PlayerCardDetail'
import StatCardEditor from '@/app/components/destiny/StatCardEditor'
import StatCardPreview from '@/app/components/destiny/StatCardPreview'
import PreviousActivitiesSection from '@/app/components/destiny/PreviousActivitiesSection'
import ReputationSummarySection from '@/app/components/destiny/ReputationSummarySection'
import ProfileLoadoutsSection from '@/app/components/destiny/ProfileLoadoutsSection'
import {
  GlassCard,
  LoadingBlock,
  SectionTitle,
  SegmentedControl,
  StatusPill,
} from '@/app/components/destiny/DestinyUi'
import { formatDuration, getDestinyTheme } from '@/app/components/destiny/destinyTheme'
import { DEFAULT_PROFILE_FLEX_STATS } from '@/lib/destiny/profileFlex'
import { useBungieLink } from '@/contexts/BungieLinkContext'
import { useProfileData } from '@/contexts/ProfileDataContext'
import { cn } from '@/lib/utils'
import { useActiveCharacterSelect } from '@/hooks/useActiveCharacterSelect'

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
  const { fullProfile, fullLoading, ensureFullProfile } = useProfileData()
  const { selectCharacter, switchingCharacter } = useActiveCharacterSelect()
  const [view, setView] = useState<ProfileView>(initialView)
  const bungie = useBungieLink()
  const t = getDestinyTheme(darkMode)
  const ensureFullProfileRef = useRef(ensureFullProfile)
  ensureFullProfileRef.current = ensureFullProfile

  useEffect(() => {
    setView(initialView)
  }, [initialView])

  useEffect(() => {
    if (!bungie.linked) return
    void ensureFullProfileRef.current()
  }, [bungie.linked])

  const handleCharacterSelect = useCallback(
    (characterId: string) => {
      void selectCharacter(characterId)
    },
    [selectCharacter]
  )

  const showInitialLoad = fullLoading && !fullProfile

  if (showInitialLoad) return <LoadingBlock darkMode={darkMode} label="Loading profile from Bungie…" />

  const linked = bungie.linked
  const profile = fullProfile

  if (!profile) {
    return (
      <div className="space-y-4">
        <BungieConnectBanner darkMode={darkMode} bungie={bungie} variant="compact" />
      </div>
    )
  }

  const pointTiles = [
    { label: 'Raid pts', value: profile.raidPoints },
    { label: 'Dungeon pts', value: profile.dungeonPoints },
    { label: 'Pantheon pts', value: profile.pantheonPoints ?? 0 },
    { label: 'MVP crowns', value: profile.guardianPoints ?? 0 },
    { label: 'Verified clears', value: profile.verifiedClears },
  ]

  return (
    <div className="space-y-4 d2-profile-page animate-in fade-in duration-300">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
        {pointTiles.map((stat) => (
          <div key={stat.label} className="d2-profile-stat-tile">
            <p className="d2-profile-stat-label">{stat.label}</p>
            <p className="d2-profile-stat-value">{stat.value}</p>
          </div>
        ))}
      </div>

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
        <PreviousActivitiesSection darkMode={darkMode} />
      ) : view === 'loadouts' ? (
        <ProfileLoadoutsSection
          darkMode={darkMode}
          initialSection={initialLoadoutSection}
          characters={profile.characters}
          activeCharacterId={profile.activeCharacterId}
          characterClass={profile.characterClass}
          onCharacterSelect={(id) => void handleCharacterSelect(id)}
          switchingCharacter={switchingCharacter}
        />
      ) : (
        <>
          <PlayerCardDetail
            profile={profile}
            darkMode={darkMode}
            switchingCharacter={switchingCharacter}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <EmblemPicker
              darkMode={darkMode}
              selectedSource={profile.displayEmblemSource}
              selectedHash={profile.displayEmblemHash}
              onSaved={() => void ensureFullProfile(undefined, { force: true })}
            />
            <div className="space-y-3">
              <StatCardEditor
                darkMode={darkMode}
                initialSelection={profile.profileFlexStats ?? DEFAULT_PROFILE_FLEX_STATS}
                onSaved={() => void ensureFullProfile(undefined, { force: true })}
              />
              <StatCardPreview stats={profile.flexStats ?? []} darkMode={darkMode} />
            </div>
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
