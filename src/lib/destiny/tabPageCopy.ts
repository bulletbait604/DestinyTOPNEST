import type { DestinyTopNestTab } from '@/lib/destiny/types'
import { BRAND_FULL, BRAND_MISSION } from '@/lib/destiny/branding'

export interface TabPageCopy {
  title: string
  description: string
  /** Use full brand styling (logo + product name) on the hero. */
  brand?: boolean
}

export const TAB_PAGE_COPY: Record<
  'overview' | 'leaderboards' | 'profile' | 'fireteam' | 'clans' | 'loadouts' | 'admin',
  TabPageCopy
> = {
  overview: {
    title: BRAND_FULL,
    description: BRAND_MISSION,
    brand: true,
  },
  leaderboards: {
    title: 'Leaderboards',
    description: '',
  },
  profile: {
    title: 'Profile',
    description:
      'Your Guardian build, verified run history, reputation, and emblem — synced from Bungie.',
  },
  fireteam: {
    title: 'FIRETEAMS',
    description:
      'Browse open raid and dungeon lobbies, find Guardians to play with, and leave fireteam reviews.',
  },
  clans: {
    title: 'Clan',
    description:
      'Your clan roster, weekly activity, and collective progress across Destiny’s endgame.',
  },
  loadouts: {
    title: 'Builds',
    description:
      'Your live gear, saved loadouts, community favorites, and the loadout builder.',
  },
  admin: {
    title: 'Admin',
    description: 'Review flagged runs, moderate users, adjust leaderboards, ban accounts, and monitor the staff activity feed.',
  },
}

/** Map route tab ids to hero copy keys. */
export function tabPageCopyKey(tab: DestinyTopNestTab): keyof typeof TAB_PAGE_COPY {
  if (tab === 'builds' || tab === 'loadouts') return 'loadouts'
  if (tab === 'season') return 'leaderboards'
  return tab as keyof typeof TAB_PAGE_COPY
}

export function tabPageCopy(tab: DestinyTopNestTab): TabPageCopy {
  const key = tabPageCopyKey(tab)
  return TAB_PAGE_COPY[key] ?? TAB_PAGE_COPY.overview
}

/** Tab id used for hero PGCR art (matches nav highlighting). */
export function tabHeroArtKey(tab: DestinyTopNestTab): DestinyTopNestTab {
  if (tab === 'builds' || tab === 'loadouts') return 'loadouts'
  if (tab === 'season') return 'leaderboards'
  return tab
}
