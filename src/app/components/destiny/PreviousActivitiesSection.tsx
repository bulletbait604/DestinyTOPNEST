'use client'

import { useCallback, useEffect, useState } from 'react'
import { ChevronDown, Crown, Loader2, Star } from 'lucide-react'
import type { ActivityRunForVote } from '@/lib/destiny/types'
import {
  EmptyBlock,
  GlassCard,
  StatusPill,
} from '@/app/components/destiny/DestinyUi'
import { destinyPrimaryBtn, formatDuration, getDestinyTheme } from '@/app/components/destiny/destinyTheme'
import { useBungieLink } from '@/hooks/useBungieLink'
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

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/destiny/runs', { credentials: 'include' })
      if (res.ok) {
        const json = await res.json()
        setActivities(json.activities ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load, bungie.linked])

  const submitVote = async (runId: string, selectedUserId: string) => {
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
      if (!res.ok) throw new Error(json.error ?? 'Vote failed')
      setMessage(json.message ?? 'MVP vote recorded.')
      await load()
      setExpandedRunId(null)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Vote failed')
    } finally {
      setVotingRunId(null)
    }
  }

  return (
    <div className="space-y-4">
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
          hint="Sync runs from Home after linking Bungie. Only verified clears appear here."
        />
      ) : (
        <div className="space-y-2">
          {activities.map((run) => {
            const expanded = expandedRunId === run.runId
            const votable = run.guardians.filter((g) => g.canVoteFor)
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
                  <div className="min-w-0 flex-1">
                    <p className={cn('text-sm font-semibold truncate', t.heading)}>{run.activityName}</p>
                    <p className={cn('text-xs mt-0.5', t.muted)}>
                      {new Date(run.completedAt).toLocaleDateString()} · {formatDuration(run.durationSeconds)} ·{' '}
                      {run.type}
                    </p>
                  </div>
                  {run.userHasVoted ? (
                    <StatusPill
                      label={`MVP: ${run.selectedDisplayName ?? 'voted'}`}
                      tone="gold"
                    />
                  ) : votable.length > 0 ? (
                    <StatusPill label="Vote MVP" tone="blue" />
                  ) : (
                    <StatusPill label="No linked teammates" tone="neutral" />
                  )}
                </button>

                {expanded ? (
                  <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-2">
                    <p className={cn('text-xs uppercase tracking-wide', t.caption)}>
                      Fireteam — select your MVP (+3 pts for them, +1 pt for you)
                    </p>
                    {run.guardians.map((guardian) => (
                      <div
                        key={guardian.membershipId}
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
                            onClick={() => void submitVote(run.runId, guardian.siteUserId!)}
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
                        ) : null}
                      </div>
                    ))}
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
