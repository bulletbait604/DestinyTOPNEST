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

/** Short wide banner â€” Tracker header + DIM character tiles + stats. */
export default function PlayerCardCompact({ profile, darkMode, linked = true, loading }: Props) {
  const t = getDestinyTheme(darkMode)

  if (loading) {
    return (
      <div className={cn('d2-panel animate-pulse w-full max-w-4xl overflow-hidden', t.glassInset)}>
        <div className="h-24 bg-white/5" />
        <div className="h-12 bg-black/20 mx-3 my-2 rounded" />
      </div>
    )
  }

  if (!profile) {
    return (
      <GameCard className="w-full max-w-4xl px-4 py-3">
        <p className={cn('text-xs text-center', t.muted)}>Link Bungie to load your Guardian</p>
      </GameCard>
    )
  }

  const characters = fallbackCharacters(profile)
  const clanLine = formatClanLine(profile)
  const guardianRank =
    typeof profile.guardianRank === 'number' ? profile.guardianRank : undefined

  return (
    <GameCard className="w-full max-w-4xl overflow-hidden p-0">
      <GuardianProfileBanner
        profile={profile}
        compact
        clanLine={clanLine}
        stats={
          <div className="flex flex-col items-end gap-2 shrink-0">
            <PowerBadge power={profile.powerLevel} rank={guardianRank} showRankAlways />
            <TrustRankBadge trust={profile.trustRank} darkMode={darkMode} compact />
          </div>
        }
      >
        {characters?.length ? (
          <div className="dim-player-header -mx-1 mt-3 px-1 pt-2 pb-1 rounded-md">
            <CharacterTileRow
              characters={characters}
              activeCharacterId={profile.activeCharacterId}
              compact
            />
          </div>
        ) : null}
      </GuardianProfileBanner>

      {!linked && (
        <p className="text-[10px] text-center text-amber-200/60 py-2 border-t border-white/[0.06]">
          Connect Bungie on Home
        </p>
      )}
    </GameCard>
  )
}
