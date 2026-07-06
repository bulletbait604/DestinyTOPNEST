'use client'

import { useEffect } from 'react'
import type { PlayerProfile } from '@/lib/destiny/types'
import PlayerCardCompact from '@/app/components/destiny/PlayerCardCompact'
import { useBungieLink } from '@/hooks/useBungieLink'
import { useProfileData } from '@/contexts/ProfileDataContext'

interface Props {
  darkMode: boolean
  size?: 'featured' | 'compact'
  onProfileLoaded?: (profile: PlayerProfile | null) => void
}

/** Compact player banner — summary only (no loadout fetch). */
export default function PlayerCardShell({ darkMode, size = 'featured', onProfileLoaded }: Props) {
  const { summaryProfile, summaryLoading, ensureSummaryProfile } = useProfileData()
  const bungie = useBungieLink()

  useEffect(() => {
    if (bungie.linked) {
      void ensureSummaryProfile().then((profile) => onProfileLoaded?.(profile))
    } else {
      onProfileLoaded?.(null)
    }
  }, [bungie.linked, ensureSummaryProfile, onProfileLoaded])

  useEffect(() => {
    onProfileLoaded?.(summaryProfile)
  }, [summaryProfile, onProfileLoaded])

  const loading = summaryLoading && !summaryProfile

  return (
    <div className="w-full min-w-0">
      <PlayerCardCompact
        profile={summaryProfile}
        darkMode={darkMode}
        linked={bungie.linked}
        loading={loading}
        size={size}
      />
    </div>
  )
}
