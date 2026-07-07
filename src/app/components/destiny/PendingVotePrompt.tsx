'use client'

import { Crown, Star, Users, X } from 'lucide-react'
import { getDestinyTheme } from '@/app/components/destiny/destinyTheme'
import type { PendingRunActions } from '@/lib/destiny/pendingRunActions'
import { cn } from '@/lib/utils'

interface Props {
  darkMode: boolean
  pending: PendingRunActions
  onGoToActivities: () => void
  onDismiss: () => void
}

export default function PendingVotePrompt({ darkMode, pending, onGoToActivities, onDismiss }: Props) {
  const t = getDestinyTheme(darkMode)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm">
      <div
        className={cn(
          'relative w-full max-w-md rounded-2xl p-5 ring-1 ring-amber-400/25 shadow-2xl',
          'bg-gradient-to-b from-[#1a1f2e] to-[#12151d]'
        )}
        role="dialog"
        aria-labelledby="pending-vote-title"
      >
        <button
          type="button"
          onClick={onDismiss}
          className={cn('absolute top-3 right-3 p-1 rounded-lg', t.muted)}
          aria-label="Dismiss"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-3">
          <Crown className="w-5 h-5 text-amber-300" />
          <h3 id="pending-vote-title" className={cn('text-lg font-bold', t.heading)}>
            Post-run votes waiting
          </h3>
        </div>

        <p className={cn('text-sm leading-relaxed mb-4', t.body)}>
          You have verified activities that still need your input. Head to{' '}
          <span className="text-amber-200 font-medium">Previous Activities</span> to pick an MVP and
          rank each fireteam member on Knowledge + Vibes (trust ranks stay private).
        </p>

        <ul className="space-y-2 mb-5">
          {pending.mvpRunCount > 0 ? (
            <li className="flex items-center gap-2 rounded-lg bg-black/30 px-3 py-2 ring-1 ring-white/[0.06]">
              <Star className="w-4 h-4 text-sky-300 shrink-0" />
              <span className={cn('text-sm', t.body)}>
                {pending.mvpRunCount} activit{pending.mvpRunCount === 1 ? 'y' : 'ies'} need an MVP vote
              </span>
            </li>
          ) : null}
          {pending.trustReviewCount > 0 ? (
            <li className="flex items-center gap-2 rounded-lg bg-black/30 px-3 py-2 ring-1 ring-white/[0.06]">
              <Users className="w-4 h-4 text-violet-300 shrink-0" />
              <span className={cn('text-sm', t.body)}>
                {pending.trustReviewCount} fireteam commend{pending.trustReviewCount === 1 ? '' : 's'}{' '}
                pending (Knowledge + Vibes)
              </span>
            </li>
          ) : null}
        </ul>

        <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={onGoToActivities}
            className={cn(
              'flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold',
              'bg-amber-400/20 text-amber-100 ring-1 ring-amber-400/35 hover:bg-amber-400/30'
            )}
          >
            <Crown className="w-4 h-4" />
            Go to Previous Activities
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className={cn('px-4 py-2.5 rounded-xl text-sm ring-1 ring-white/10', t.muted)}
          >
            Later
          </button>
        </div>
      </div>
    </div>
  )
}
