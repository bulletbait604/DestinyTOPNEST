'use client'

import { useCallback, useState } from 'react'
import { useProfileData } from '@/contexts/ProfileDataContext'

/** Switch active Bungie character and refresh full profile loadout. */
export function useActiveCharacterSelect() {
  const { fullProfile, setFullProfile, ensureFullProfile } = useProfileData()
  const [switchingCharacter, setSwitchingCharacter] = useState(false)

  const selectCharacter = useCallback(
    async (characterId: string) => {
      if (!fullProfile || characterId === fullProfile.activeCharacterId) return
      setSwitchingCharacter(true)
      try {
        const res = await fetch('/api/destiny/profile', {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ activeCharacterId: characterId }),
        })
        if (res.ok) {
          const json = await res.json()
          setFullProfile(json?.profile ?? null)
        } else {
          await ensureFullProfile(characterId, { force: true })
        }
      } finally {
        setSwitchingCharacter(false)
      }
    },
    [ensureFullProfile, fullProfile, setFullProfile]
  )

  const canSwitch = (fullProfile?.characters?.length ?? 0) > 1

  return {
    selectCharacter,
    switchingCharacter,
    canSwitch,
    activeCharacterId: fullProfile?.activeCharacterId,
    characters: fullProfile?.characters ?? [],
  }
}
