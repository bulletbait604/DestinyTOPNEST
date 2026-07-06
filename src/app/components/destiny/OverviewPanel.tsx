'use client'

import { useCallback, useEffect, useState } from 'react'
import type { FeaturedActivity, WeeklyActivityLootSnapshot } from '@/lib/destiny/types'
import HomeLeaderboardCard from '@/app/components/destiny/HomeLeaderboardCard'
import {
  GlassCard,
  ItemIcon,
  LoadingBlock,
  ResetCountdown,
  SectionTitle,
  StatusPill,
} from '@/app/components/destiny/DestinyUi'
import { cn } from '@/lib/utils'
import { getDestinyTheme } from '@/app/components/destiny/destinyTheme'
import TopLoadoutsByClass from '@/app/components/destiny/TopLoadoutsByClass'
import PendingVotePrompt from '@/app/components/destiny/PendingVotePrompt'
import WeeklyActivitySetCard from '@/app/components/destiny/WeeklyActivitySetCard'
import { homeSectionArtUrl, soloLeaderboardIconUrl } from '@/lib/destiny/navArt'
import { leaderboardCategoryIconUrl } from '@/lib/destiny/activityIconPaths'
import { useOverviewData } from '@/contexts/OverviewDataContext'

function countdownParts(ms: number) {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  return {
    days: Math.floor(totalSec / 86400),
    hours: Math.floor((totalSec % 86400) / 3600),
    minutes: Math.floor((totalSec % 3600) / 60),
  }
}

function rotationActivityCards(
  raids: FeaturedActivity[],
  dungeons: FeaturedActivity[],
  pantheonName: string | undefined,
  pantheonIconUrl: string | undefined,
  resetsIn: string,
  darkMode: boolean,
  lootByActivity?: Record<string, WeeklyActivityLootSnapshot>
) {
  const cards: {
    label: string
    activity: FeaturedActivity
    kind: 'raid' | 'dungeon' | 'pantheon'
  }[] = [
    { label: 'Weekly raid', activity: raids[0], kind: 'raid' },
    { label: 'Weekly raid', activity: raids[1], kind: 'raid' },
    { label: 'Weekly dungeon', activity: dungeons[0], kind: 'dungeon' },
    { label: 'Weekly dungeon', activity: dungeons[1], kind: 'dungeon' },
  ]

  if (pantheonName) {
    cards.push({
      label: 'Pantheon',
      activity: {
        name: pantheonName,
        difficulty: 'normal',
        iconUrl: pantheonIconUrl,
      },
      kind: 'pantheon',
    })
  }

  return cards
    .filter((c) => c.activity?.name)
    .map((c, i) => (
      <WeeklyActivitySetCard
        key={`${c.kind}-${c.activity.name}-${i}`}
        label={c.label}
        activity={c.activity}
        kind={c.kind}
        resetsIn={resetsIn}
        darkMode={darkMode}
        lootIntel={lootByActivity?.[c.activity.name]}
      />
    ))
}

const PENDING_VOTE_DISMISS_KEY = 'dtn-pending-vote-dismiss'

interface OverviewPanelProps {
  darkMode: boolean
  onGoToActivities?: () => void
}

export default function OverviewPanel({ darkMode, onGoToActivities }: OverviewPanelProps) {
  const { data, loading, error } = useOverviewData()
  const [showVotePrompt, setShowVotePrompt] = useState(false)
  const t = getDestinyTheme(darkMode)

  useEffect(() => {
    const pending = data?.pendingRunActions
    if (!pending || pending.pendingCount <= 0) {
      setShowVotePrompt(false)
      return
    }

    const dismissHash = `${pending.mvpRunCount}-${pending.trustReviewCount}`
    const dismissed = sessionStorage.getItem(PENDING_VOTE_DISMISS_KEY)
    setShowVotePrompt(dismissed !== dismissHash)
  }, [data?.pendingRunActions])

  const dismissVotePrompt = useCallback(() => {
    const pending = data?.pendingRunActions
    if (pending) {
      sessionStorage.setItem(
        PENDING_VOTE_DISMISS_KEY,
        `${pending.mvpRunCount}-${pending.trustReviewCount}`
      )
    }
    setShowVotePrompt(false)
  }, [data?.pendingRunActions])

  const goToActivities = useCallback(() => {
    dismissVotePrompt()
    onGoToActivities?.()
  }, [dismissVotePrompt, onGoToActivities])

  if (loading) return <LoadingBlock darkMode={darkMode} />
  if (error || !data) {
    return (
      <GlassCard darkMode={darkMode}>
        <p className="text-red-400">{error ?? 'No data'}</p>
      </GlassCard>
    )
  }

  const { featuredRaids, featuredDungeons, resetsInLabel } = data.weeklyReset
  const soloEntries = data.guardiansTop3 ?? data.clanTop5 ?? []
  const todayArt = homeSectionArtUrl('todayPanel')

  return (
    <>
      {showVotePrompt && data.pendingRunActions ? (
        <PendingVotePrompt
          darkMode={darkMode}
          pending={data.pendingRunActions}
          onGoToActivities={goToActivities}
          onDismiss={dismissVotePrompt}
        />
      ) : null}

      <div className="space-y-5 sm:space-y-6">
      <div>
        <h2 className="d2-panel-header-title text-center text-base sm:text-lg mb-4">Leaderboard</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <HomeLeaderboardCard
          title="Raid"
          subtitle="Top raiders this season"
          artUrl={homeSectionArtUrl('raidBoard')}
          iconUrl={featuredRaids[0]?.iconUrl ?? data.featuredRaid.iconUrl}
          entries={data.raidTop10}
          darkMode={darkMode}
        />
        <HomeLeaderboardCard
          title="Dungeon"
          subtitle="Top delvers this season"
          artUrl={homeSectionArtUrl('dungeonBoard')}
          iconUrl={featuredDungeons[0]?.iconUrl ?? data.featuredDungeon.iconUrl}
          entries={data.dungeonTop10}
          darkMode={darkMode}
        />
        <HomeLeaderboardCard
          title="Pantheon"
          subtitle="Boss encounters = raid points"
          artUrl={homeSectionArtUrl('pantheonBoard')}
          iconUrl={data.weeklyReset.pantheonIconUrl ?? leaderboardCategoryIconUrl('pantheon')}
          entries={data.pantheonTop10}
          darkMode={darkMode}
        />
        <HomeLeaderboardCard
          title="Solo"
          subtitle="Monthly Commanders"
          artUrl={homeSectionArtUrl('soloBoard')}
          iconUrl={soloLeaderboardIconUrl()}
          entries={soloEntries}
          darkMode={darkMode}
        />
        </div>
      </div>

      <GlassCard
        darkMode={darkMode}
        padding="compact"
        className="d2-today-panel tn-home-today overflow-hidden"
        style={{ ['--tn-home-today-art' as string]: `url('${todayArt}')` }}
      >
        <div className="tn-home-today-inner">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4 items-start mb-4">
            <div>
              <SectionTitle
                title="Today in Destiny"
                subtitle={data.weeklyReset.weekLabel}
                darkMode={darkMode}
                compact
              />
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <StatusPill
                  label={data.bungieApiConfigured ? 'Live data' : 'API key needed'}
                  tone={data.bungieApiConfigured ? 'green' : 'neutral'}
                />
                <StatusPill label={data.weeklyReset.resetTimeLabel} tone="neutral" />
              </div>
            </div>
            <ResetCountdown
              {...countdownParts(data.weeklyReset.resetsInMs)}
              label="Weekly reset in"
            />
          </div>

          <div className="tn-weekly-activity-grid">
            {rotationActivityCards(
              featuredRaids,
              featuredDungeons,
              data.weeklyReset.pantheon,
              data.weeklyReset.pantheonIconUrl,
              resetsInLabel,
              darkMode,
              data.weeklyReset.lootByActivity
            )}
          </div>
        </div>
      </GlassCard>

      {data.hallOfFamePreview.length > 0 && (
        <GlassCard darkMode={darkMode}>
          <SectionTitle
            title="Season Hall of Fame preview"
            subtitle="Current leaders — see Leaderboards for full standings"
            iconUrl={leaderboardCategoryIconUrl('raid')}
            darkMode={darkMode}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-2">
            {data.hallOfFamePreview.slice(0, 6).map((winner, i) => (
              <div
                key={`${winner.category}-${winner.rank}-${i}`}
                className="d2-panel-inset px-3 py-2 rounded-lg flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {winner.emblemUrl ? (
                    <ItemIcon iconUrl={winner.emblemUrl} name={winner.displayName} size={32} className="rounded-sm shrink-0" />
                  ) : (
                    <ItemIcon
                      iconUrl={leaderboardCategoryIconUrl(winner.category)}
                      name={winner.category}
                      size={28}
                      className="shrink-0"
                    />
                  )}
                  <span className={cn('text-sm truncate', t.body)}>
                    #{winner.rank} {winner.displayName} {winner.clanTag}
                  </span>
                </div>
                <span className={cn('text-[10px] uppercase shrink-0', t.caption)}>
                  {winner.category.replace(/_/g, ' ')}
                </span>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      <TopLoadoutsByClass
        darkMode={darkMode}
        variant="verified"
        topByClass={data.topVerifiedLoadoutsByClass}
        compact
        title="Top verified loadouts this season"
        subtitle="Unmodified most-used builds from Top Nest PGCR clears"
      />
    </div>
    </>
  )
}
