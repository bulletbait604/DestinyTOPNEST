import type { CharacterSummary, PlayerProfile } from '@/lib/destiny/types'

/** Prefer stored selection when still valid; otherwise highest power. */
export function resolveActiveCharacterId(
  storedId: string | undefined,
  characters: CharacterSummary[]
): string | undefined {
  if (!characters.length) return storedId
  if (storedId && characters.some((c) => c.characterId === storedId)) return storedId
  return [...characters].sort((a, b) => b.powerLevel - a.powerLevel)[0]?.characterId
}

export function getCharacterById(
  characters: CharacterSummary[] | undefined,
  characterId?: string
): CharacterSummary | undefined {
  if (!characters?.length || !characterId) return undefined
  return characters.find((c) => c.characterId === characterId)
}

/** Align top-level profile fields with the selected character row from Bungie. */
export function syncProfileWithActiveCharacter(profile: PlayerProfile): PlayerProfile {
  const activeId = profile.activeCharacterId
  const active = getCharacterById(profile.characters, activeId)
  if (!active) return profile

  return {
    ...profile,
    activeCharacterId: active.characterId,
    powerLevel: active.powerLevel,
    characterClass: active.characterClass,
    classRef: active.classRef ?? profile.classRef,
    emblemUrl: active.emblemUrl ?? profile.emblemUrl,
    emblemBackgroundUrl: active.emblemBackgroundUrl ?? profile.emblemBackgroundUrl,
    emblemColor: active.emblemColor ?? profile.emblemColor,
  }
}

/** Profile view model for banner + stats on a specific character slot. */
export function profileViewForCharacter(
  profile: PlayerProfile,
  characterId: string
): PlayerProfile {
  const active = getCharacterById(profile.characters, characterId)
  if (!active) return syncProfileWithActiveCharacter(profile)

  return {
    ...profile,
    activeCharacterId: characterId,
    powerLevel: active.powerLevel,
    characterClass: active.characterClass,
    classRef: active.classRef ?? profile.classRef,
    emblemUrl: active.emblemUrl ?? profile.emblemUrl,
    emblemBackgroundUrl: active.emblemBackgroundUrl ?? profile.emblemBackgroundUrl,
    emblemColor: active.emblemColor ?? profile.emblemColor,
    displayEmblem:
      active.emblemUrl || active.emblemBackgroundUrl
        ? {
            name: `${active.characterClass} emblem`,
            iconUrl: active.emblemUrl,
            backgroundUrl: active.emblemBackgroundUrl,
            color: active.emblemColor,
            source: 'equipped' as const,
          }
        : profile.displayEmblem,
  }
}
