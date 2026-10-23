import type { DestinyTopNestTab } from '@/lib/destiny/types'

export type BuildsSection = 'shared' | 'mine' | 'compare'
export type CommunitySection = 'players' | 'teachers' | 'clans'
export type ProfileSection = 'guardian' | 'passport' | 'prizes'

export const MAIN_NAV: {
  href: string
  label: string
  short: string
  icon: 'home' | 'play' | 'people' | 'boards' | 'ask' | 'gear'
}[] = [
  { href: '/', label: 'Home', short: 'Home', icon: 'home' },
  { href: '/score', label: 'Score a Run', short: 'Score', icon: 'play' },
  { href: '/rate', label: 'Vote', short: 'Vote', icon: 'people' },
  { href: '/boards', label: 'Leaderboards', short: 'Boards', icon: 'boards' },
  { href: '/builds', label: 'Builds', short: 'Builds', icon: 'gear' },
  { href: '/ask', label: 'Ask AI', short: 'Ask', icon: 'ask' },
]

/** The header More menu. Three destinations, each with its own page. */
export const MORE_NAV: { href: string; label: string; hint: string }[] = [
  { href: '/people', label: 'Community', hint: 'Players, teachers, and clans.' },
  { href: '/quests', label: 'Weekly & Quests', hint: 'This week’s raids, dungeons, nightfall, goals, and quest search.' },
  { href: '/profile', label: 'Profile & Prizes', hint: 'Your characters, stamps, and season prizes.' },
]

const TAB_HINTS: Partial<Record<DestinyTopNestTab, string>> = {
  overview: 'Score a run, vote MVP, and see how TopNest works.',
  leaderboards: 'Season rankings. Leaders can win a 3D print.',
  ask: 'Current step-by-step Destiny answers.',
  loadouts: 'Shared builds, your in-game loadouts, and a side-by-side compare.',
  builds: 'Shared builds, your in-game loadouts, and a side-by-side compare.',
  compare: 'Two builds side by side.',
  lookup: 'Look up a Bungie name and save those in-game loadouts.',
  guardians: 'Find a Guardian and vote MVP, New Light, or Useless.',
  sherpas: 'Sherpas: players who guided a first clear.',
  clans: 'Standings when clanmates clear together.',
  quests: 'This week’s activities, weekly goals, and quest search.',
  contracts: 'Three goals that reset Tuesday. They do not change board points.',
  profile: 'Your Guardian, stamps, and season prizes.',
  season: 'The Season Hall of Fame, and who can win the 3D print or Steam card.',
  fireteam: 'Open raids and dungeons you can join.',
  events: 'Scheduled community sessions.',
}

const BUILD_TABS = new Set<DestinyTopNestTab>(['loadouts', 'builds', 'compare', 'lookup'])

export function isGearTab(tab: DestinyTopNestTab): boolean {
  return BUILD_TABS.has(tab)
}

export function navHint(tab: DestinyTopNestTab): string {
  return TAB_HINTS[tab] ?? 'TopNest helps you play with new friends and climb the season boards.'
}

/** Real URL for a tab that now lives on its own page. Fireteam and admin stay on the home query. */
export function routeForTab(tab: DestinyTopNestTab): string | null {
  switch (tab) {
    case 'overview':
      return '/'
    case 'ask':
      return '/ask'
    case 'leaderboards':
      return '/boards'
    case 'loadouts':
    case 'builds':
      return '/builds'
    case 'compare':
      return '/compare'
    case 'lookup':
      return '/builds?section=mine'
    case 'guardians':
      return '/people'
    case 'sherpas':
      return '/sherpas'
    case 'clans':
      return '/clans'
    case 'quests':
    case 'contracts':
    case 'events':
      return '/quests'
    case 'profile':
      return '/profile'
    case 'season':
      return '/rules'
    default:
      return null
  }
}

export function isBuildsPath(pathname: string): boolean {
  return pathname === '/builds' || pathname.startsWith('/builds/') || pathname === '/compare'
}

export function isMorePath(pathname: string): boolean {
  return (
    pathname === '/people' ||
    pathname === '/sherpas' ||
    pathname === '/clans' ||
    pathname === '/quests' ||
    pathname === '/contracts' ||
    pathname === '/profile' ||
    pathname === '/passport' ||
    pathname === '/rules'
  )
}

export function readBuildsSection(fallback: BuildsSection = 'shared'): BuildsSection {
  if (typeof window === 'undefined') return fallback
  if (window.location.pathname === '/compare') return 'compare'
  const section = new URLSearchParams(window.location.search).get('section')
  if (section === 'mine' || section === 'compare' || section === 'shared') return section
  return fallback
}

export function buildsHref(section: BuildsSection): string {
  if (section === 'compare') return '/compare'
  if (section === 'mine') return '/builds?section=mine'
  return '/builds'
}
