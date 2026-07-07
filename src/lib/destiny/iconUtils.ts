/** Shared Bungie placeholder / missing icon detection (client + server). */

export const GENERIC_ICON_MARKERS = [
  'bd7a1fc995f87be96698263bc16698e7',
  '8b1bfd1c1ce1cab51d23c78235a6e067',
  'bd7a131851dd9dad2da3e9f198f67f6e', // Spirit of the Gyrfalcon placeholder
  'missing_icon',
  'placeholder.jpg',
]

export function isGenericIconUrl(url?: string | null): boolean {
  if (!url) return true
  return GENERIC_ICON_MARKERS.some((marker) => url.includes(marker))
}

export function isUsableIconUrl(url?: string | null): boolean {
  return Boolean(url && !isGenericIconUrl(url))
}
