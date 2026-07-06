import type { DestinyTopNestTab } from '@/lib/destiny/types'
import { ACTIVITY_ICON_PATHS } from '@/lib/destiny/activityIconPaths'
import { buildBungieIconUrl } from '@/lib/destiny/bungieUrls'

/** Bungie PGCR / activity art for main nav tabs — adds color without extra assets. */
export const NAV_TAB_ART: Partial<Record<DestinyTopNestTab, string>> = {
  overview: ACTIVITY_ICON_PATHS['vault of glass'],
  leaderboards: ACTIVITY_ICON_PATHS["king's fall"],
  profile: ACTIVITY_ICON_PATHS.duality,
  fireteam: ACTIVITY_ICON_PATHS['ghosts of the deep'],
  clans: ACTIVITY_ICON_PATHS['vault of glass'],
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
  hero: ACTIVITY_ICON_PATHS['vault of glass'],
  raidBoard: ACTIVITY_ICON_PATHS["king's fall"],
  soloBoard: ACTIVITY_ICON_PATHS["vesper's host"],
  dungeonBoard: ACTIVITY_ICON_PATHS['ghosts of the deep'],
  pantheonBoard: ACTIVITY_ICON_PATHS["crota's end"],
  todayPanel: ACTIVITY_ICON_PATHS['root of nightmares'],
} as const

export function homeSectionArtUrl(key: keyof typeof HOME_SECTION_ART): string {
  return buildBungieIconUrl(HOME_SECTION_ART[key]) ?? ''
}
