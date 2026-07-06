'use client'

import type { PlayerProfile } from '@/lib/destiny/types'
import { profileViewForCharacter } from '@/lib/destiny/activeCharacter'
import {
  GameCard,
  PowerBadge,
  TrustRankBadge,
} from '@/app/components/destiny/destinyGameUi'
import ProfileBuildInspectorBody from '@/app/components/destiny/ProfileBuildInspectorBody'
import GuardianProfileBanner from '@/app/components/destiny/GuardianProfileBanner'
import { getDestinyTheme } from '@/app/components/destiny/destinyTheme'
import { cn } from '@/lib/utils'

interface Props {
  profile: PlayerProfile
  darkMode: boolean
  switchingCharacter?: boolean
}

function classLabel(className?: string) {
  if (!className) return 'Guardian'
  return className.charAt(0).toUpperCase() + className.slice(1)
}

/** Live Bungie build inspector for the active character. */
export default function PlayerCardDetail({ profile, darkMode, switchingCharacter }: Props) {
  const t = getDestinyTheme(darkMode)
  const activeId = profile.activeCharacterId
  const viewProfile = activeId ? profileViewForCharacter(profile, activeId) : profile
  const loadout = profile.currentLoadout
  const clanLine = profile.clanName ?? null
  const emblemBackground =
    viewProfile.displayEmblem?.backgroundUrl ??
    viewProfile.emblemBackgroundUrl ??
    undefined

  return (
    <GameCard className="w-full overflow-hidden p-0 d2-profile-build-card">
      <GuardianProfileBanner
        profile={viewProfile}
        clanLine={clanLine}
        compact
        nameTrail={<TrustRankBadge trust={profile.trustRank} darkMode={darkMode} pill />}
      />

      <div
        className="d2-profile-build-bar"
        style={
          emblemBackground
            ? ({ '--build-bar-url': `url("${emblemBackground}")` } as React.CSSProperties)
            : undefined
        }
      >
        <div className="ml-auto flex items-center gap-2 min-w-0">
          <span className={cn('d2-profile-build-bar-class truncate', t.body)}>
            {classLabel(viewProfile.characterClass)}
            {loadout?.subclass ? ` · ${loadout.subclass}` : ''}
          </span>
          <PowerBadge power={viewProfile.powerLevel} rank={profile.guardianRank} showRankAlways />
        </div>
      </div>

      {!loadout ? (
        <p className={cn('px-4 py-6 text-sm text-center', t.muted)}>
          {switchingCharacter ? 'Loading equipped gear…' : 'Sync Bungie to load live build data.'}
        </p>
      ) : (
        <ProfileBuildInspectorBody build={loadout} layout="guardian" />
      )}
    </GameCard>
  )
}
