'use client'

import { QuickRateForm } from '@/app/components/hub/QuickRate'

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
  runId,
  membershipId,
  displayName,
  compact = false,
  onSubmitted,
}: Props) {
  return (
    <QuickRateForm
      compact={compact}
      signedIn
      target={{ membershipId, displayName, runId }}
      onSubmitted={onSubmitted}
    />
  )
}
