'use client'

import { useEffect, useRef } from 'react'
import type { CharacterSummary, PlayerProfile } from '@/lib/destiny/types'
import PlayerCardCompact from '@/app/components/destiny/PlayerCardCompact'
import { useBungieLink } from '@/hooks/useBungieLink'
import { useProfileData } from '@/contexts/ProfileDataContext'

interface Props {
  darkMode: boolean
  size?: 'featured' | 'compact'
  onProfileLoaded?: (profile: PlayerProfile | null) => void
  selectable?: boolean
  onCharacterSelect?: (characterId: string) => void
  switchingCharacter?: boolean
  subtitleFor?: (character: CharacterSummary) => string | undefined
}

/** Compact player banner — summary only (no loadout fetch). */
export default function PlayerCardShell({
  darkMode,
  size = 'featured',
  onProfileLoaded,
  selectable = false,
  onCharacterSelect,
  switchingCharacter = false,
  subtitleFor,
}: Props) {
  const { summaryProfile, summaryLoading, ensureSummaryProfile } = useProfileData()
  const bungie = useBungieLink()
  const ensureSummaryProfileRef = useRef(ensureSummaryProfile)
  ensureSummaryProfileRef.current = ensureSummaryProfile

  useEffect(() => {
    if (bungie.linked) {
      void ensureSummaryProfileRef.current().then((profile) => onProfileLoaded?.(profile))
    } else {
      onProfileLoaded?.(null)
    }
  }, [bungie.linked, onProfileLoaded])

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
        selectable={selectable}
        onCharacterSelect={onCharacterSelect}
        switchingCharacter={switchingCharacter}
        subtitleFor={subtitleFor}
      />
    </div>
  )
}
