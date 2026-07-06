import type { DestinyTopNestTab } from '@/lib/destiny/types'
import { ACTIVITY_ICON_PATHS } from '@/lib/destiny/activityIconPaths'
import { buildBungieIconUrl } from '@/lib/destiny/bungieUrls'

/** Community & fireteam themed Bungie art (Guardians' Oath emblem, raid PGCRs). */
export const COMMUNITY_ART = {
  /** Guardians' Oath emblem — Guardians united under the Light. */
  guardiansOath: '/common/destiny2_content/icons/cadea54a317eb0c131a9b93925422370.jpg',
  guardiansOathIcon: '/common/destiny2_content/icons/524388229145e86a3dc6bf79d8a641f4.jpg',
  fireteamRaid: '/img/destiny_content/pgcr/raid_garden_of_salvation.jpg',
  fireteamDSC: '/img/destiny_content/pgcr/europa-raid-deep-stone-crypt.jpg',
  communityDares: '/img/destiny_content/pgcr/30th-anniversary-dares-of-eternity.jpg',
} as const

/** Bungie PGCR / activity art for main nav tabs. */
export const NAV_TAB_ART: Partial<Record<DestinyTopNestTab, string>> = {
  overview: COMMUNITY_ART.guardiansOath,
  leaderboards: COMMUNITY_ART.fireteamRaid,
  profile: ACTIVITY_ICON_PATHS.duality,
  fireteam: COMMUNITY_ART.fireteamDSC,
  clans: COMMUNITY_ART.communityDares,
  loadouts: ACTIVITY_ICON_PATHS['root of nightmares'],
  builds: ACTIVITY_ICON_PATHS['deep stone crypt'],
  season: ACTIVITY_ICON_PATHS["crota's end"],
  admin: ACTIVITY_ICON_PATHS['spire of the watcher'],
}

export function navTabArtUrl(tab: DestinyTopNestTab): string | undefined {
  const path = NAV_TAB_ART[tab]
  return path ? buildBungieIconUrl(path) : undefined
}

/** Home section hero/backdrop art. */
export const HOME_SECTION_ART = {
  hero: COMMUNITY_ART.guardiansOath,
  raidBoard: ACTIVITY_ICON_PATHS["king's fall"],
  soloBoard: COMMUNITY_ART.communityDares,
  dungeonBoard: ACTIVITY_ICON_PATHS['ghosts of the deep'],
  pantheonBoard: ACTIVITY_ICON_PATHS.pantheon,
  todayPanel: COMMUNITY_ART.fireteamRaid,
} as const

export function homeSectionArtUrl(key: keyof typeof HOME_SECTION_ART): string {
  return buildBungieIconUrl(HOME_SECTION_ART[key]) ?? ''
}

/** Solo / monthly Commanders leaderboard tile icon. */
export function soloLeaderboardIconUrl(): string {
  return buildBungieIconUrl(COMMUNITY_ART.guardiansOathIcon) ?? ''
}
