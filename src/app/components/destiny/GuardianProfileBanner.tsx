'use client'

import type { PlayerProfile } from '@/lib/destiny/types'
import { cn } from '@/lib/utils'

interface Props {
  profile: PlayerProfile
  /** Clan line under the username (name + optional tag). */
  clanLine?: string | null
  /** Extra stats row (GR, PL, T.R.) rendered on the banner. */
  stats?: React.ReactNode
  /** Character tiles or other content below the identity row. */
  children?: React.ReactNode
  compact?: boolean
  /** Hide emblem avatar and display name (e.g. when shown in the app header). */
  hideIdentity?: boolean
}

/** Destiny Tracker–style wide profile header with emblem backdrop. */
export default function GuardianProfileBanner({
  profile,
  clanLine,
  stats,
  children,
  compact,
  hideIdentity,
}: Props) {
  const bg =
    profile.displayEmblem?.backgroundUrl ??
    profile.emblemBackgroundUrl ??
    profile.characters?.find((c) => c.characterId === profile.activeCharacterId)?.emblemBackgroundUrl

  const icon =
    profile.displayEmblem?.iconUrl ??
    profile.emblemUrl ??
    profile.characterThumbnailUrl

  const clan = clanLine ?? profile.clanName ?? null

  return (
    <div
      className={cn('d2-profile-banner', compact && 'd2-profile-banner-compact')}
      style={bg ? ({ '--banner-url': `url("${bg}")` } as React.CSSProperties) : undefined}
    >
      <div className="d2-profile-banner-vignette" />
      <div className="d2-profile-banner-content">
        {hideIdentity ? (
          stats ? (
            <div className="d2-profile-stats flex justify-end">{stats}</div>
          ) : null
        ) : (
          <div className="d2-profile-identity">
            {icon ? (
              <img src={icon} alt="" className="d2-profile-avatar" />
            ) : (
              <div className="d2-profile-avatar d2-profile-avatar-fallback" />
            )}
            <div className="min-w-0 flex-1">
              <h2 className="d2-profile-name truncate">{profile.bungieDisplayName}</h2>
              {clan ? (
                <p className="d2-profile-clan-primary truncate">{clan}</p>
              ) : (
                <p className="d2-profile-clan-empty">No clan</p>
              )}
            </div>
            {stats ? <div className="d2-profile-stats shrink-0">{stats}</div> : null}
          </div>
        )}
        {children}
      </div>
    </div>
  )
}
