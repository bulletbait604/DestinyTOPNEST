/** Local backdrop art (Unsplash — free to use). D2 color grading applied in CSS. */

export const SITE_BACKGROUNDS = {
  login: '/backgrounds/login-tower.jpg',
  hub: '/backgrounds/hub-nebula.jpg',
  banner: '/backgrounds/raid-banner.jpg',
} as const

export type SiteBackdropVariant = keyof typeof SITE_BACKGROUNDS
