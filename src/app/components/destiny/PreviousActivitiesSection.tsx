'use client'

import { useCallback, useEffect, useState } from 'react'
import { ChevronDown, Crown, Loader2, Star, Users } from 'lucide-react'
import type { ActivityRunForVote } from '@/lib/destiny/types'
import {
  EmptyBlock,
  GlassCard,
  ItemIcon,
  SectionTitle,
  StatusPill,
} from '@/app/components/destiny/DestinyUi'
import { ItemExternalLink, ItemLink } from '@/app/components/destiny/ItemLink'
import TrustReviewVoteForm from '@/app/components/destiny/TrustReviewVoteForm'
import { destinyPrimaryBtn, formatDuration, getDestinyTheme } from '@/app/components/destiny/destinyTheme'
import { useBungieLink } from '@/contexts/BungieLinkContext'
import { OVERVIEW_REFRESH_EVENT } from '@/lib/destiny/syncEvents'
import { cn } from '@/lib/utils'

interface Props {
  darkMode: boolean
}

export default function PreviousActivitiesSection({ darkMode }: Props) {
  const [activities, setActivities] = useState<ActivityRunForVote[]>([])
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [votingRunId, setVotingRunId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const bungie = useBungieLink()
  const t = getDestinyTheme(darkMode)

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true)
    try {
      const res = await fetch('/api/destiny/runs', { credentials: 'include' })
      if (res.ok) {
        const json = await res.json()
        setActivities(json.activities ?? [])
      }
    } finally {
      if (!opts?.silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load, bungie.linked])

  useEffect(() => {
    const onRefresh = () => void load({ silent: true })
    window.addEventListener(OVERVIEW_REFRESH_EVENT, onRefresh)
    return () => window.removeEventListener(OVERVIEW_REFRESH_EVENT, onRefresh)
  }, [load])

  const submitMvpVote = async (runId: string, selectedUserId: string) => {
    setVotingRunId(runId)
    setMessage(null)
    try {
      const res = await fetch('/api/destiny/mvp', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId, selectedUserId }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? 'MVP vote failed')
      setMessage(json.message ?? 'MVP vote recorded.')
      await load({ silent: true })
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'MVP vote failed')
    } finally {
      setVotingRunId(null)
    }
  }

  const onTrustSubmitted = async (label: string) => {
    setMessage(`${label} ranked — Knowledge + Vibes stay private.`)
    await load({ silent: true })
  }

  return (
    <div className="space-y-4">
      <SectionTitle
        title="Previous Activities"
        subtitle="Pick one MVP per run and rank each fireteam member on Knowledge (1–5) and Vibes. MVP votes are public; trust ranks stay private."
        darkMode={darkMode}
      />

      {message ? (
        <p className={cn('text-sm rounded-lg px-3 py-2 ring-1 ring-amber-400/25 bg-amber-400/10 text-amber-100')}>
          {message}
        </p>
      ) : null}

      {loading ? (
        <GlassCard darkMode={darkMode}>
          <div className="flex items-center justify-center gap-2 py-10 text-white/60">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading your activities…
          </div>
        </GlassCard>
      ) : activities.length === 0 ? (
        <EmptyBlock
          darkMode={darkMode}
          message="No verified activities yet"
          hint="Sync runs from Home after linking Bungie. Only verified clears from launch day onward appear here."
        />
      ) : (
        <div className="space-y-2">
          {activities.map((run) => {
            const expanded = expandedRunId === run.runId
            const mvpCandidates = run.guardians.filter((g) => g.canVoteFor)
            const needsMvp = !run.userHasVoted && mvpCandidates.length > 0
            const needsTrust = run.pendingTrustCount > 0

            return (
              <GlassCard key={run.runId} darkMode={darkMode} padding="compact">
                <button
                  type="button"
                  onClick={() => setExpandedRunId(expanded ? null : run.runId)}
                  className="w-full flex items-center gap-3 text-left"
                >
                  <ChevronDown
                    className={cn('w-4 h-4 shrink-0 text-white/50 transition-transform', expanded && 'rotate-180')}
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
                      {run.type}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 justify-end">
                    {run.userHasVoted ? (
                      <StatusPill
                        label={`MVP: ${run.selectedDisplayName ?? 'voted'}`}
                        tone="gold"
                      />
                    ) : needsMvp ? (
                      <StatusPill label="Vote MVP" tone="blue" />
                    ) : null}
                    {needsTrust ? (
                      <StatusPill label={`${run.pendingTrustCount} to rank`} tone="purple" />
                    ) : run.guardians.some((g) => g.canReview) ? (
                      <StatusPill label="All ranked" tone="green" />
                    ) : null}
                  </div>
                </button>

                {expanded ? (
                  <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-4">
                    <div className="space-y-2">
                      <p className={cn('text-xs uppercase tracking-wide flex items-center gap-1.5', t.caption)}>
                        <Star className="w-3.5 h-3.5 text-sky-300" />
                        MVP — pick one linked Top Nest guardian
                      </p>
                      {run.guardians.map((guardian) => (
                        <div
                          key={`mvp-${guardian.membershipId}`}
                          className="flex items-center justify-between gap-2 rounded-lg bg-black/25 px-3 py-2 ring-1 ring-white/[0.06]"
                        >
                          <div className="min-w-0">
                            <p className={cn('text-sm font-medium truncate', t.body)}>
                              {guardian.displayName}
                              {guardian.isSelf ? ' (you)' : ''}
                            </p>
                            <p className={cn('text-[11px] capitalize', t.muted)}>
                              {guardian.characterClass ?? 'guardian'}
                              {!guardian.siteUserId && !guardian.isSelf ? ' · not on Top Nest' : ''}
                            </p>
                          </div>
                          {run.userHasVoted ? (
                            run.selectedUserId === guardian.siteUserId ? (
                              <span className="inline-flex items-center gap-1 text-xs text-amber-200">
                                <Crown className="w-3.5 h-3.5" /> MVP
                              </span>
                            ) : null
                          ) : guardian.canVoteFor ? (
                            <button
                              type="button"
                              disabled={votingRunId === run.runId}
                              onClick={() => void submitMvpVote(run.runId, guardian.siteUserId!)}
                              className={cn(destinyPrimaryBtn(darkMode), 'text-xs px-3 py-1.5 shrink-0')}
                            >
                              {votingRunId === run.runId ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <>
                                  <Star className="w-3.5 h-3.5" /> Vote MVP
                                </>
                              )}
                            </button>
                          ) : guardian.isSelf ? (
                            <StatusPill label="You" tone="neutral" />
                          ) : null}
                        </div>
                      ))}
                      {!run.userHasVoted && mvpCandidates.length === 0 ? (
                        <p className={cn('text-xs', t.muted)}>No linked Top Nest teammates to crown MVP.</p>
                      ) : null}
                    </div>

                    <div className="space-y-3">
                      <p className={cn('text-xs uppercase tracking-wide flex items-center gap-1.5', t.caption)}>
                        <Users className="w-3.5 h-3.5 text-violet-300" />
                        Knowledge + Vibes — rank every teammate (private)
                      </p>
                      {run.guardians
                        .filter((g) => g.canReview)
                        .map((guardian) => (
                          <div key={`trust-${guardian.membershipId}`} className="space-y-2">
                            <div className="flex items-center justify-between gap-2 rounded-lg bg-black/25 px-3 py-2 ring-1 ring-violet-500/15">
                              <div className="min-w-0">
                                <p className={cn('text-sm font-medium truncate', t.body)}>
                                  {guardian.displayName}
                                </p>
                                <p className={cn('text-[11px] capitalize', t.muted)}>
                                  {guardian.characterClass ?? 'guardian'}
                                </p>
                              </div>
                              {guardian.alreadyReviewed ? (
                                <StatusPill label="Ranked" tone="green" />
                              ) : (
                                <StatusPill label="Needs rank" tone="purple" />
                              )}
                            </div>
                            {!guardian.alreadyReviewed ? (
                              <TrustReviewVoteForm
                                darkMode={darkMode}
                                runId={run.runId}
                                siteUserId={guardian.siteUserId}
                                membershipId={guardian.membershipId}
                                displayName={guardian.displayName}
                                compact
                                onSubmitted={() => void onTrustSubmitted(guardian.displayName)}
                              />
                            ) : null}
                          </div>
                        ))}
                    </div>
                  </div>
                ) : null}
              </GlassCard>
            )
          })}
        </div>
      )}
    </div>
  )
}
