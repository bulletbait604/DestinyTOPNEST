import type { DestinyTopNestTab } from '@/lib/destiny/types'
import { BRAND_FULL, BRAND_MISSION } from '@/lib/destiny/branding'

export interface TabPageCopy {
  title: string
  description: string
  /** Use full brand styling (logo + product name) on the hero. */
  brand?: boolean
}

export const TAB_PAGE_COPY: Record<
  | 'overview'
  | 'leaderboards'
  | 'profile'
  | 'fireteam'
  | 'clans'
  | 'loadouts'
  | 'admin'
  | 'contracts'
  | 'sherpas'
  | 'events'
  | 'guardians'
  | 'compare'
  | 'lookup'
  | 'quests',
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
    description: 'Your Guardian, passport, verified clears, and weekly contracts.',
  },
  fireteam: {
    title: 'Fireteams',
    description: 'Open raid and dungeon lobbies, plus reviews from people you played with.',
  },
  clans: {
    title: 'Clan',
    description: 'Roster, weekly activity, and endgame progress.',
  },
  loadouts: {
    title: 'Builds',
    description: 'Live gear, saved loadouts, and player-shared builds.',
  },
  admin: {
    title: 'Admin',
    description: 'Review runs, moderate users, and adjust the boards.',
  },
  contracts: {
    title: 'Weekly contracts',
    description: 'Three community goals that reset every Tuesday. They earn season tiers, not leaderboard points.',
  },
  sherpas: {
    title: 'Sherpas',
    description: 'Guides who helped someone get a verified first clear. Learner MVP votes add a bonus.',
  },
  events: {
    title: 'Night Ops',
    description: 'Scheduled community sessions. A badge needs a verified clear inside the event window.',
  },
  guardians: {
    title: 'Guardians',
    description: 'Search Bungie names, including players who have not signed in yet, and vote them MVP.',
  },
  compare: {
    title: 'Compare',
    description: 'Put two shared builds, or a shared build and an equipped loadout, side by side.',
  },
  lookup: {
    title: 'Lookup',
    description: 'Search every shared build, or pull the loadout a guardian has equipped.',
  },
  quests: {
    title: 'Quests',
    description: 'Search Destiny 2 quests, pursuits, exotic quests, and catalysts from the Bungie manifest.',
  },
}

/** Map route tab ids to hero copy keys. */
export function tabPageCopyKey(tab: DestinyTopNestTab): keyof typeof TAB_PAGE_COPY {
  if (tab === 'builds' || tab === 'loadouts') return 'loadouts'
  if (tab === 'season') return 'leaderboards'
  if (
    tab === 'contracts' ||
    tab === 'sherpas' ||
    tab === 'events' ||
    tab === 'guardians' ||
    tab === 'compare' ||
    tab === 'lookup' ||
    tab === 'quests'
  ) {
    return tab
  }
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
