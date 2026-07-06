'use client'

import { useCallback, useEffect, useState } from 'react'
import type { FeaturedActivity, OverviewPayload } from '@/lib/destiny/types'
import ActivityIntelAccordion from '@/app/components/destiny/ActivityIntelAccordion'
import HomeLeaderboardCard from '@/app/components/destiny/HomeLeaderboardCard'
import { ItemExternalLink, ItemLink } from '@/app/components/destiny/ItemLink'
import {
  GlassCard,
  ItemIcon,
  LoadingBlock,
  ResetCountdown,
  SectionTitle,
  StatCard,
  StatusPill,
} from '@/app/components/destiny/DestinyUi'
import { cn } from '@/lib/utils'
import { formatDuration, getDestinyTheme } from '@/app/components/destiny/destinyTheme'
import TopLoadoutsByClass from '@/app/components/destiny/TopLoadoutsByClass'
import PendingVotePrompt from '@/app/components/destiny/PendingVotePrompt'
import { homeSectionArtUrl, soloLeaderboardIconUrl } from '@/lib/destiny/navArt'
import { leaderboardCategoryIconUrl } from '@/lib/destiny/activityIconPaths'
import { OVERVIEW_REFRESH_EVENT } from '@/lib/destiny/syncEvents'

function countdownParts(ms: number) {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  return {
    days: Math.floor(totalSec / 86400),
    hours: Math.floor((totalSec % 86400) / 3600),
    minutes: Math.floor((totalSec % 3600) / 60),
  }
}

function rotationStatCards(
  raids: FeaturedActivity[],
  dungeons: FeaturedActivity[],
  resetsIn: string,
  darkMode: boolean
) {
  const cards: { label: string; activity: FeaturedActivity; kind: 'raid' | 'dungeon' }[] = [
    { label: 'Weekly raid', activity: raids[0], kind: 'raid' },
    { label: 'Weekly raid', activity: raids[1], kind: 'raid' },
    { label: 'Weekly dungeon', activity: dungeons[0], kind: 'dungeon' },
    { label: 'Weekly dungeon', activity: dungeons[1], kind: 'dungeon' },
  ]

  return cards
    .filter((c) => c.activity?.name)
    .map((c, i) => (
      <StatCard
        key={`${c.kind}-${c.activity.name}-${i}`}
        darkMode={darkMode}
        label={c.label}
        value={c.activity.name}
        iconUrl={c.activity.iconUrl}
        sub={`${c.kind === 'raid' ? 'Raid' : 'Dungeon'} · Resets ${resetsIn}`}
      />
    ))
}

const PENDING_VOTE_DISMISS_KEY = 'dtn-pending-vote-dismiss'

interface OverviewPanelProps {
  darkMode: boolean
  onGoToActivities?: () => void
}

export default function OverviewPanel({ darkMode, onGoToActivities }: OverviewPanelProps) {
  const [data, setData] = useState<OverviewPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showVotePrompt, setShowVotePrompt] = useState(false)
  const t = getDestinyTheme(darkMode)

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) {
      setError(null)
      setLoading(true)
    }
    try {
      const res = await fetch('/api/destiny/overview', { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to load overview')
      setData(await res.json())
      if (!opts?.silent) setError(null)
    } catch (e) {
      if (!opts?.silent) {
        setError(e instanceof Error ? e.message : 'Load failed')
      }
    } finally {
      if (!opts?.silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const onRefresh = () => void load({ silent: true })
    window.addEventListener(OVERVIEW_REFRESH_EVENT, onRefresh)
    return () => window.removeEventListener(OVERVIEW_REFRESH_EVENT, onRefresh)
  }, [load])

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
              {data.weeklyReset.pantheon && (
                <div className="flex items-center gap-2 mb-1">
                  {data.weeklyReset.pantheonIconUrl ? (
                    <ItemIcon iconUrl={data.weeklyReset.pantheonIconUrl} name="Pantheon" size={28} />
                  ) : null}
                  <p className={cn('text-xs italic', t.purple)}>Pantheon: {data.weeklyReset.pantheon}</p>
                </div>
              )}
            </div>
            <ResetCountdown
              {...countdownParts(data.weeklyReset.resetsInMs)}
              label="Weekly reset in"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 mb-5">
            {rotationStatCards(featuredRaids, featuredDungeons, resetsInLabel, darkMode)}
          </div>

          <ActivityIntelAccordion raids={featuredRaids} dungeons={featuredDungeons} embedded />
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GlassCard darkMode={darkMode}>
          <SectionTitle
            title="Recent Verified Runs"
            subtitle="Today only"
            iconUrl={featuredRaids[0]?.iconUrl ?? data.featuredRaid.iconUrl}
            darkMode={darkMode}
            compact
          />
          <div className="space-y-2">
            {data.recentRuns.length === 0 ? (
              <p className={cn('text-sm py-2', t.muted)}>
                No verified clears logged today yet. Sync from Bungie after your next raid or dungeon.
              </p>
            ) : (
              data.recentRuns.map((run) => (
              <div
                key={run.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-white/5 last:border-0"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <ItemExternalLink
                    item={
                      run.activityRef
                        ? { ...run.activityRef, entityType: 'DestinyActivityDefinition' as const }
                        : undefined
                    }
                    name={run.activityName}
                  >
                    <ItemIcon item={run.activityRef} name={run.activityName} size={32} />
                  </ItemExternalLink>
                  <div>
                    <ItemLink
                      item={
                        run.activityRef
                          ? { ...run.activityRef, entityType: 'DestinyActivityDefinition' as const }
                          : undefined
                      }
                      name={run.activityName}
                      className="text-white text-sm font-medium block"
                    />
                    <p className={cn('text-xs', t.muted)}>
                      {run.type} · {formatDuration(run.durationSeconds)} · +{run.pointsAwarded} pts
                    </p>
                  </div>
                </div>
                <StatusPill
                  label={run.verificationStatus}
                  tone={
                    run.verificationStatus === 'verified'
                      ? 'green'
                      : run.verificationStatus === 'flagged'
                        ? 'red'
                        : 'gold'
                  }
                />
              </div>
            ))
            )}
          </div>
        </GlassCard>

        <GlassCard darkMode={darkMode}>
          <SectionTitle
            title="Looking for Group"
            iconUrl={featuredDungeons[0]?.iconUrl ?? data.featuredDungeon.iconUrl}
            darkMode={darkMode}
          />
          <div className="space-y-2">
            {data.lookingForGroup.map((lobby) => (
              <div key={lobby.id} className="py-2 border-b border-white/5 last:border-0">
                <div className="flex items-start gap-2 justify-between">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <ItemExternalLink
                      item={
                        lobby.activityRef
                          ? { ...lobby.activityRef, entityType: 'DestinyActivityDefinition' as const }
                          : undefined
                      }
                      name={lobby.activityName}
                    >
                      <ItemIcon item={lobby.activityRef} name={lobby.activityName} size={36} />
                    </ItemExternalLink>
                    <div className="min-w-0">
                      <ItemLink
                        item={
                          lobby.activityRef
                            ? { ...lobby.activityRef, entityType: 'DestinyActivityDefinition' as const }
                            : undefined
                        }
                        name={lobby.activityName}
                        className="text-white text-sm font-medium block truncate"
                      />
                      <p className={cn('text-xs', t.muted)}>
                        {lobby.hostDisplayName} · {lobby.goal.replace(/_/g, ' ')}
                      </p>
                    </div>
                  </div>
                  <span className={cn('text-xs shrink-0', t.blue)}>
                    {lobby.currentPlayers}/{lobby.maxPlayers}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {lobby.tags.slice(0, 4).map((tag) => (
                    <StatusPill key={tag} label={tag} tone="purple" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      <TopLoadoutsByClass
        darkMode={darkMode}
        topByClass={data.topLoadoutsByClass}
        compact
        title="Top meta loadouts this season"
        subtitle="Unmodified best builds from Blueberries, light.gg, togame.io, and D2Foundry (June 2026+)"
      />

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
