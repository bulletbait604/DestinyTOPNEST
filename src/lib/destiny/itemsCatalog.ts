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

const MANIFEST_ENTITY_TYPES: ManifestEntityType[] = [
  'DestinyInventoryItemDefinition',
  'DestinyActivityDefinition',
  'DestinyActivityModeDefinition',
  'DestinySandboxPerkDefinition',
  'DestinyClassDefinition',
  'DestinyDamageTypeDefinition',
  'DestinyStatDefinition',
  'DestinyEquipableItemSetDefinition',
  'DestinyPlugSetDefinition',
  'DestinyPresentationNodeDefinition',
]

export function isManifestEntityType(value: string | null | undefined): value is ManifestEntityType {
  if (!value) return false
  return MANIFEST_ENTITY_TYPES.includes(value as ManifestEntityType)
}

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
  'bleak watcher': { hash: 1394191455, entity: 'DestinySandboxPerkDefinition', iconPath: '/common/destiny2_content/icons/51d335e369d83d303203448c75fce439.png' },
  'sword': { hash: 243425374, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/8229c9cf8c182284da8a9461f69680be.jpg' },
  'nova bomb': { hash: 3484134371, entity: 'DestinySandboxPerkDefinition', iconPath: '/common/destiny2_content/icons/6bdf6744ff078fa64e047a7551f711c7.png' },
  'void grenade': { hash: 1016030582, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/12997544665705bbbd94742268ce7091.jpg' },
  'echo of undermining': { hash: 1574180059, entity: 'DestinySandboxPerkDefinition', iconPath: '/common/destiny2_content/icons/b114e9d97c42a68b19ab7876a221b354.jpg' },
  'echo of instability': { hash: 3138409823, entity: 'DestinySandboxPerkDefinition', iconPath: '/common/destiny2_content/icons/0ad46f9c0c14535c4d5776daf48e871e.jpg' },
  'arc': { hash: 2303181850, entity: 'DestinyDamageTypeDefinition', iconPath: '/common/destiny2_content/icons/DestinyDamageTypeDefinition_092d066688b879c807c3b460afdd61e6.png' },
  'solar': { hash: 1847026933, entity: 'DestinyDamageTypeDefinition', iconPath: '/common/destiny2_content/icons/DestinyDamageTypeDefinition_2a1773e10968f2d088b97c22b22bba9e.png' },
  'void': { hash: 3454344768, entity: 'DestinyDamageTypeDefinition', iconPath: '/common/destiny2_content/icons/DestinyDamageTypeDefinition_ceb2f6197dccf3958bb31cc783eb97a0.png' },
  'strand': { hash: 3949783978, entity: 'DestinyDamageTypeDefinition', iconPath: '/common/destiny2_content/icons/DestinyDamageTypeDefinition_b2fe51a94f3533f97079dfa0d27a4096.png' },
  'stasis': { hash: 151347233, entity: 'DestinyDamageTypeDefinition', iconPath: '/common/destiny2_content/icons/DestinyDamageTypeDefinition_530c4c3e7981dc2aefd24fd3293482bf.png' },
  'touch of malice': { hash: 1802135586, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/106a8a40a6e55b5ec5088a26d1ed979d.jpg' },
  'kingslayer': { hash: 1557274655, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/ce71024d7d432d5b0d912eca78a863d0.jpg' },
  'smite of merain': { hash: 694218974, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/e47393574637ea49389e500ab365b311.jpg' },
  'defiance of yasmin': { hash: 126468112, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/0d2362114689cf93a8cb8b9c0eac5097.jpg' },
  'vex mythoclast': { hash: 4289226715, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/111a10b59029fc6a9ca5e821267e6f6c.jpg' },
  'fatebringer': { hash: 816113441, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/7741689cbc1102aa9fc742b33a106f19.jpg' },
  'vision of confluence': { hash: 1355744825, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/91164af10befddb76a53e50f5c1ee804.jpg' },
  'hezen vengeance': { hash: 1162270757, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/3b17caa86d9bb7b83a19d809084fa93b.jpg' },
  'zealot\'s robe': { hash: 503192607, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/f8f4b1a69763ce8cb57e50766aec57b0.jpg' },
  'zealot\'s reward': { hash: 820827267, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/befe333b98c55b5c8dce6ba073ae1e92.jpg' },
  'emperor\'s courtesy': { hash: 3861448240, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/180d93d2e77bf57dc92b6411cc789c9b.jpg' },
  'reckless endangerment': { hash: 1569384609, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/8ad4bf8073f313cddec7e02b6b3c72ed.jpg' },
  'one thousand voices': { hash: 2069224589, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/51c53df606cca474dce3cadbf7d5ce28.jpg' },
  'nation of beasts': { hash: 70083888, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/5463ac2900275ecc8d349076339e56ca.jpg' },
  'chattering bone': { hash: 501329015, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/34fa2107bfddfbe6c559de876a3aac55.jpg' },
  'age-old bond': { hash: 424291879, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/f6bea329c6f50d716e6385d59de7bd4c.jpg' },
  'necrochasm': { hash: 1034055198, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/52e8bb636771f4731da3f73f06fcad04.jpg' },
  'swordbreaker': { hash: 174021700, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/ba9f551c34fa8117141628d47d7d0c78.jpg' },
  'omnigul\'s grieve': { hash: 120706239, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/4b9f5e2f929b5f7c1730e28ec880b989.jpg' },
  'abyssal defiant': { hash: 457816674, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/3a166cd64dc18fff429e9e5992e44055.jpg' },
  'conditional finality': { hash: 3371017761, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/c9b4d65adcdfcadde871e5961ce912fb.jpg' },
  'rufus\'s fury': { hash: 69140690, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/4b2875c89f540ce52d48dba19dac477e.jpg' },
  'mykel\'s reverence': { hash: 1080125, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/a21c38a2e55d4e1ffb1c77751e2fe580.jpg' },
  'nimrod\'s hunter': { hash: 184990290, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/255be304412b4f0f3d880cb7e46ca256.jpg' },
  'lubrae\'s ruin': { hash: 742858186, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/53d4a204d26117fb165185fd575b5f4a.jpg' },
  'forbearance': { hash: 568611921, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/38b89e4fd05f348f448eaca1320a807c.jpg' },
  'insidious': { hash: 2653865136, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/43022ab2098d527e2ab42d108a0c17da.jpg' },
  'deliverance': { hash: 200474807, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/b32b09e7a3e0cf827ca1bea39dc71d05.jpg' },
  'eyes of tomorrow': { hash: 2399110176, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/9caeff89015f02ad52e6fefe95398b01.jpg' },
  'heritage': { hash: 1230392361, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/07619f9f7115a2295c080f08179deb98.jpg' },
  'commemoration': { hash: 772598123, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/9820c9c3714bdd7f6fb7c2b83143041b.jpg' },
  'posterity': { hash: 481721032, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/90586409f639d65ee1c91fbce534aa81.jpg' },
  'ergo sum': { hash: 1681583613, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/39a94c98eba4b9e007a76bbc067752f7.jpg' },
  'non-denouement': { hash: 904209471, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/e56caaf523a140ff834905da55d3b046.jpg' },
  'forthcoming deviance': { hash: 354732155, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/3383698dee3df48089b8d18f956f9476.jpg' },
  'tarrabah': { hash: 3110698812, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/88ea7e35e14f29c4cda6588cb258333b.jpg' },
  'apex predator': { hash: 1233603613, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/0819f6c7aa9ab0f5b082eee2a24bfb0d.jpg' },
  'beloved': { hash: 501309627, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/0458b8ce93e3fffe362514275dd395ef.jpg' },
  'gjallarhorn': { hash: 1363886209, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/b62083eed6a4708e581fc9a061bcc8e9.jpg' },
  'xenophage': { hash: 1395261499, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/de34570a93281dc201690cfd146e6d24.jpg' },
  'eyasluna': { hash: 235827225, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/9385daf600d89dd759c3b3f690edbc03.jpg' },
  'comedian': { hash: 1028582252, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/605ced44523297366cb1f5ccc8043a86.jpg' },
  'wish-ender': { hash: 757817572, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/f513e68c68d76392cffd52d94cc1410a.jpg' },
  'twilight oath': { hash: 169992088, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/6ca8ec2c9357f440f31a6f8bc3bb96f6.jpg' },
  'tyranny of heaven': { hash: 543990593, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/b4d39e31c777026b40e6acf2f7c6f720.jpg' },
  'transfiguration': { hash: 268816284, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/a8e4ad15ecf0dc1ef41e0635eb8a1eb7.jpg' },
  'hierarchy of needs': { hash: 4174431791, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/8c32410000243e6024130f755b23fbe6.jpg' },
  'zaouli\'s wrath': { hash: 431721920, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/d11aa112b88dc2cbf48706fdad606710.jpg' },
  'forgiveness': { hash: 1552443158, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/323b94022d9b22d3ec7f0f405476c6b9.jpg' },
  'terminus horizon': { hash: 487205709, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/00cca0594c0db3371104f01ab9c0bbd2.jpg' },
  'heartshadow': { hash: 3664831848, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/94c6933727fa885fb2002a8c7aee5e42.jpg' },
  'incursion': { hash: 3460576091, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/084c8f65d56ce5d74718d49b17874315.jpg' },
  'fixed odds': { hash: 1642384931, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/2f976faa5043ea86212e079c84ff6683.jpg' },
  'navigator': { hash: 1441805468, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/4984c634a7d2eca3baafc000a121263d.jpg' },
  'rufus\'s fire': { hash: 3153641810, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/1d7964be3a2985699b2fe6cc9e549119.jpg' },
  'under your skin': { hash: 232928045, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/55f0894be17c8fac859990cb7c39e96c.jpg' },
  'out of bounds': { hash: 1134559590, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/34d48b131353ccaa2ac6f137aa2165b4.jpg' },
  'ballista': { hash: 2136808079, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/11c64dd593413b7489406f06f90099ad.jpg' },
  'militia\'s birthright': { hash: 40394833, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/b6624ac9c56f8d583f7b1951f29815e4.jpg' },
  'long goodbye': { hash: 2154059444, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/aad3dcc28bf0a6a6c5fd44b0df4981e4.jpg' },
  'heretic': { hash: 2136808079, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/11c64dd593413b7489406f06f90099ad.jpg' },
  'perfect pitch': { hash: 2191451996, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/fcc70cc3dc941e73d3c3787f11a23e96.jpg' },
  'ikelos smg': { hash: 1723472487, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/fcb5c23bfb9ce953eae54a812aea6dcb.jpg' },
  'midnight coup': { hash: 723070326, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/a16c0c62d2153cb59ca7dd5565d66d6a.jpg' },
  'dark age arsenal': { hash: 1715740932, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/aa09a244dc230894e955d23e62fa8a2d.jpg' },
  'incisor': { hash: 1711056134, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/19a4d34ce17f315aedc638799bf5a106.jpg' },
  'outlast': { hash: 299665907, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/21e112cb3b33a304f2609c19228bbe23.jpg' },
  'vesper\'s host': { hash: 1220605797, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/8c6e9159014b670c7e316aee4b1df3a8.jpg' },
  'cold comfort': { hash: 291447487, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/73df86cf465cf85ef39833d175c2e443.jpg' },
  'touch of malice catalyst': { hash: 1557274655, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/ce71024d7d432d5b0d912eca78a863d0.jpg' },
  'zaouli\'s bane': { hash: 431721920, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/d11aa112b88dc2cbf48706fdad606710.jpg' },
  'warlord\'s spear': { hash: 1715740932, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/aa09a244dc230894e955d23e62fa8a2d.jpg' },
  'thoughtless': { hash: 3153641810, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/1d7964be3a2985699b2fe6cc9e549119.jpg' },
  'acacia\'s dejection': { hash: 184990290, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/255be304412b4f0f3d880cb7e46ca256.jpg' },
  'word of crota': { hash: 120706239, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/4b9f5e2f929b5f7c1730e28ec880b989.jpg' },
  'abyss defiant': { hash: 457816674, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/3a166cd64dc18fff429e9e5992e44055.jpg' },
  'prime zealot cuirass': { hash: 503192607, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/f8f4b1a69763ce8cb57e50766aec57b0.jpg' },
  'bushido plate': { hash: 2199272806, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/134e2b3d67cd29b02b44335a50811c4e.jpg' },
  'fused aurum plate': { hash: 297586990, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/5f1f250ce3d193ab0a2fbb4f1dd9edd9.jpg' },
  'willbreaker\'s resolve': { hash: 1261894567, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/085588e2060e44767daae207d9c01369.jpg' },
  'moonfang-x7 rig': { hash: 4121885325, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/126c46bab9197786f36784496dce46d5.jpg' },
  'resonant fury plate': { hash: 590535108, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/c79a9f20d449419d6d8a68d8c990818d.jpg' },
  'eidolon pursuant plate': { hash: 2288543943, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/e3f6db7553b9035aa0f9bbdb7b26d269.jpg' },
  'legacy\'s oath plate': { hash: 751162931, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/9ed0ee27a295dddad1e5cd070446c5b8.jpg' },
  'untethered edge plate': { hash: 1183187516, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/cdd4aeaae2af5aec1314eae0f70d7cfe.jpg' },
  'twofold crown plate': { hash: 1230148081, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/4439ef7e2caa68cd26ba2856c45148c7.jpg' },
  'opulent duelist plate': { hash: 1908254109, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/d03111c9a454610ca43141e2dc29d72f.jpg' },
  'reverie dawn plate': { hash: 934704429, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/802c83f2da9c2f198037506c148c51fe.jpg' },
  'seventh seraph plate': { hash: 630719097, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/4379fe18461abe14490caf0532d8f686.jpg' },
  'temptation\'s bond': { hash: 1141217085, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/ca41a99b4cff4dae2b5e99921cdf6d69.jpg' },
  'deep explorer plate': { hash: 2458622621, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/018014859a1ddf8838f931785669dd65.jpg' },
  'mark of the unassailable': { hash: 1904199788, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/c32f4e1c6f727cd337fc710a4cee168b.jpg' },
  'tusked allegiance plate': { hash: 438108034, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/4762f1467aece59fc478edfa285144cc.jpg' },
  'dark age chestrig': { hash: 818195096, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/d4c0cabaf876a70b1853cc8a2681313f.jpg' },
  'braytech combat vest': { hash: 2656719840, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/638e6d7fc63bd04705f50ffed8be1fb3.jpg' },
  'duality': { hash: 3460576091, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/084c8f65d56ce5d74718d49b17874315.jpg' },
  'xenophage catalyst': { hash: 2113691818, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/45cbc6ac7c8caf987d9e5071e10a1b4f.jpg' },
  'ikelos_smg_v1.0.1': { hash: 1723472487, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/fcb5c23bfb9ce953eae54a812aea6dcb.jpg' },
  'ikelos_sg_v1.0.1': { hash: 1887808042, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/cba43299108f3b5fc2d599b6ec81b3ec.jpg' },
  'ikelos_sr_v1.0.1': { hash: 847450546, entity: 'DestinyInventoryItemDefinition', iconPath: '/common/destiny2_content/icons/79ab4d855d6dc199cec89af1480c14f9.jpg' },
}

export function catalogLookup(name: string): CatalogEntry | undefined {
  const key = name.trim().toLowerCase()
  const entry = ITEM_CATALOG[key]
  if (!entry) return undefined
  const iconPath = entry.iconPath ?? ITEM_ICON_PATHS[key]
  return iconPath ? { ...entry, iconPath } : entry
}

export const MOCK_EMBLEM_HASHES = [29194593, 31953746, 54004489, 54004491, 19962737, 10493725]
