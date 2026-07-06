'use client'

import { useCallback, useEffect, useState } from 'react'
import { ChevronDown, Loader2, Users } from 'lucide-react'
import type { UnrankedRun } from '@/lib/destiny/types'
import {
  EmptyBlock,
  GlassCard,
  ItemIcon,
  SectionTitle,
  StatusPill,
} from '@/app/components/destiny/DestinyUi'
import { ItemExternalLink, ItemLink } from '@/app/components/destiny/ItemLink'
import TrustReviewVoteForm from '@/app/components/destiny/TrustReviewVoteForm'
import { formatDuration, getDestinyTheme } from '@/app/components/destiny/destinyTheme'
import { useBungieLink } from '@/hooks/useBungieLink'
import { OVERVIEW_REFRESH_EVENT } from '@/lib/destiny/syncEvents'
import { cn } from '@/lib/utils'

interface Props {
  darkMode: boolean
}

export default function UnrankedRunsSection({ darkMode }: Props) {
  const [runs, setRuns] = useState<UnrankedRun[]>([])
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const bungie = useBungieLink()
  const t = getDestinyTheme(darkMode)

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!bungie.linked) {
      setRuns([])
      setLoading(false)
      return
    }
    if (!opts?.silent) setLoading(true)
    try {
      const res = await fetch('/api/destiny/trust?scope=unranked', { credentials: 'include' })
      if (res.ok) {
        const json = await res.json()
        setRuns(json.unrankedRuns ?? [])
      }
    } finally {
      if (!opts?.silent) setLoading(false)
    }
  }, [bungie.linked])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const onRefresh = () => void load({ silent: true })
    window.addEventListener(OVERVIEW_REFRESH_EVENT, onRefresh)
    return () => window.removeEventListener(OVERVIEW_REFRESH_EVENT, onRefresh)
  }, [load])

  const pendingTotal = runs.reduce((sum, run) => sum + run.pendingReviewCount, 0)

  const onSubmitted = async () => {
    setMessage('Rank submitted — only your Trust Rank aggregate is visible to others.')
    await load({ silent: true })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Users className="w-4 h-4 text-violet-400/80" />
        <SectionTitle
          title="Unranked Runs"
          subtitle="Rate fireteam randos on Knowledge + Vibes. Individual votes stay private — only Trust Rank shows."
          darkMode={darkMode}
        />
      </div>

      {message ? (
        <p className="text-sm rounded-lg px-3 py-2 ring-1 ring-violet-400/25 bg-violet-400/10 text-violet-100">
          {message}
        </p>
      ) : null}

      {loading ? (
        <GlassCard darkMode={darkMode}>
          <div className="flex items-center justify-center gap-2 py-8 text-white/60">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading runs…
          </div>
        </GlassCard>
      ) : runs.length === 0 ? (
        <EmptyBlock
          darkMode={darkMode}
          message="No recorded runs yet"
          hint="Sync verified clears from Home. Runs with linked Top Nest teammates appear here for ranking."
        />
      ) : (
        <>
          {pendingTotal > 0 ? (
            <p className={cn('text-xs', t.muted)}>
              {pendingTotal} teammate rank{pendingTotal === 1 ? '' : 's'} waiting across your recent runs.
            </p>
          ) : (
            <p className={cn('text-xs', t.muted)}>All linked teammates ranked — expand a run to review or re-check.</p>
          )}

          <div className="space-y-2">
            {runs.map((run) => {
              const expanded = expandedRunId === run.runId
              return (
                <GlassCard key={run.runId} darkMode={darkMode} padding="compact">
                  <button
                    type="button"
                    onClick={() => setExpandedRunId(expanded ? null : run.runId)}
                    className="w-full flex items-center gap-3 text-left"
                  >
                    <ChevronDown
                      className={cn(
                        'w-4 h-4 shrink-0 text-white/50 transition-transform',
                        expanded && 'rotate-180'
                      )}
                    />
                    <ItemExternalLink
                      item={
                        run.activityRef
                          ? { ...run.activityRef, entityType: 'DestinyActivityDefinition' as const }
                          : undefined
                      }
                      name={run.activityName}
                    >
                      <ItemIcon item={run.activityRef} name={run.activityName} size={40} />
                    </ItemExternalLink>
                    <div className="min-w-0 flex-1">
                      <ItemLink
                        item={
                          run.activityRef
                            ? { ...run.activityRef, entityType: 'DestinyActivityDefinition' as const }
                            : undefined
                        }
                        name={run.activityName}
                        className={cn('text-sm font-semibold truncate block', t.heading)}
                      />
                      <p className={cn('text-xs mt-0.5', t.muted)}>
                        {new Date(run.completedAt).toLocaleDateString()} · {formatDuration(run.durationSeconds)} ·{' '}
                        {run.type} · {run.teammates.length} players
                      </p>
                    </div>
                    {run.pendingReviewCount > 0 ? (
                      <StatusPill label={`${run.pendingReviewCount} to rank`} tone="purple" />
                    ) : (
                      <StatusPill label="All ranked" tone="green" />
                    )}
                  </button>

                  {expanded ? (
                    <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-3">
                      {run.teammates.map((teammate) => (
                        <div key={teammate.membershipId} className="space-y-2">
                          <div className="flex items-center justify-between gap-2 rounded-lg bg-black/25 px-3 py-2 ring-1 ring-white/[0.06]">
                            <div className="min-w-0">
                              <p className={cn('text-sm font-medium truncate', t.body)}>
                                {teammate.displayName}
                                {teammate.isSelf ? ' (you)' : ''}
                              </p>
                              <p className={cn('text-[11px] capitalize', t.muted)}>
                                {teammate.characterClass ?? 'guardian'}
                                {!teammate.siteUserId && !teammate.isSelf ? ' · not on Top Nest' : ''}
                              </p>
                            </div>
                            {teammate.isSelf ? (
                              <StatusPill label="You" tone="neutral" />
                            ) : teammate.alreadyReviewed ? (
                              <StatusPill label="Ranked" tone="green" />
                            ) : teammate.canReview ? (
                              <StatusPill label="Needs rank" tone="purple" />
                            ) : (
                              <StatusPill label="Can't rank" tone="neutral" />
                            )}
                          </div>

                          {teammate.canReview && !teammate.alreadyReviewed && teammate.siteUserId ? (
                            <TrustReviewVoteForm
                              darkMode={darkMode}
                              runId={run.runId}
                              siteUserId={teammate.siteUserId}
                              membershipId={teammate.membershipId}
                              displayName={teammate.displayName}
                              compact
                              onSubmitted={() => void onSubmitted()}
                            />
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </GlassCard>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
