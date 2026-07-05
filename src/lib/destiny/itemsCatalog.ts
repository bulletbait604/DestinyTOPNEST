/**
 * Fallback Bungie definition hashes when manifest lookup is unavailable.
 * Regenerate: node scripts/build-item-catalog.mjs
 */

export type ManifestEntityType =
  | 'DestinyInventoryItemDefinition'
  | 'DestinyActivityDefinition'
  | 'DestinyActivityModeDefinition'
  | 'DestinySandboxPerkDefinition'
  | 'DestinyClassDefinition'
  | 'DestinyDamageTypeDefinition'
  | 'DestinyStatDefinition'
  | 'DestinyEquipableItemSetDefinition'
  | 'DestinyPlugSetDefinition'
  | 'DestinyPresentationNodeDefinition'

export interface CatalogEntry {
  hash: number
  entity: ManifestEntityType
  iconPath?: string
}

import { ITEM_ICON_PATHS } from '@/lib/destiny/itemIconPaths'

/** Name → hash catalog (case-insensitive lookup in resolver). */
export const ITEM_CATALOG: Record<string, CatalogEntry> = {
  'ophidian aspect': { hash: 68357813, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/a3e9b60f50480547349cf245f30b28f5.jpg' },
  'cuirass of the falling star': { hash: 1624161432, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/23e3d07bead2936a80612419f3ee9f94.jpg' },
  'wormgod caress': { hash: 809007411, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/3baea5888219c87acd58d177ae70f2c2.jpg' },
  'praxic blade': { hash: 3049715579, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/d63292c9248c5e3ae823605307140199.jpg' },
  'getaway artist': { hash: 3070357340, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/a2350076ae19cf474a88a0c2a440c93f.jpg' },
  'gifted conviction': { hash: 1446374842, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/4365fd49261fb81d069d0db10acb9fd4.jpg' },
  'stronghold': { hash: 512777670, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/94ea4f627e75d7f1d71304057c569c4f.jpg' },
  'starfire protocol': { hash: 599049453, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/e101d5271789720c8930459168603398.jpg' },
  'star-eater scales': { hash: 1001356380, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/5b7f647435bbe18d2c83d3691758184c.jpg' },
  'outbreak perfected': { hash: 400096939, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/a1b6a5f3e52878610397249986300b23.jpg' },
  'witherhoard': { hash: 2357297366, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/3e4fc5bcc1dea42508124e11572367d2.jpg' },
  'raiden flux': { hash: 368733543, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/af16bd8628430cc43cfcb161074a1706.jpg' },
  'gyrfalcon': { hash: 461841403, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/e6e10342a97eb3f6b974399ef7214e75.jpg' },
  'thunderlord': { hash: 3325463374, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/4a08027f7b5752f84d183ecc61682c3e.jpg' },
  'icefall mantle': { hash: 1220605797, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/8c6e9159014b670c7e316aee4b1df3a8.jpg' },
  'divinity': { hash: 4103414242, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/c6aa03536fd68b5fca5ad6b83ea0cf1e.jpg' },
  'wish-keeper': { hash: 682995262, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/6b47d872840188bc913d6307fa537c3c.jpg' },
  'cataclysmic': { hash: 517759838, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/a180748fde0e20e450b841663c388833.jpg' },
  'calus\'s selected': { hash: 1422712818, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/56622ba132760e617d902977aadf41f7.jpg' },
  'null composure': { hash: 182589170, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/8c750beedde6de756d0b194f262e3372.jpg' },
  'stormchaser': { hash: 206914820, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/0b3c602c10a80fcc5c688f6298e53fc6.jpg' },
  'submission': { hash: 73105274, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/4d596b18d607700aca914f348fa188f6.jpg' },
  'imminence': { hash: 335956319, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/0a636f8e1f115bcb825e7ab60ef6c302.jpg' },
  'supremacy': { hash: 686951703, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/57e762b0f41575efde3deaa79496f628.jpg' },
  'explosive personality': { hash: 379483877, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/6c48130b8beb51854867b53fe108aa6d.jpg' },
  'zephyr reward': { hash: 3400256755, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/083bc649a7f8f0a2caf1c44bafbc5ebb.jpg' },
  'bleak watcher': { hash: 790664813, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/51d335e369d83d303203448c75fce439.png' },
  'sword': { hash: 243425374, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/8229c9cf8c182284da8a9461f69680be.jpg' },
  'nova bomb': { hash: 3484134371, entity: 'DestinySandboxPerkDefinition', iconPath: '/common/destiny2_content/icons/6bdf6744ff078fa64e047a7551f711c7.png' },
  'healing rift': { hash: 25156515, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/21c913ded4a635f654ee47bed3d780be.jpg' },
  'void grenade': { hash: 1016030582, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/12997544665705bbbd94742268ce7091.jpg' },
  'echo of undermining': { hash: 2272984668, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/b114e9d97c42a68b19ab7876a221b354.jpg' },
  'echo of instability': { hash: 2661180600, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/0ad46f9c0c14535c4d5776daf48e871e.jpg' },
  'prismatic': { hash: 571267712, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/ea46e3015259c7bc0d98020eb1889c2a.png' },
  'arc': { hash: 2216933117, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/76a0b180d58512565240cd4bee37ebd4.jpg' },
  'solar': { hash: 1486613374, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/bac8000263a034c463ba2913913a1a3e.jpg' },
  'void': { hash: 1639876925, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/d667081e608892a833dd34fd7c0dca85.jpg' },
  'strand': { hash: 2269884985, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/21a184d5183639d65ce09278a6fe2513.jpg' },
  'stasis': { hash: 3211104032, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/4ad1cfb93d519ae2a5e0297801e36acb.png' },
  'warlock': { hash: 33795475, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/5c7f96f5c55387d5455407b77bfd3862.jpg' },
  'titan': { hash: 261110027, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/9fd7e54c3ff36dcdbbac11cd5acb86a1.jpg' },
  'hunter': { hash: 181754010, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/6a96e88f04eb604178a4b8a0e09408c7.jpg' },
}

export function catalogLookup(name: string): CatalogEntry | undefined {
  const key = name.trim().toLowerCase()
  const entry = ITEM_CATALOG[key]
  if (!entry) return undefined
  const iconPath = entry.iconPath ?? ITEM_ICON_PATHS[key]
  return iconPath ? { ...entry, iconPath } : entry
}

export const MOCK_EMBLEM_HASHES = [29194593, 31953746, 54004489, 54004491, 19962737, 10493725]
