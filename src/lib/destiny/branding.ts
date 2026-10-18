/** User-facing product names (internal route ids stay `destiny-top-nest`). */

export const BRAND_FULL = "Destiny's Top Nest"
export const BRAND_SHORT = 'Top Nest'

export const HUB_NAME = 'Guardian Hub'

export const BRAND_TAGLINE =
  'Guardian Hub for finding Destiny 2 players, rating teammates, sharing builds, and climbing the Raid, Dungeon, and New Bonds boards. Fan-made and not affiliated with Bungie.'

/** Hero mission copy on the logged-in home shell. */
export const BRAND_MISSION =
  'Find a Guardian, check their rating, and climb the Raid, Dungeon, and New Bonds boards. Rewards are badges, titles, frames, and a season prize for #1.'

/** Logo assets (public/) */
export const BRAND_LOGO_PATH = '/brand/topnest-logo.png'
export const BRAND_LOGO_ALT = "Destiny's Top Nest — community Guardian hub"

/**
 * Palette extracted from the Top Nest crest logo + in-game element / rarity colors.
 */
export const TOPNEST_BRAND = {
  bg: '#121418',
  bgElevated: '#1a1d24',
  bronze: '#a8775a',
  bronzeDark: '#5e3a24',
  bronzeLight: '#c9956e',
  silver: '#c8cdd4',
  silverBright: '#e8ecf0',
  arc: '#73d2ff',
  arcGlow: 'rgba(115, 210, 255, 0.35)',
  solar: '#ffd580',
  solarGlow: 'rgba(255, 213, 128, 0.35)',
  void: '#8e749e',
  voidGlow: 'rgba(142, 116, 158, 0.28)',
  strand: '#35e366',
  strandGlow: 'rgba(53, 227, 102, 0.22)',
  stasis: '#4d88ff',
  stasisGlow: 'rgba(77, 136, 255, 0.25)',
  prismatic: '#e3619b',
  prismaticGlow: 'rgba(227, 97, 155, 0.22)',
  kinetic: '#e8e8e8',
  exotic: '#c3a019',
  legendary: '#513065',
  power: '#f5dc56',
} as const
