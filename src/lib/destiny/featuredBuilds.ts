/**
 * Featured / curated loadouts. Not player posts.
 * Researched 20 Oct 2026 from Blueberries.gg class lists (Hunter page titled
 * Renegades; Titan list updated 29 Jul 2026; Warlock list updated 4 Aug 2026)
 * and the togame.io PvE meta note for the Praxic Blade sword tanks.
 * Item hashes come only from the bundled Bungie manifest catalog. A name with
 * no catalog entry is kept, and its hash is left unset.
 */

import type { ArmorStatKey } from '@/lib/destiny/armorStats'
import type { CommunityActivityTag, CommunityBuildPlug, CommunityBuildRecord } from '@/lib/destiny/communityBuildModel'
import { catalogLookup } from '@/lib/destiny/itemsCatalog'
import type { DestinyCharacterClass, DestinyIconRef } from '@/lib/destiny/types'

export const FEATURED_BUILD_SEED_VERSION = '2026-10-20'
export const FEATURED_BUILD_OWNER_ID = 'featured'
export const FEATURED_BUILD_OWNER_NAME = 'Featured'

export interface FeaturedBuildSpec {
  id: string
  name: string
  characterClass: DestinyCharacterClass
  subclass: string
  exoticArmor: string
  exoticWeapon?: string
  weapons: string[]
  aspects: string[]
  fragments: string[]
  mods: string[]
  statFocus: ArmorStatKey[]
  activityTags: CommunityActivityTag[]
  description: string
  creditName: string
  creditUrl: string
  rank: number
}

const BB_HUNTER = 'https://www.blueberries.gg/armor/destiny-2-hunter-builds/'
const BB_TITAN = 'https://www.blueberries.gg/armor/destiny-2-titan-builds/'
const BB_WARLOCK = 'https://www.blueberries.gg/armor/destiny-2-warlock-builds/'
const TOGAME = 'https://togame.io/a/destiny2-pve-loadout-meta/'

export const FEATURED_BUILD_SPECS: FeaturedBuildSpec[] = [
  {
    id: 'f47a0001-0000-4000-8000-000000000001',
    name: 'Gift of the Tempest',
    characterClass: 'hunter',
    subclass: 'Arc',
    exoticArmor: 'Gifted Conviction',
    exoticWeapon: 'Praxic Blade',
    weapons: ['Praxic Blade'],
    aspects: ['Ascension'],
    fragments: ['Spark of Amplitude', 'Spark of Magnitude'],
    mods: ['Harmonic Siphon', 'Recuperation'],
    statFocus: ['Melee', 'Class', 'Health'],
    activityTags: ['raid', 'gm'],
    description:
      'Blueberries.gg ranks this the #1 Hunter PvE build. Gifted Conviction with Ascension: jolting nearby targets grants damage resistance. Arc weapons help. Praxic Blade is the heavy they call out.',
    creditName: 'Blueberries.gg',
    creditUrl: BB_HUNTER,
    rank: 1,
  },
  {
    id: 'f47a0001-0000-4000-8000-000000000002',
    name: 'One-Two Grapple',
    characterClass: 'hunter',
    subclass: 'Prismatic',
    exoticArmor: 'Gifted Conviction',
    exoticWeapon: 'Praxic Blade',
    weapons: ['Praxic Blade'],
    aspects: ['Stylish Executioner', 'Ascension'],
    fragments: ['Facet of Courage', 'Facet of Grace', 'Facet of Ruin'],
    mods: ['Harmonic Siphon', 'Innervation'],
    statFocus: ['Melee', 'Class'],
    activityTags: ['raid', 'dungeon'],
    description:
      'Blueberries.gg ranks this #3 Hunter PvE. A grapple and melee loop on Prismatic with Gifted Conviction. Praxic Blade is the heavy they pair with the same Gifted Conviction hunters.',
    creditName: 'Blueberries.gg',
    creditUrl: BB_HUNTER,
    rank: 3,
  },
  {
    id: 'f47a0001-0000-4000-8000-000000000003',
    name: 'Stealthed Gyrfalcon',
    characterClass: 'hunter',
    subclass: 'Void',
    exoticArmor: "Gyrfalcon's Hauberk",
    exoticWeapon: 'Collective Obligation',
    weapons: ['Collective Obligation'],
    aspects: ['Stylish Executioner'],
    fragments: [],
    mods: ['Harmonic Siphon', 'Recuperation'],
    statFocus: ['Weapons', 'Class'],
    activityTags: ['raid', 'dungeon', 'gm'],
    description:
      'Blueberries.gg ranks this #4 Hunter PvE. Gyrfalcon’s Hauberk plus a Void weapon. They specifically name Collective Obligation, Graviton Lance, and The Manticore as Repulsor Brace options. Collective Obligation is the one in our manifest catalog.',
    creditName: 'Blueberries.gg',
    creditUrl: BB_HUNTER,
    rank: 4,
  },
  {
    id: 'f47a0001-0000-4000-8000-000000000004',
    name: 'Jolting Resolve',
    characterClass: 'hunter',
    subclass: 'Prismatic',
    exoticArmor: 'Gifted Conviction',
    weapons: [],
    aspects: ['Ascension'],
    fragments: [],
    mods: ['Harmonic Siphon'],
    statFocus: ['Melee', 'Class'],
    activityTags: ['raid', 'gm'],
    description:
      'Blueberries.gg ranks this #5 Hunter PvE. Gifted Conviction again: Ascension or Tempest Strike throws jolting explosives, and jolting targets grants damage resistance. They recommend a strong kinetic such as Multimach CCX.',
    creditName: 'Blueberries.gg',
    creditUrl: BB_HUNTER,
    rank: 5,
  },
  {
    id: 'f47a0001-0000-4000-8000-000000000005',
    name: 'The Transcendent Tank',
    characterClass: 'hunter',
    subclass: 'Prismatic',
    exoticArmor: 'Relativism',
    weapons: [],
    aspects: ['Stylish Executioner', 'Ascension'],
    fragments: ['Facet of Courage', 'Facet of Protection'],
    mods: ['Recuperation'],
    statFocus: ['Grenade', 'Melee', 'Class'],
    activityTags: ['gm', 'raid'],
    description:
      'Blueberries.gg ranks this #2 Hunter PvE for Grandmasters. The exotic is the class item Relativism with Spirit of Inmost Light and Spirit of Cyrtarachne. Aspects they list: Stylish Executioner and Ascension. Grapple, Threaded Spike, Gambler’s Dodge.',
    creditName: 'Blueberries.gg',
    creditUrl: BB_HUNTER,
    rank: 2,
  },
  {
    id: 'f47a0001-0000-4000-8000-000000000006',
    name: 'Gunpowder Guru',
    characterClass: 'hunter',
    subclass: 'Prismatic',
    exoticArmor: 'Relativism',
    weapons: [],
    aspects: [],
    fragments: [],
    mods: [],
    statFocus: ['Grenade', 'Weapons'],
    activityTags: ['raid', 'dungeon'],
    description:
      'Blueberries.gg ranks this #6 Hunter PvE. Relativism with Spirit of Verity, so the grenade you choose deals more damage. Match a weapon to that grenade element. Open the guide for the full fragment list.',
    creditName: 'Blueberries.gg',
    creditUrl: BB_HUNTER,
    rank: 6,
  },
  {
    id: 'f47a0002-0000-4000-8000-000000000001',
    name: 'Come on and Slam',
    characterClass: 'titan',
    subclass: 'Prismatic',
    exoticArmor: 'Wormgod Caress',
    weapons: [],
    aspects: ['Consecration', 'Diamond Lance'],
    fragments: ['Facet of Ruin', 'Facet of Protection'],
    mods: ['Better Already', 'Recuperation'],
    statFocus: ['Melee', 'Grenade', 'Class'],
    activityTags: ['raid', 'dungeon'],
    description:
      'Blueberries.gg ranks this the #1 Titan PvE build. Prismatic slam: Consecration and Knockout (Diamond Lance is their alternative aspect). Glacier grenade, Frenzied Blade, Thruster. The exotic they pair with this slam is Wormgod Caress.',
    creditName: 'Blueberries.gg',
    creditUrl: BB_TITAN,
    rank: 1,
  },
  {
    id: 'f47a0002-0000-4000-8000-000000000002',
    name: "Wormgod's Roar",
    characterClass: 'titan',
    subclass: 'Solar',
    exoticArmor: 'Wormgod Caress',
    weapons: [],
    aspects: [],
    fragments: [],
    mods: ['Better Already', 'Recuperation'],
    statFocus: ['Melee', 'Weapons'],
    activityTags: ['raid', 'dungeon'],
    description:
      'Blueberries.gg ranks this #2 Titan PvE, a Solar endgame melee build on Wormgod Caress. It is a different setup from the Prismatic slam listed above. Open the guide for the solar aspect picks.',
    creditName: 'Blueberries.gg',
    creditUrl: BB_TITAN,
    rank: 2,
  },
  {
    id: 'f47a0002-0000-4000-8000-000000000003',
    name: 'Arc Overload',
    characterClass: 'titan',
    subclass: 'Arc',
    exoticArmor: 'Cuirass of the Falling Star',
    weapons: [],
    aspects: [],
    fragments: [],
    mods: ['Recuperation'],
    statFocus: ['Weapons', 'Super', 'Class'],
    activityTags: ['raid', 'dungeon'],
    description:
      'Blueberries.gg ranks this #3 Titan PvE. Cuirass of the Falling Star with Thundercrash. They want an Arc weapon with Trickle Charge and Anarchy as the heavy. Rally Barricade, Seismic Strike, Pulse Grenade.',
    creditName: 'Blueberries.gg',
    creditUrl: BB_TITAN,
    rank: 3,
  },
  {
    id: 'f47a0002-0000-4000-8000-000000000004',
    name: 'Super Supreme',
    characterClass: 'titan',
    subclass: 'Prismatic',
    exoticArmor: 'Stoicism',
    weapons: [],
    aspects: ['Consecration'],
    fragments: ['Facet of Courage', 'Facet of Protection'],
    mods: ['Harmonic Siphon'],
    statFocus: ['Super', 'Weapons', 'Melee'],
    activityTags: ['raid', 'dungeon'],
    description:
      'Blueberries.gg ranks this #4 Titan PvE. Exotic class item Stoicism with Spirit of the Star-Eater and Eternal Warrior, plus a heavy that matches your Super. Aspects they list: Knockout and Consecration.',
    creditName: 'Blueberries.gg',
    creditUrl: BB_TITAN,
    rank: 4,
  },
  {
    id: 'f47a0002-0000-4000-8000-000000000005',
    name: 'Choir of None',
    characterClass: 'titan',
    subclass: 'Void',
    exoticArmor: '',
    weapons: [],
    aspects: [],
    fragments: [],
    mods: ['Harmonic Siphon'],
    statFocus: ['Weapons', 'Melee', 'Grenade'],
    activityTags: ['raid', 'dungeon'],
    description:
      'Blueberries.gg ranks this #5 Titan PvE. Void: Controlled Demolition and Offensive Bulwark, Shield Throw, and Vortex Grenade. The guide’s armor exotic is on the linked page; this card does not guess a name that was not in the verified text. They recommend a 4-piece Last Discipline set.',
    creditName: 'Blueberries.gg',
    creditUrl: BB_TITAN,
    rank: 5,
  },
  {
    id: 'f47a0002-0000-4000-8000-000000000006',
    name: 'Praxic Blade Stronghold',
    characterClass: 'titan',
    subclass: 'Prismatic',
    exoticArmor: 'Stronghold',
    exoticWeapon: 'Praxic Blade',
    weapons: ['Praxic Blade'],
    aspects: ['Diamond Lance', 'Unbreakable'],
    fragments: ['Facet of Courage', 'Facet of Grace', 'Facet of Ruin'],
    mods: ['Harmonic Siphon', 'Better Already', 'Innervation'],
    statFocus: ['Weapons', 'Class', 'Health'],
    activityTags: ['raid', 'dungeon'],
    description:
      'togame.io’s PvE meta note: Praxic Blade with Stronghold so the sword block stays up. A frontline pick when the fireteam needs someone who does not go down during a damage phase. Praxic Blade is the current exotic sword those guides are building around.',
    creditName: 'togame.io',
    creditUrl: TOGAME,
    rank: 6,
  },
  {
    id: 'f47a0003-0000-4000-8000-000000000001',
    name: 'Well Swap Eunoia',
    characterClass: 'warlock',
    subclass: 'Solar',
    exoticArmor: 'Eunoia',
    weapons: [],
    aspects: ['Hellion', 'Touch of Flame'],
    fragments: ['Ember of Ashes', 'Ember of Char'],
    mods: ['Better Already', 'Bomber'],
    statFocus: ['Grenade', 'Weapons', 'Super'],
    activityTags: ['raid', 'dungeon'],
    description:
      'Blueberries.gg ranks this the #1 Warlock PvE build for raid and dungeon damage. Stay on Eunoia (Hellion) for add clear, then swap to Boots of the Assembler before the damage phase for Well of Radiance. Phoenix Dive, Incinerator Snap, Healing Grenade.',
    creditName: 'Blueberries.gg',
    creditUrl: BB_WARLOCK,
    rank: 1,
  },
  {
    id: 'f47a0003-0000-4000-8000-000000000002',
    name: 'Prismatic Artist',
    characterClass: 'warlock',
    subclass: 'Prismatic',
    exoticArmor: 'Getaway Artist',
    weapons: [],
    aspects: ['Feed the Void', 'Hellion'],
    fragments: ['Facet of Courage', 'Facet of Protection'],
    mods: ['Ashes to Assets', 'Firepower', 'Better Already'],
    statFocus: ['Grenade', 'Weapons', 'Super'],
    activityTags: ['raid', 'dungeon', 'gm'],
    description:
      'Blueberries.gg ranks this #2 Warlock PvE for roaming content. Getaway Artist on Prismatic with Feed the Void and Hellion. Needlestorm, Healing Rift, Arcane Needle, Storm Grenade.',
    creditName: 'Blueberries.gg',
    creditUrl: BB_WARLOCK,
    rank: 2,
  },
  {
    id: 'f47a0003-0000-4000-8000-000000000003',
    name: 'Infinite Chaos',
    characterClass: 'warlock',
    subclass: 'Arc',
    exoticArmor: 'Geomag Stabilizers',
    weapons: [],
    aspects: ['Electrostatic Mind'],
    fragments: [],
    mods: ['Better Already'],
    statFocus: ['Super', 'Melee', 'Weapons'],
    activityTags: ['raid', 'gm'],
    description:
      'Blueberries.gg ranks this #3 Warlock PvE. Arc Chaos Reach with Ionic Sentry and Electrostatic Mind. Geomag Stabilizers is the exotic that extends Chaos Reach; confirm the armor row on the linked page before you farm it.',
    creditName: 'Blueberries.gg',
    creditUrl: BB_WARLOCK,
    rank: 3,
  },
  {
    id: 'f47a0003-0000-4000-8000-000000000004',
    name: 'Feed the Swarm',
    characterClass: 'warlock',
    subclass: 'Strand',
    exoticArmor: 'Swarmers',
    weapons: [],
    aspects: [],
    fragments: [],
    mods: [],
    statFocus: ['Grenade', 'Weapons'],
    activityTags: ['raid', 'dungeon'],
    description:
      'Blueberries.gg ranks this #4 Warlock PvE, a Strand roaming build. The exotic is Swarmers. Open the guide for the threadling aspects and the weapon pair they are using this season.',
    creditName: 'Blueberries.gg',
    creditUrl: BB_WARLOCK,
    rank: 4,
  },
  {
    id: 'f47a0003-0000-4000-8000-000000000005',
    name: 'Hellfire',
    characterClass: 'warlock',
    subclass: 'Solar',
    exoticArmor: "Winter's Guile",
    weapons: [],
    aspects: ['Touch of Flame'],
    fragments: ['Ember of Benevolence'],
    mods: [],
    statFocus: ['Melee', 'Weapons', 'Super'],
    activityTags: ['raid', 'dungeon'],
    description:
      'Blueberries.gg ranks this #5 Warlock PvE for burst damage. Mandatory gear they name: Winter’s Guile, a Threat Level with One-Two Punch and Trench Barrel, and a glaive in the energy slot. Touch of Flame and Icarus Dash. Song of Flame, Phoenix Dive, Celestial Fire, Healing Grenade.',
    creditName: 'Blueberries.gg',
    creditUrl: BB_WARLOCK,
    rank: 5,
  },
  {
    id: 'f47a0003-0000-4000-8000-000000000006',
    name: 'Praxic Getaway',
    characterClass: 'warlock',
    subclass: 'Prismatic',
    exoticArmor: 'Getaway Artist',
    exoticWeapon: 'Praxic Blade',
    weapons: ['Outbreak Perfected', 'Witherhoard', 'Praxic Blade'],
    aspects: [],
    fragments: ['Facet of Courage', 'Facet of Protection', 'Facet of Devotion'],
    mods: ['Harmonic Siphon', 'Better Already', 'Innervation', 'Recuperation'],
    statFocus: ['Grenade', 'Class', 'Health'],
    activityTags: ['gm', 'raid'],
    description:
      'togame.io’s PvE meta note for Grandmasters: Getaway Artist with Praxic Blade as the heavy, plus Outbreak Perfected and Witherhoard. A sustain pick when the group is under-leveled for a nightfall. Aspect names on that page did not match manifest items, so this card lists the weapons and fragments only.',
    creditName: 'togame.io',
    creditUrl: TOGAME,
    rank: 6,
  },
]

function bungieIcon(iconPath?: string): string | undefined {
  if (!iconPath || !iconPath.startsWith('/')) return undefined
  return `https://www.bungie.net${iconPath}`
}

/** Hash and icon only when the bundled manifest catalog has this exact item. */
export function manifestRefForName(name: string): DestinyIconRef | undefined {
  const trimmed = name.trim()
  if (!trimmed) return undefined
  const entry = catalogLookup(trimmed)
  if (!entry) return { name: trimmed }
  if (entry.entity !== 'DestinyInventoryItemDefinition' && entry.entity !== 'DestinySandboxPerkDefinition') {
    return { name: trimmed }
  }
  const ref: DestinyIconRef = { name: trimmed, hash: entry.hash, entityType: entry.entity }
  const iconUrl = bungieIcon(entry.iconPath)
  if (iconUrl) ref.iconUrl = iconUrl
  return ref
}

function plugFor(name: string): CommunityBuildPlug {
  const ref = manifestRefForName(name)
  const plug: CommunityBuildPlug = { name: ref?.name ?? name.trim() }
  if (ref?.hash) plug.hash = ref.hash
  if (ref?.iconUrl) plug.iconUrl = ref.iconUrl
  return plug
}

export function featuredBuildRecord(spec: FeaturedBuildSpec, now = '2026-10-20T00:00:00.000Z'): CommunityBuildRecord {
  const armor = manifestRefForName(spec.exoticArmor)
  const weapon = spec.exoticWeapon ? manifestRefForName(spec.exoticWeapon) : undefined
  return {
    id: spec.id,
    name: spec.name,
    characterClass: spec.characterClass,
    subclass: spec.subclass,
    aspects: spec.aspects.map(plugFor),
    fragments: spec.fragments.map(plugFor),
    exoticArmor: spec.exoticArmor,
    ...(armor?.hash ? { exoticArmorRef: armor } : {}),
    exoticWeapon: spec.exoticWeapon ?? '',
    ...(weapon?.hash ? { exoticWeaponRef: weapon } : {}),
    mods: spec.mods.map(plugFor),
    statFocus: spec.statFocus,
    activityTags: spec.activityTags,
    description: spec.description,
    source: 'manual',
    ownerUserId: FEATURED_BUILD_OWNER_ID,
    ownerDisplayName: FEATURED_BUILD_OWNER_NAME,
    status: 'published',
    upvoteCount: 0,
    saveCount: 0,
    commentCount: 0,
    createdAt: now,
    updatedAt: now,
    listing: 'featured',
    creditName: spec.creditName,
    creditUrl: spec.creditUrl,
    seedVersion: FEATURED_BUILD_SEED_VERSION,
    featuredRank: spec.rank,
  }
}

export function featuredBuildRecords(now?: string): CommunityBuildRecord[] {
  return FEATURED_BUILD_SPECS.map((spec) => featuredBuildRecord(spec, now))
}

export function featuredBuildById(id: string): CommunityBuildRecord | null {
  const spec = FEATURED_BUILD_SPECS.find((row) => row.id === id)
  return spec ? featuredBuildRecord(spec) : null
}

export function featuredBuildsForClass(characterClass: DestinyCharacterClass): FeaturedBuildSpec[] {
  return FEATURED_BUILD_SPECS.filter((spec) => spec.characterClass === characterClass).sort((a, b) => a.rank - b.rank)
}
