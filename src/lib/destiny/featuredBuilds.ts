/**
 * Featured / curated loadouts. Not player posts.
 * Researched 20 Oct 2026 from Blueberries.gg class lists (Hunter page titled
 * Renegades; Titan list updated 29 Jul 2026; Warlock list updated 4 Aug 2026)
 * and the togame.io PvE meta note for the Praxic Blade sword tanks.
 * Item hashes come only from the bundled Bungie manifest catalog. A name with
 * no catalog entry is kept, and its hash is left unset.
 */

import type { ArmorStatKey } from '@/lib/destiny/armorStats'
import type {
  CommunityActivityTag,
  CommunityBuildAbility,
  CommunityBuildPlug,
  CommunityBuildRecord,
} from '@/lib/destiny/communityBuildModel'
import { catalogLookup } from '@/lib/destiny/itemsCatalog'
import type { DestinyCharacterClass, DestinyIconRef } from '@/lib/destiny/types'

export const FEATURED_BUILD_SEED_VERSION = '2026-11-02'
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
  superAbility: string
  grenade: string
  melee: string
  classAbility: string
  playNotes: string
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
    weapons: ['Fatebringer', 'IKELOS SMG', 'Praxic Blade'],
    aspects: ['Ascension', 'Flow State'],
    fragments: ['Spark of Amplitude', 'Spark of Magnitude', 'Spark of Volts'],
    mods: ['Harmonic Siphon', 'Recuperation', 'Impact Induction'],
    statFocus: ['Melee', 'Class', 'Health'],
    activityTags: ['raid', 'gm'],
    superAbility: 'Gathering Storm',
    grenade: 'Pulse Grenade',
    melee: 'Combination Blow',
    classAbility: "Gambler's Dodge",
    playNotes: 'Jolt a pack with Ascension, then finish the boss with Praxic Blade.',
    description:
      'Jolt a pack with Ascension, then finish the boss with Praxic Blade.',
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
    weapons: ['Submission', 'IKELOS SMG', 'Praxic Blade'],
    aspects: ['Stylish Executioner', 'Ascension'],
    fragments: ['Facet of Courage', 'Facet of Grace', 'Facet of Ruin'],
    mods: ['Harmonic Siphon', 'Innervation', 'Recuperation'],
    statFocus: ['Melee', 'Class', 'Grenade'],
    activityTags: ['raid', 'dungeon'],
    superAbility: 'Gathering Storm',
    grenade: 'Grapple',
    melee: 'Combination Blow',
    classAbility: "Gambler's Dodge",
    playNotes: 'Grapple in, melee for Jolt, then heavy with Praxic Blade.',
    description: 'Grapple in, melee for Jolt, then heavy with Praxic Blade.',
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
    weapons: ['Fatebringer', 'Collective Obligation', 'Commemoration'],
    aspects: ['Stylish Executioner', 'On the Prowl'],
    fragments: ['Echo of Instability', 'Echo of Remnants', 'Echo of Undermining'],
    mods: ['Harmonic Siphon', 'Recuperation', 'Innervation'],
    statFocus: ['Weapons', 'Class', 'Grenade'],
    activityTags: ['raid', 'dungeon', 'gm'],
    superAbility: 'Shadowshot: Deadfall',
    grenade: 'Vortex Grenade',
    melee: 'Snare Bomb',
    classAbility: "Gambler's Dodge",
    playNotes: 'Go invisible, weaken with Collective Obligation, then dump Commemoration.',
    description: 'Go invisible, weaken with Collective Obligation, then dump Commemoration.',
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
    exoticWeapon: 'Outbreak Perfected',
    weapons: ['Outbreak Perfected', 'IKELOS SMG', 'Thunderlord'],
    aspects: ['Ascension', 'Stylish Executioner'],
    fragments: ['Facet of Courage', 'Facet of Protection', 'Facet of Grace'],
    mods: ['Harmonic Siphon', 'Recuperation', 'Better Already'],
    statFocus: ['Melee', 'Class', 'Weapons'],
    activityTags: ['raid', 'gm'],
    superAbility: 'Gathering Storm',
    grenade: 'Pulse Grenade',
    melee: 'Combination Blow',
    classAbility: "Gambler's Dodge",
    playNotes: 'Jolt with Ascension for the resist, then Outbreak the stunned target.',
    description: 'Jolt with Ascension for the resist, then Outbreak the stunned target.',
    creditName: 'Blueberries.gg',
    creditUrl: BB_HUNTER,
    rank: 5,
  },
  {
    id: 'f47a0001-0000-4000-8000-000000000005',
    name: 'The Transcendent Tank',
    characterClass: 'hunter',
    subclass: 'Prismatic',
    exoticArmor: 'Star-Eater Scales',
    exoticWeapon: 'Gjallarhorn',
    weapons: ['Witherhoard', 'IKELOS SMG', 'Gjallarhorn'],
    aspects: ['Stylish Executioner', 'Ascension'],
    fragments: ['Facet of Courage', 'Facet of Protection', 'Facet of Devotion'],
    mods: ['Recuperation', 'Better Already', 'Innervation'],
    statFocus: ['Grenade', 'Melee', 'Class'],
    activityTags: ['gm', 'raid'],
    superAbility: 'Gathering Storm',
    grenade: 'Grapple',
    melee: 'Combination Blow',
    classAbility: "Gambler's Dodge",
    playNotes: 'Bank orbs, Grapple the adds, then Star-Eater Gathering Storm on the boss.',
    description: 'Bank orbs, Grapple the adds, then Star-Eater Gathering Storm on the boss.',
    creditName: 'Blueberries.gg',
    creditUrl: BB_HUNTER,
    rank: 2,
  },
  {
    id: 'f47a0001-0000-4000-8000-000000000006',
    name: 'Gunpowder Guru',
    characterClass: 'hunter',
    subclass: 'Prismatic',
    exoticArmor: 'Lucky Pants',
    exoticWeapon: 'Xenophage',
    weapons: ['Fatebringer', 'Explosive Personality', 'Xenophage'],
    aspects: ['Stylish Executioner', 'Ascension'],
    fragments: ['Facet of Ruin', 'Facet of Courage', 'Facet of Grace'],
    mods: ['Harmonic Siphon', 'Firepower', 'Recuperation'],
    statFocus: ['Grenade', 'Weapons', 'Class'],
    activityTags: ['raid', 'dungeon'],
    superAbility: 'Gathering Storm',
    grenade: 'Fusion Grenade',
    melee: 'Knife Trick',
    classAbility: "Gambler's Dodge",
    playNotes: 'Swap to Fatebringer for Lucky Pants, then grenade the pack.',
    description: 'Swap to Fatebringer for Lucky Pants, then grenade the pack.',
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
    exoticWeapon: 'Tractor Cannon',
    weapons: ['Heritage', 'IKELOS SMG', 'Tractor Cannon'],
    aspects: ['Consecration', 'Diamond Lance'],
    fragments: ['Facet of Ruin', 'Facet of Protection', 'Facet of Courage'],
    mods: ['Better Already', 'Recuperation', 'Impact Induction'],
    statFocus: ['Melee', 'Grenade', 'Class'],
    activityTags: ['raid', 'dungeon'],
    superAbility: 'Thundercrash',
    grenade: 'Glacier Grenade',
    melee: 'Frenzied Blade',
    classAbility: 'Thruster',
    playNotes: 'Consecrate into a Glacier, then Tractor Cannon so the team melts the boss.',
    description: 'Consecrate into a Glacier, then Tractor Cannon so the team melts the boss.',
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
    exoticWeapon: 'The Lament',
    weapons: ['Heritage', 'Explosive Personality', 'The Lament'],
    aspects: ['Roaring Flames', 'Consecration'],
    fragments: ['Ember of Ashes', 'Ember of Char', 'Ember of Benevolence'],
    mods: ['Better Already', 'Recuperation', 'Impact Induction'],
    statFocus: ['Melee', 'Weapons', 'Class'],
    activityTags: ['raid', 'dungeon'],
    superAbility: 'Hammer of Sol',
    grenade: 'Fusion Grenade',
    melee: 'Hammer Strike',
    classAbility: 'Towering Barricade',
    playNotes: 'Stack Roaring Flames, then Lament the champion.',
    description: 'Stack Roaring Flames, then Lament the champion.',
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
    exoticWeapon: 'Thunderlord',
    weapons: ['Fatebringer', 'IKELOS SMG', 'Thunderlord'],
    aspects: ['Touch of Thunder', 'Lightning Storm'],
    fragments: ['Spark of Amplitude', 'Spark of Magnitude', 'Spark of Volts'],
    mods: ['Recuperation', 'Harmonic Siphon', 'Innervation'],
    statFocus: ['Weapons', 'Super', 'Class'],
    activityTags: ['raid', 'dungeon'],
    superAbility: 'Thundercrash',
    grenade: 'Pulse Grenade',
    melee: 'Seismic Strike',
    classAbility: 'Rally Barricade',
    playNotes: 'Rally, Thundercrash in Cuirass, then Thunderlord the rest of the bar.',
    description: 'Rally, Thundercrash in Cuirass, then Thunderlord the rest of the bar.',
    creditName: 'Blueberries.gg',
    creditUrl: BB_TITAN,
    rank: 3,
  },
  {
    id: 'f47a0002-0000-4000-8000-000000000004',
    name: 'Super Supreme',
    characterClass: 'titan',
    subclass: 'Prismatic',
    exoticArmor: 'Hallowfire Heart',
    exoticWeapon: 'Gjallarhorn',
    weapons: ['Witherhoard', 'IKELOS SMG', 'Gjallarhorn'],
    aspects: ['Consecration', 'Diamond Lance'],
    fragments: ['Facet of Courage', 'Facet of Protection', 'Facet of Devotion'],
    mods: ['Harmonic Siphon', 'Ashes to Assets', 'Recuperation'],
    statFocus: ['Super', 'Weapons', 'Melee'],
    activityTags: ['raid', 'dungeon'],
    superAbility: 'Thundercrash',
    grenade: 'Fusion Grenade',
    melee: 'Frenzied Blade',
    classAbility: 'Thruster',
    playNotes: 'Spend the super. Hallowfire speeds the next one while Gjallarhorn covers the gap.',
    description: 'Spend the super. Hallowfire speeds the next one while Gjallarhorn covers the gap.',
    creditName: 'Blueberries.gg',
    creditUrl: BB_TITAN,
    rank: 4,
  },
  {
    id: 'f47a0002-0000-4000-8000-000000000005',
    name: 'Choir of None',
    characterClass: 'titan',
    subclass: 'Void',
    exoticArmor: 'Peacekeepers',
    exoticWeapon: 'Tractor Cannon',
    weapons: ['IKELOS SMG', 'Age-Old Bond', 'Tractor Cannon'],
    aspects: ['Unbreakable', 'Controlled Demolition'],
    fragments: ['Echo of Instability', 'Echo of Remnants', 'Echo of Undermining'],
    mods: ['Harmonic Siphon', 'Recuperation', 'Innervation'],
    statFocus: ['Weapons', 'Melee', 'Grenade'],
    activityTags: ['raid', 'dungeon'],
    superAbility: 'Ward of Dawn',
    grenade: 'Vortex Grenade',
    melee: 'Shield Throw',
    classAbility: 'Rally Barricade',
    playNotes: 'Drop Ward, weaken with Tractor Cannon, then Age-Old Bond.',
    description: 'Drop Ward, weaken with Tractor Cannon, then Age-Old Bond.',
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
    weapons: ['Heritage', 'IKELOS SMG', 'Praxic Blade'],
    aspects: ['Diamond Lance', 'Unbreakable'],
    fragments: ['Facet of Courage', 'Facet of Grace', 'Facet of Ruin'],
    mods: ['Harmonic Siphon', 'Better Already', 'Innervation'],
    statFocus: ['Weapons', 'Class', 'Health'],
    activityTags: ['raid', 'dungeon'],
    superAbility: 'Thundercrash',
    grenade: 'Glacier Grenade',
    melee: 'Frenzied Blade',
    classAbility: 'Towering Barricade',
    playNotes: 'Block with Praxic Blade. Stronghold keeps the guard up through damage.',
    description: 'Block with Praxic Blade. Stronghold keeps the guard up through damage.',
    creditName: 'togame.io',
    creditUrl: TOGAME,
    rank: 6,
  },
  {
    id: 'f47a0003-0000-4000-8000-000000000001',
    name: 'Well Swap Eunoia',
    characterClass: 'warlock',
    subclass: 'Solar',
    exoticArmor: 'Phoenix Protocol',
    exoticWeapon: 'Gjallarhorn',
    weapons: ['Witherhoard', 'Explosive Personality', 'Gjallarhorn'],
    aspects: ['Hellion', 'Touch of Flame'],
    fragments: ['Ember of Ashes', 'Ember of Char', 'Ember of Benevolence'],
    mods: ['Better Already', 'Bomber', 'Ashes to Assets'],
    statFocus: ['Grenade', 'Weapons', 'Super'],
    activityTags: ['raid', 'dungeon'],
    superAbility: 'Well of Radiance',
    grenade: 'Healing Grenade',
    melee: 'Incinerator Snap',
    classAbility: 'Phoenix Dive',
    playNotes: 'Phoenix Dive the adds, then Well of Radiance and Gjallarhorn for damage.',
    description: 'Phoenix Dive the adds, then Well of Radiance and Gjallarhorn for damage.',
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
    exoticWeapon: 'Outbreak Perfected',
    weapons: ['Outbreak Perfected', 'IKELOS SMG', 'Thunderlord'],
    aspects: ['Feed the Void', 'Hellion'],
    fragments: ['Facet of Courage', 'Facet of Protection', 'Facet of Devotion'],
    mods: ['Ashes to Assets', 'Firepower', 'Better Already'],
    statFocus: ['Grenade', 'Weapons', 'Super'],
    activityTags: ['raid', 'dungeon', 'gm'],
    superAbility: 'Needlestorm',
    grenade: 'Storm Grenade',
    melee: 'Arcane Needle',
    classAbility: 'Healing Rift',
    playNotes: 'Eat the grenade for the Arc Soul, then Outbreak while Devour is up.',
    description: 'Eat the grenade for the Arc Soul, then Outbreak while Devour is up.',
    creditName: 'Blueberries.gg',
    creditUrl: BB_WARLOCK,
    rank: 2,
  },
  {
    id: 'f47a0003-0000-4000-8000-000000000003',
    name: 'Infinite Chaos',
    characterClass: 'warlock',
    subclass: 'Arc',
    exoticArmor: "Stormdancer's Brace",
    exoticWeapon: 'Thunderlord',
    weapons: ['Fatebringer', 'IKELOS SMG', 'Thunderlord'],
    aspects: ['Electrostatic Mind', 'Lightning Storm'],
    fragments: ['Spark of Amplitude', 'Spark of Volts', 'Spark of Magnitude'],
    mods: ['Better Already', 'Ashes to Assets', 'Recuperation'],
    statFocus: ['Super', 'Melee', 'Weapons'],
    activityTags: ['raid', 'gm'],
    superAbility: 'Chaos Reach',
    grenade: 'Pulse Grenade',
    melee: 'Ball Lightning',
    classAbility: 'Healing Rift',
    playNotes: 'Jolt the room, then hold Chaos Reach. Stormdancer’s Brace stretches it.',
    description: 'Jolt the room, then hold Chaos Reach. Stormdancer’s Brace stretches it.',
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
    exoticWeapon: 'Wish-Keeper',
    weapons: ['Fatebringer', 'Wish-Keeper', 'Commemoration'],
    aspects: ["Weaver's Call", 'Mindspun Invocation'],
    fragments: ['Thread of Evolution', 'Thread of Generation', 'Thread of Rebirth'],
    mods: ['Grenade Font', 'Firepower', 'Recuperation'],
    statFocus: ['Grenade', 'Weapons', 'Class'],
    activityTags: ['raid', 'dungeon'],
    superAbility: 'Needlestorm',
    grenade: 'Threadling Grenade',
    melee: 'Arcane Needle',
    classAbility: 'Healing Rift',
    playNotes: 'Threadling grenade, perch Wish-Keeper, then Needlestorm the wave.',
    description: 'Threadling grenade, perch Wish-Keeper, then Needlestorm the wave.',
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
    exoticWeapon: 'Xenophage',
    weapons: ['Heritage', 'Explosive Personality', 'Xenophage'],
    aspects: ['Touch of Flame', 'Hellion'],
    fragments: ['Ember of Ashes', 'Ember of Benevolence', 'Ember of Char'],
    mods: ['Impact Induction', 'Firepower', 'Recuperation'],
    statFocus: ['Melee', 'Weapons', 'Super'],
    activityTags: ['raid', 'dungeon'],
    superAbility: 'Song of Flame',
    grenade: 'Fusion Grenade',
    melee: 'Celestial Fire',
    classAbility: 'Phoenix Dive',
    playNotes: 'Celestial Fire to stack Winter’s Guile, then Heritage and Xenophage.',
    description: 'Celestial Fire to stack Winter’s Guile, then Heritage and Xenophage.',
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
    aspects: ['Feed the Void', 'Hellion'],
    fragments: ['Facet of Courage', 'Facet of Protection', 'Facet of Devotion'],
    mods: ['Harmonic Siphon', 'Better Already', 'Innervation'],
    statFocus: ['Grenade', 'Class', 'Health'],
    activityTags: ['gm', 'raid'],
    superAbility: 'Needlestorm',
    grenade: 'Storm Grenade',
    melee: 'Arcane Needle',
    classAbility: 'Healing Rift',
    playNotes: 'Arc Soul up, Witherhoard the spawn, Praxic Blade anything that closes.',
    description: 'Arc Soul up, Witherhoard the spawn, Praxic Blade anything that closes.',
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
  const iconEntities = new Set([
    'DestinyInventoryItemDefinition',
    'DestinySandboxPerkDefinition',
    'DestinyDamageTypeDefinition',
  ])
  if (!iconEntities.has(entry.entity)) {
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

function abilityFor(slot: CommunityBuildAbility['slot'], name: string): CommunityBuildAbility {
  return { slot, ...plugFor(name) }
}

/** Official Bungie PGCR art, keyed by subclass element. */
export function elementBannerUrl(subclass: string): string {
  const key = subclass.trim().toLowerCase()
  const art: Record<string, string> = {
    arc: 'https://www.bungie.net/img/destiny_content/pgcr/raid_garden_of_salvation.jpg',
    solar: 'https://www.bungie.net/img/destiny_content/pgcr/raid_beanstalk.jpg',
    void: 'https://www.bungie.net/img/destiny_content/pgcr/raid_root_of_nightmares.jpg',
    stasis: 'https://www.bungie.net/img/destiny_content/pgcr/europa-raid-deep-stone-crypt.jpg',
    strand: 'https://www.bungie.net/img/destiny_content/pgcr/raid_splinter.jpg',
    prismatic: 'https://www.bungie.net/img/destiny_content/pgcr/vespers_host.jpg',
  }
  return art[key] ?? art.prismatic
}

export const BOARD_BANNER_URL = {
  raid: 'https://www.bungie.net/img/destiny_content/pgcr/europa-raid-deep-stone-crypt.jpg',
  dungeon: 'https://www.bungie.net/img/destiny_content/pgcr/dungeon_duality.jpg',
  new_bonds: 'https://www.bungie.net/img/destiny_content/pgcr/dungeon_ghosts_of_the_deep.jpg',
} as const

export function featuredBuildRecord(spec: FeaturedBuildSpec, now = '2026-10-20T00:00:00.000Z'): CommunityBuildRecord {
  const armor = manifestRefForName(spec.exoticArmor)
  const weapon = spec.exoticWeapon ? manifestRefForName(spec.exoticWeapon) : undefined
  const subclassRef = manifestRefForName(spec.subclass)
  return {
    id: spec.id,
    name: spec.name,
    characterClass: spec.characterClass,
    subclass: spec.subclass,
    ...(subclassRef?.iconUrl ? { subclassRef } : {}),
    aspects: spec.aspects.map(plugFor),
    fragments: spec.fragments.map(plugFor),
    exoticArmor: spec.exoticArmor,
    ...(armor ? { exoticArmorRef: armor } : {}),
    exoticWeapon: spec.exoticWeapon ?? '',
    ...(weapon ? { exoticWeaponRef: weapon } : {}),
    weapons: spec.weapons.map(plugFor),
    superAbility: plugFor(spec.superAbility),
    abilities: [
      abilityFor('grenade', spec.grenade),
      abilityFor('melee', spec.melee),
      abilityFor('class', spec.classAbility),
    ],
    playNotes: spec.playNotes,
    mods: spec.mods.map(plugFor),
    statFocus: spec.statFocus,
    activityTags: spec.activityTags,
    description: spec.playNotes || spec.description,
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
