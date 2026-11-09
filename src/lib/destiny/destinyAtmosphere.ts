/**
 * Destiny hub atmosphere. Backdrops are Bungie post-game renders already
 * referenced in this repo and served from www.bungie.net. Accent colors are
 * the element palette in src/app/globals.css. See docs/DESTINY_ART.md.
 */

export const BUNGIE_CDN = 'https://www.bungie.net'

export interface DestinyScene {
  id: 'traveler' | 'tower' | 'garden' | 'europa'
  label: string
  /** What the official render shows. */
  place: string
  path: string
}

export interface DestinyAccent {
  id: 'arc' | 'solar' | 'void' | 'stasis' | 'strand'
  label: string
  /** Fill for the primary action. */
  color: string
  /** Text on that fill. Chosen for WCAG AA against `color`. */
  onColor: string
}

export const DESTINY_SCENES: readonly DestinyScene[] = [
  {
    id: 'traveler',
    label: 'Traveler',
    place: 'European Dead Zone, with the Traveler over Trostland',
    path: '/img/destiny_content/pgcr/patrol_edz.jpg',
  },
  {
    id: 'tower',
    label: 'Tower',
    place: 'Tower social space',
    path: '/img/destiny_content/pgcr/tower.jpg',
  },
  {
    id: 'garden',
    label: 'Garden',
    place: 'Garden of Salvation, Black Garden',
    path: '/img/destiny_content/pgcr/raid_garden_of_salvation.jpg',
  },
  {
    id: 'europa',
    label: 'Europa',
    place: 'Deep Stone Crypt on Europa',
    path: '/img/destiny_content/pgcr/europa-raid-deep-stone-crypt.jpg',
  },
] as const

/** Element colors already defined as --d2-* / --tn-* in globals.css. */
export const DESTINY_ACCENTS: readonly DestinyAccent[] = [
  { id: 'arc', label: 'Arc', color: '#73d2ff', onColor: '#061018' },
  { id: 'solar', label: 'Solar', color: '#f0631e', onColor: '#061018' },
  { id: 'void', label: 'Void', color: '#8e749e', onColor: '#061018' },
  { id: 'stasis', label: 'Stasis', color: '#4d88ff', onColor: '#061018' },
  { id: 'strand', label: 'Strand', color: '#35e366', onColor: '#061018' },
] as const

export const DEFAULT_DESTINY_SCENE = DESTINY_SCENES[0]
export const DEFAULT_DESTINY_ACCENT = DESTINY_ACCENTS[0]

export const DESTINY_PANEL = '#141820'
export const DESTINY_INK = '#f3f5f8'
export const DESTINY_MUTED = '#c5ccd6'

export function bungieArtUrl(path: string): string {
  return `${BUNGIE_CDN}${path}`
}

export function destinySceneById(id: string | null | undefined): DestinyScene {
  return DESTINY_SCENES.find((scene) => scene.id === id) ?? DEFAULT_DESTINY_SCENE
}

export function destinyAccentById(id: string | null | undefined): DestinyAccent {
  return DESTINY_ACCENTS.find((accent) => accent.id === id) ?? DEFAULT_DESTINY_ACCENT
}

export function contrastRatio(foreground: string, background: string): number {
  const lum = (hex: string) => {
    const value = parseInt(hex.slice(1), 16)
    const channel = (shift: number) => {
      const s = ((value >> shift) & 255) / 255
      return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
    }
    return 0.2126 * channel(16) + 0.7152 * channel(8) + 0.0722 * channel(0)
  }
  const lighter = Math.max(lum(foreground), lum(background))
  const darker = Math.min(lum(foreground), lum(background))
  return (lighter + 0.05) / (darker + 0.05)
}

export function sceneCredit(scene: DestinyScene): string {
  return `Backdrop: ${scene.place}. Bungie Destiny 2 art, ${bungieArtUrl(scene.path)}. Fan-made, not affiliated with Bungie.`
}
