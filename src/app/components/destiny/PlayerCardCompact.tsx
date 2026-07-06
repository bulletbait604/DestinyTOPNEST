'use client'

import type { PlayerProfile } from '@/lib/destiny/types'
import { CharacterTileRow } from '@/app/components/destiny/CharacterTile'
import GuardianProfileBanner from '@/app/components/destiny/GuardianProfileBanner'
import { PowerBadge, TrustRankBadge, GameCard } from '@/app/components/destiny/destinyGameUi'
import { getDestinyTheme } from '@/app/components/destiny/destinyTheme'
import { cn } from '@/lib/utils'

interface Props {
  profile: PlayerProfile | null
  darkMode: boolean
  linked?: boolean
  loading?: boolean
  size?: 'compact' | 'featured'
}

function fallbackCharacters(profile: PlayerProfile): PlayerProfile['characters'] {
  if (profile.characters?.length) return profile.characters
  if (!profile.characterClass) return undefined
  return [
    {
      characterId: profile.activeCharacterId ?? 'active',
      characterClass: profile.characterClass,
      powerLevel: profile.powerLevel ?? 0,
      emblemUrl: profile.displayEmblem?.iconUrl ?? profile.emblemUrl,
      emblemBackgroundUrl: profile.displayEmblem?.backgroundUrl ?? profile.emblemBackgroundUrl,
      emblemColor: profile.displayEmblem?.color ?? profile.emblemColor,
      classRef: profile.classRef,
    },
  ]
}

function formatClanLine(profile: PlayerProfile): string | null {
  return profile.clanName ?? null
}

/** Wide player banner — emblem backdrop, identity, character tiles, and stats. */
export default function PlayerCardCompact({
  profile,
  darkMode,
  linked = true,
  loading,
  size = 'featured',
}: Props) {
  const t = getDestinyTheme(darkMode)
  const featured = size === 'featured'

  if (loading) {
    return (
      <div
        className={cn(
          'd2-panel animate-pulse w-full overflow-hidden',
          t.glassInset,
          featured && 'd2-player-card-featured'
        )}
      >
        <div className={featured ? 'h-36 bg-white/5' : 'h-24 bg-white/5'} />
        <div className={cn('bg-black/20 mx-3 my-2 rounded', featured ? 'h-16' : 'h-12')} />
      </div>
    )
  }

  if (!profile) {
    return (
      <GameCard className={cn('w-full px-4 py-3', featured && 'd2-player-card-featured py-5')}>
        <p className={cn('text-xs text-center', featured && 'text-sm', t.muted)}>
          Link Bungie to load your Guardian
        </p>
      </GameCard>
    )
  }

  const characters = fallbackCharacters(profile)
  const clanLine = formatClanLine(profile)
  const guardianRank =
    typeof profile.guardianRank === 'number' ? profile.guardianRank : undefined

  return (
    <GameCard className={cn('w-full overflow-hidden p-0', featured && 'd2-player-card-featured')}>
      <GuardianProfileBanner
        profile={profile}
        compact={!featured}
        hideIdentity={!featured}
        clanLine={clanLine}
        nameTrail={
          featured ? (
            <TrustRankBadge trust={profile.trustRank} darkMode={darkMode} pill />
          ) : null
        }
        stats={
          <div className="flex items-end gap-2 shrink-0 flex-wrap justify-end">
            <PowerBadge power={profile.powerLevel} rank={guardianRank} showRankAlways />
            {!featured ? (
              <TrustRankBadge trust={profile.trustRank} darkMode={darkMode} pill />
            ) : null}
          </div>
        }
      >
        {characters?.length ? (
          <div
            className={cn(
              'dim-player-header -mx-1 mt-3 px-1 pt-2 pb-1 rounded-md',
              featured && 'dim-player-header-featured mt-4 px-2 pt-3 pb-2'
            )}
          >
            <CharacterTileRow
              characters={characters}
              activeCharacterId={profile.activeCharacterId}
              compact={!featured}
            />
          </div>
        ) : null}
      </GuardianProfileBanner>

      {!linked && (
        <p className="text-[10px] text-center text-amber-200/60 py-2 border-t border-white/[0.06]">
          Reconnect Bungie
        </p>
      )}
    </GameCard>
  )
}
