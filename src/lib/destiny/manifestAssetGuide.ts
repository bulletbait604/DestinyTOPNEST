/**
 * Bungie manifest thumbnail reference for Destiny Top Nest.
 * Full URLs: https://www.bungie.net + relative path from displayProperties.icon / pgcrImage.
 *
 * @see https://www.bungie.net/Platform/Destiny2/Manifest/
 * @see scripts/lib/manifestClient.mjs — catalog build helpers
 */

export const BUNGIE_CDN_ORIGIN = 'https://www.bungie.net'

/** Manifest tables and where thumbnail paths live on each definition. */
export const MANIFEST_ICON_FIELDS = {
  DestinyInventoryItemDefinition: ['displayProperties.icon'],
  DestinySandboxPerkDefinition: ['displayProperties.icon'],
  DestinyActivityDefinition: [
    'pgcrImage',
    'selectionScreenDisplayProperties.icon',
    'displayProperties.icon',
    'releaseIcon',
  ],
  DestinyActivityGraphDefinition: ['displayProperties.icon'],
  DestinyClassDefinition: ['displayProperties.icon'],
  DestinyDamageTypeDefinition: ['displayProperties.icon'],
} as const

/** Regenerate static fallbacks after a content patch. */
export const CATALOG_SCRIPTS = {
  items: 'node scripts/build-item-catalog.mjs',
  activities: 'node scripts/build-activity-icon-paths.mjs',
  sqliteBundle: 'node scripts/download-manifest-sqlite.mjs',
} as const
