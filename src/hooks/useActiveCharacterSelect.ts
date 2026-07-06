'use client'

import { useProfileData } from '@/contexts/ProfileDataContext'

/** Switch active Bungie character and refresh full profile loadout. */
export function useActiveCharacterSelect() {
  const { fullProfile, switchingCharacter, selectActiveCharacter } = useProfileData()

  const canSwitch = (fullProfile?.characters?.length ?? 0) > 1

  return {
    selectCharacter: selectActiveCharacter,
    switchingCharacter,
    canSwitch,
    activeCharacterId: fullProfile?.activeCharacterId,
    characters: fullProfile?.characters ?? [],
  }
}
