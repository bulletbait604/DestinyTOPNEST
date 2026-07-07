'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, Search, ShieldAlert, X } from 'lucide-react'
import type { AdminReviewRecord, RunRecord } from '@/lib/destiny/types'
import { GlassCard, LoadingBlock, SectionTitle, StatusPill } from '@/app/components/destiny/DestinyUi'
import { formatDuration, getDestinyTheme } from '@/app/components/destiny/destinyTheme'
import { cn } from '@/lib/utils'

type ReviewMode = 'pending' | 'all'

const STATUS_FILTERS = [
  { value: 'all', label: 'All statuses' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'flagged', label: 'Flagged' },
  { value: 'verified', label: 'Verified' },
  { value: 'pending', label: 'Pending' },
] as const

const TYPE_FILTERS = [
  { value: 'all', label: 'All types' },
  { value: 'raid', label: 'Raids' },
  { value: 'dungeon', label: 'Dungeons' },
  { value: 'pantheon', label: 'Pantheon' },
] as const

function verificationTone(status?: RunRecord['verificationStatus']) {
  if (status === 'verified') return 'green' as const
  if (status === 'rejected') return 'red' as const
  if (status === 'flagged') return 'gold' as const
  return 'neutral' as const
}

function RunReviewCard({
  darkMode,
  run,
  suspiciousScore,
  aiSummary,
  aiReasons,
  acting,
  notes,
  onNotesChange,
  onDecide,
}: {
  darkMode: boolean
  run: RunRecord
  suspiciousScore?: number
  aiSummary?: string
  aiReasons?: string[]
  acting: boolean
  notes: string
  onNotesChange: (value: string) => void
  onDecide: (decision: string) => void
}) {
  const t = getDestinyTheme(darkMode)

  return (
    <div className="rounded-xl p-4 bg-black/30 border border-white/10">
      <div className="flex flex-wrap justify-between gap-2">
        <div>
          <p className="text-white font-semibold">{run.activityName}</p>
          <p className={cn('text-xs', t.muted)}>
            {run.ownerDisplayName ?? run.ownerUserId ?? 'Unknown guardian'} · PGCR {run.pgcrId} ·{' '}
            {run.durationSeconds != null && run.durationSeconds >= 0
              ? formatDuration(run.durationSeconds)
              : '—'}
            {run.pointsAwarded != null ? ` · ${run.pointsAwarded} pts` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusPill label={run.type} tone="purple" />
          <StatusPill label={run.verificationStatus} tone={verificationTone(run.verificationStatus)} />
          {suspiciousScore != null ? (
            <StatusPill
              label={`Suspicious ${suspiciousScore}`}
              tone={suspiciousScore >= 70 ? 'red' : 'gold'}
            />
          ) : null}
        </div>
      </div>

      {run.teamMembers?.length ? (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className={cn('text-left', t.muted)}>
                <th className="pr-3 py-1">Guardian</th>
                <th className="pr-3 py-1">K</th>
                <th className="pr-3 py-1">D</th>
                <th className="pr-3 py-1">A</th>
                <th className="pr-3 py-1">Score</th>
                <th className="py-1">Power</th>
              </tr>
            </thead>
            <tbody>
              {run.teamMembers.map((member) => (
                <tr key={member.membershipId} className="text-white/90">
                  <td className="pr-3 py-1">{member.displayName}</td>
                  <td className="pr-3 py-1">{member.kills}</td>
                  <td className="pr-3 py-1">{member.deaths}</td>
                  <td className="pr-3 py-1">{member.assists}</td>
                  <td className="pr-3 py-1">{member.score}</td>
                  <td className="py-1">{member.powerLevel || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {aiSummary ? <p className={cn('text-sm mt-2', t.muted)}>{aiSummary}</p> : null}
      {aiReasons?.length ? (
        <p className={cn('text-xs mt-1', t.purple)}>AI: {aiReasons.join('; ')}</p>
      ) : null}
      {run.adminNotes ? (
        <p className={cn('text-xs mt-1', t.muted)}>Staff notes: {run.adminNotes}</p>
      ) : null}

      <textarea
        value={notes}
        onChange={(e) => onNotesChange(e.target.value)}
        placeholder="Optional staff notes…"
        rows={2}
        className="mt-3 w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-xs text-white placeholder:text-gray-500"
      />
      <div className="flex flex-wrap gap-2 mt-3">
        <button
          type="button"
          disabled={acting}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-emerald-500/20 text-emerald-200 border border-emerald-500/40"
          onClick={() => onDecide('approve')}
        >
          <Check className="w-3 h-3" /> Approve
        </button>
        <button
          type="button"
          disabled={acting}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-red-500/20 text-red-200 border border-red-500/40"
          onClick={() => onDecide('reject')}
        >
          <X className="w-3 h-3" /> Reject
        </button>
        <button
          type="button"
          disabled={acting}
          className="px-3 py-1.5 rounded-lg text-xs bg-white/5 text-gray-300 border border-white/10"
          onClick={() => onDecide('checkpoint_non_scoring')}
        >
          Checkpoint (no score)
        </button>
      </div>
    </div>
  )
}

export default function AdminRunReviewSection({
  darkMode,
  onReviewed,
}: {
  darkMode: boolean
  onReviewed?: () => void
}) {
  const [mode, setMode] = useState<ReviewMode>('pending')
  const [queue, setQueue] = useState<AdminReviewRecord[]>([])
  const [allRuns, setAllRuns] = useState<RunRecord[]>([])
  const [totalRuns, setTotalRuns] = useState(0)
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]['value']>('all')
  const [typeFilter, setTypeFilter] = useState<(typeof TYPE_FILTERS)[number]['value']>('all')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<string | null>(null)
  const [notesByKey, setNotesByKey] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const t = getDestinyTheme(darkMode)
  const pageSize = 40

  const loadPending = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/destiny/admin/review', { credentials: 'include' })
      if (!res.ok) {
        setError(res.status === 403 ? 'Admin access required.' : 'Failed to load review queue.')
        return
      }
      const json = await res.json()
      setQueue(json.queue ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  const loadAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        status: statusFilter,
        type: typeFilter,
        limit: String(pageSize),
        offset: String(offset),
      })
      if (search.trim()) params.set('q', search.trim())

      const res = await fetch(`/api/destiny/admin/runs?${params.toString()}`, { credentials: 'include' })
      if (!res.ok) {
        setError(res.status === 403 ? 'Admin access required.' : 'Failed to load runs.')
        return
      }
      const json = await res.json()
      setAllRuns(json.runs ?? [])
      setTotalRuns(json.total ?? 0)
    } finally {
      setLoading(false)
    }
  }, [offset, search, statusFilter, typeFilter])

  useEffect(() => {
    if (mode === 'pending') {
      void loadPending()
    } else {
      void loadAll()
    }
  }, [mode, loadPending, loadAll])

  async function decidePending(reviewId: string, decision: string) {
    setActing(reviewId)
    setError(null)
    try {
      const res = await fetch('/api/destiny/admin/review', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewId,
          decision,
          notes: notesByKey[reviewId]?.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setError(json.error ?? 'Review action failed.')
        return
      }
      setQueue((q) => q.filter((r) => r.id !== reviewId))
      onReviewed?.()
    } finally {
      setActing(null)
    }
  }

  async function decideRun(runId: string, decision: string) {
    setActing(runId)
    setError(null)
    try {
      const res = await fetch('/api/destiny/admin/runs', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          runId,
          decision,
          notes: notesByKey[runId]?.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setError(json.error ?? 'Review action failed.')
        return
      }
      await loadAll()
      onReviewed?.()
    } finally {
      setActing(null)
    }
  }

  const page = Math.floor(offset / pageSize) + 1
  const totalPages = Math.max(1, Math.ceil(totalRuns / pageSize))

  return (
    <GlassCard darkMode={darkMode}>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-red-400" />
          <SectionTitle
            title="Run review"
            subtitle="Review flagged runs or browse every synced activity"
            darkMode={darkMode}
          />
        </div>
        <div className="flex rounded-lg border border-white/10 overflow-hidden text-xs">
          <button
            type="button"
            className={cn(
              'px-3 py-1.5',
              mode === 'pending' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'
            )}
            onClick={() => setMode('pending')}
          >
            Pending queue
          </button>
          <button
            type="button"
            className={cn(
              'px-3 py-1.5',
              mode === 'all' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'
            )}
            onClick={() => {
              setMode('all')
              setOffset(0)
            }}
          >
            All runs
          </button>
        </div>
      </div>

      {mode === 'all' ? (
        <div className="flex flex-wrap gap-2 mb-4">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as (typeof STATUS_FILTERS)[number]['value'])
              setOffset(0)
            }}
            className="rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-xs text-white"
          >
            {STATUS_FILTERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value as (typeof TYPE_FILTERS)[number]['value'])
              setOffset(0)
            }}
            className="rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-xs text-white"
          >
            {TYPE_FILTERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="flex flex-1 min-w-[220px] items-center gap-2 rounded-lg bg-black/40 border border-white/10 px-3 py-2">
            <Search className="w-4 h-4 text-gray-500" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setSearch(searchInput)
                  setOffset(0)
                }
              }}
              placeholder="Search activity, guardian, PGCR…"
              className="flex-1 bg-transparent text-xs text-white placeholder:text-gray-500 outline-none"
            />
            <button
              type="button"
              className="text-xs text-purple-300 hover:text-purple-200"
              onClick={() => {
                setSearch(searchInput)
                setOffset(0)
              }}
            >
              Search
            </button>
          </div>
        </div>
      ) : null}

      {error ? <p className="text-red-400 text-sm mb-3">{error}</p> : null}

      {loading ? (
        <LoadingBlock darkMode={darkMode} label={mode === 'pending' ? 'Loading flagged runs…' : 'Loading runs…'} />
      ) : mode === 'pending' ? (
        !queue.length ? (
          <p className={t.muted}>No runs pending review.</p>
        ) : (
          <div className="space-y-3">
            {queue.map((review) => {
              const run = review.run
              if (!run) return null
              return (
                <RunReviewCard
                  key={review.id}
                  darkMode={darkMode}
                  run={run}
                  suspiciousScore={review.suspiciousScore}
                  aiSummary={review.aiSummary}
                  aiReasons={run.aiReview?.reasons}
                  acting={acting === review.id}
                  notes={notesByKey[review.id] ?? ''}
                  onNotesChange={(value) =>
                    setNotesByKey((prev) => ({ ...prev, [review.id]: value }))
                  }
                  onDecide={(decision) => void decidePending(review.id, decision)}
                />
              )
            })}
          </div>
        )
      ) : !allRuns.length ? (
        <p className={t.muted}>No runs match your filters.</p>
      ) : (
        <>
          <p className={cn('text-xs mb-3', t.muted)}>
            Showing {offset + 1}–{Math.min(offset + allRuns.length, totalRuns)} of {totalRuns} runs
          </p>
          <div className="space-y-3">
            {allRuns.map((run) => (
              <RunReviewCard
                key={run.id}
                darkMode={darkMode}
                run={run}
                suspiciousScore={run.suspiciousScore}
                aiSummary={run.aiReview?.summary}
                aiReasons={run.aiReview?.reasons}
                acting={acting === run.id}
                notes={notesByKey[run.id] ?? ''}
                onNotesChange={(value) => setNotesByKey((prev) => ({ ...prev, [run.id]: value }))}
                onDecide={(decision) => void decideRun(run.id, decision)}
              />
            ))}
          </div>
          {totalPages > 1 ? (
            <div className="flex items-center justify-between mt-4">
              <button
                type="button"
                disabled={offset <= 0}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs border border-white/10 text-gray-300 disabled:opacity-40"
                onClick={() => setOffset((value) => Math.max(0, value - pageSize))}
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>
              <span className={cn('text-xs', t.muted)}>
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                disabled={offset + pageSize >= totalRuns}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs border border-white/10 text-gray-300 disabled:opacity-40"
                onClick={() => setOffset((value) => value + pageSize)}
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ) : null}
        </>
      )}
    </GlassCard>
  )
}
