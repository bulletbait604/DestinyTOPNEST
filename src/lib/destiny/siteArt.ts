import { buildBungieIconUrl } from '@/lib/destiny/bungieUrls'

/** Bungie CDN backdrop art — community, fireteams, and Guardians' Oath themes. */
export const SITE_BACKDROP_PATHS = {
  /** Dares of Eternity — bright, celebratory community activity. */
  login: '/img/destiny_content/pgcr/30th-anniversary-dares-of-eternity.jpg',
  /** Garden of Salvation — six-Guardian raid fireteam. */
  hub: '/img/destiny_content/pgcr/raid_garden_of_salvation.jpg',
  /** Deep Stone Crypt — coordinated fireteam on Europa. */
  banner: '/img/destiny_content/pgcr/europa-raid-deep-stone-crypt.jpg',
} as const

export const SITE_BACKGROUNDS = {
  login: buildBungieIconUrl(SITE_BACKDROP_PATHS.login) ?? '',
  hub: buildBungieIconUrl(SITE_BACKDROP_PATHS.hub) ?? '',
  banner: buildBungieIconUrl(SITE_BACKDROP_PATHS.banner) ?? '',
} as const

export type SiteBackdropVariant = keyof typeof SITE_BACKGROUNDS
