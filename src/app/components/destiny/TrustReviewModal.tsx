'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import TrustReviewVoteForm from '@/app/components/destiny/TrustReviewVoteForm'
import { getDestinyTheme } from '@/app/components/destiny/destinyTheme'
import { cn } from '@/lib/utils'

interface Props {
  darkMode: boolean
  runId: string
  activityName: string
  displayName: string
  siteUserId?: string
  membershipId: string
  onClose: () => void
  onSubmitted: () => void
}

export default function TrustReviewModal({
  darkMode,
  runId,
  activityName,
  displayName,
  siteUserId,
  membershipId,
  onClose,
  onSubmitted,
}: Props) {
  const t = getDestinyTheme(darkMode)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        className={cn(
          'w-full max-w-lg rounded-2xl p-5 ring-1 ring-white/10 shadow-2xl',
          darkMode ? 'bg-[#161922]' : 'bg-white'
        )}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 className={cn('text-lg font-semibold', t.heading)}>Rank {displayName}</h3>
            <p className={cn('text-xs mt-1', t.muted)}>
              {activityName} · Individual votes stay private
            </p>
          </div>
          <button type="button" onClick={onClose} className={cn('p-1 rounded-lg', t.muted)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <TrustReviewVoteForm
          darkMode={darkMode}
          runId={runId}
          siteUserId={siteUserId}
          membershipId={membershipId}
          displayName={displayName}
          onSubmitted={onSubmitted}
        />
      </div>
    </div>
  )
}
