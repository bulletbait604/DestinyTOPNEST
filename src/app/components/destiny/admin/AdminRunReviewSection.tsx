'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, ShieldAlert, X } from 'lucide-react'
import type { AdminReviewRecord } from '@/lib/destiny/types'
import { GlassCard, LoadingBlock, SectionTitle, StatusPill } from '@/app/components/destiny/DestinyUi'
import { formatDuration, getDestinyTheme } from '@/app/components/destiny/destinyTheme'
import { cn } from '@/lib/utils'

export default function AdminRunReviewSection({
  darkMode,
  onReviewed,
}: {
  darkMode: boolean
  onReviewed?: () => void
}) {
  const [queue, setQueue] = useState<AdminReviewRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<string | null>(null)
  const [notesByReview, setNotesByReview] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const t = getDestinyTheme(darkMode)

  const load = useCallback(async () => {
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

  useEffect(() => {
    void load()
  }, [load])

  async function decide(reviewId: string, decision: string) {
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
          notes: notesByReview[reviewId]?.trim() || undefined,
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

  if (loading) return <LoadingBlock darkMode={darkMode} label="Loading flagged runs…" />

  return (
    <GlassCard darkMode={darkMode}>
      <div className="flex items-center gap-2 mb-2">
        <ShieldAlert className="w-5 h-5 text-red-400" />
        <SectionTitle
          title="Run review"
          subtitle="Manually approve, reject, or mark checkpoint runs"
          darkMode={darkMode}
        />
      </div>

      {error ? <p className="text-red-400 text-sm mb-3">{error}</p> : null}

      {!queue.length ? (
        <p className={t.muted}>No runs pending review.</p>
      ) : (
        <div className="space-y-3">
          {queue.map((review) => {
            const run = review.run
            return (
              <div key={review.id} className="rounded-xl p-4 bg-black/30 border border-red-500/20">
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <p className="text-white font-semibold">{run?.activityName ?? 'Unknown activity'}</p>
                    <p className={cn('text-xs', t.muted)}>
                      {run?.ownerDisplayName ?? run?.ownerUserId ?? 'Unknown guardian'} · PGCR {run?.pgcrId} ·{' '}
                      {run?.durationSeconds ? formatDuration(run.durationSeconds) : '—'}
                    </p>
                  </div>
                  <StatusPill
                    label={`Suspicious ${review.suspiciousScore}`}
                    tone={review.suspiciousScore >= 70 ? 'red' : 'gold'}
                  />
                </div>
                <p className={cn('text-sm mt-2', t.muted)}>{review.aiSummary}</p>
                {run?.aiReview ? (
                  <p className={cn('text-xs mt-1', t.purple)}>
                    AI: {run.aiReview.recommendation} — {run.aiReview.reasons.join('; ')}
                  </p>
                ) : null}
                <textarea
                  value={notesByReview[review.id] ?? ''}
                  onChange={(e) =>
                    setNotesByReview((prev) => ({ ...prev, [review.id]: e.target.value }))
                  }
                  placeholder="Optional staff notes…"
                  rows={2}
                  className="mt-3 w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-xs text-white placeholder:text-gray-500"
                />
                <div className="flex flex-wrap gap-2 mt-3">
                  <button
                    type="button"
                    disabled={acting === review.id}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-emerald-500/20 text-emerald-200 border border-emerald-500/40"
                    onClick={() => void decide(review.id, 'approve')}
                  >
                    <Check className="w-3 h-3" /> Approve
                  </button>
                  <button
                    type="button"
                    disabled={acting === review.id}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-red-500/20 text-red-200 border border-red-500/40"
                    onClick={() => void decide(review.id, 'reject')}
                  >
                    <X className="w-3 h-3" /> Reject
                  </button>
                  <button
                    type="button"
                    disabled={acting === review.id}
                    className="px-3 py-1.5 rounded-lg text-xs bg-white/5 text-gray-300 border border-white/10"
                    onClick={() => void decide(review.id, 'checkpoint_non_scoring')}
                  >
                    Checkpoint (no score)
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </GlassCard>
  )
}
