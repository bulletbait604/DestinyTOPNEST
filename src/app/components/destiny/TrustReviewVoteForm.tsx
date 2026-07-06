'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import {
  KNOWLEDGE_VOTE_LABELS,
  VIBES_OPTIONS,
  type KnowledgeScore,
  type VibesLabel,
} from '@/lib/destiny/trustRank'
import { destinyPrimaryBtn, getDestinyTheme } from '@/app/components/destiny/destinyTheme'
import { cn } from '@/lib/utils'

interface Props {
  darkMode: boolean
  runId: string
  siteUserId?: string
  membershipId: string
  displayName: string
  compact?: boolean
  onSubmitted: () => void
}

export default function TrustReviewVoteForm({
  darkMode,
  runId,
  siteUserId,
  membershipId,
  displayName,
  compact = false,
  onSubmitted,
}: Props) {
  const t = getDestinyTheme(darkMode)
  const [knowledge, setKnowledge] = useState<KnowledgeScore>(3)
  const [vibes, setVibes] = useState<VibesLabel>('good')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/destiny/trust', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewedUserId: siteUserId,
          reviewedMembershipId: membershipId,
          runId,
          knowledge,
          vibes,
        }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? 'Could not submit rank')
      }
      onSubmitted()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submit failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className={cn(
        'rounded-xl ring-1 ring-white/10 bg-black/25 space-y-3',
        compact ? 'p-3' : 'p-4'
      )}
    >
      <p className={cn('text-xs font-semibold', t.heading)}>
        Rank {displayName}
        <span className={cn('font-normal ml-1', t.muted)}>· votes stay private</span>
      </p>

      <div>
        <p className={cn('text-[10px] font-bold uppercase tracking-wide mb-1.5', t.gold)}>Knowledge (1–5)</p>
        <div className="flex flex-wrap gap-1.5">
          {([1, 2, 3, 4, 5] as KnowledgeScore[]).map((score) => (
            <button
              key={score}
              type="button"
              title={KNOWLEDGE_VOTE_LABELS[score]}
              onClick={() => setKnowledge(score)}
              className={cn(
                'min-w-[2rem] px-2 py-1 rounded-lg text-xs font-bold ring-1 transition',
                knowledge === score
                  ? 'ring-amber-400/50 bg-amber-400/15 text-amber-100'
                  : 'ring-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.06]'
              )}
            >
              {score}
            </button>
          ))}
        </div>
        <p className={cn('text-[11px] mt-1.5', t.muted)}>{KNOWLEDGE_VOTE_LABELS[knowledge]}</p>
      </div>

      <div>
        <p className={cn('text-[10px] font-bold uppercase tracking-wide mb-1.5', t.purple)}>Vibes</p>
        <div className="flex flex-wrap gap-1.5">
          {VIBES_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              title={option.hint}
              onClick={() => setVibes(option.id)}
              className={cn(
                'px-2.5 py-1 rounded-lg text-xs font-semibold ring-1 transition',
                vibes === option.id
                  ? 'ring-violet-400/50 bg-violet-400/15 text-violet-100'
                  : 'ring-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.06]'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        <p className={cn('text-[11px] mt-1.5', t.muted)}>
          {VIBES_OPTIONS.find((o) => o.id === vibes)?.hint}
        </p>
      </div>

      {error ? <p className="text-xs text-red-300">{error}</p> : null}

      <button
        type="button"
        disabled={saving}
        onClick={() => void submit()}
        className={cn(destinyPrimaryBtn(darkMode), 'w-full text-xs py-2 justify-center')}
      >
        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Submit rank'}
      </button>
    </div>
  )
}
