/**
 * Featured / curated loadouts. Not player posts.
 * Audited 4 Nov 2026 against Monument of Triumph (Update 9.7.0, the current sandbox).
 * Item hashes come only from the bundled Bungie manifest catalog.
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

export const FEATURED_BUILD_SEED_VERSION = '2026-11-04'
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
const HALLOWFIRE = 'https://silvercontrail.wordpress.com/2026/06/24/hallowfire-heart-solar-titan-build-in-destiny-2/'
const LG_RAIDEN = 'https://www.light.gg/db/items/368733543/raiden-flux/'
const LG_STORMS = 'https://www.light.gg/db/items/1656549675/storms-keep/'
const LG_ARC_SOUL = 'https://www.light.gg/db/items/1293395731/arc-soul/'
const LG_STARFIRE = 'https://www.light.gg/db/items/599049453/starfire-protocol/'
const LG_TARRABAH = 'https://www.light.gg/db/items/3110698812/tarrabah/'
const LG_LUCKY = 'https://www.light.gg/db/items/193869522/lucky-pants/'
const LG_STRONGHOLD = 'https://www.light.gg/db/items/512777670/stronghold/'
const LG_GETAWAY = 'https://www.light.gg/db/items/3070357340/getaway-artist/'

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
    playNotes: 'Survivability. Jolt a pack with Ascension for Gifted Conviction resist, then close with Praxic Blade.',
    description:
      'GM survivability. Jolt a pack with Ascension for Gifted Conviction resist, then close with Praxic Blade.',
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
    playNotes: 'Add clear. Grapple in, melee for Jolt, then heavy with Praxic Blade.',
    description: 'Add clear. Grapple in, melee for Jolt, then heavy with Praxic Blade.',
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
    playNotes: 'Add clear. Go invisible, weaken with Collective Obligation, then dump Commemoration.',
    description: 'Add clear. Go invisible, weaken with Collective Obligation, then dump Commemoration.',
    creditName: 'Blueberries.gg',
    creditUrl: BB_HUNTER,
    rank: 4,
  },
  {
    id: 'f47a0001-0000-4000-8000-000000000004',
    name: 'Gathering Flux',
    characterClass: 'hunter',
    subclass: 'Arc',
    exoticArmor: 'Raiden Flux',
    exoticWeapon: 'Thunderlord',
    weapons: ['Fatebringer', 'IKELOS SMG', 'Thunderlord'],
    aspects: ['Flow State', 'Lethal Current'],
    fragments: ['Spark of Amplitude', 'Spark of Volts', 'Spark of Magnitude'],
    mods: ['Harmonic Siphon', 'Recuperation', 'Ashes to Assets'],
    statFocus: ['Super', 'Weapons', 'Class'],
    activityTags: ['raid', 'dungeon'],
    superAbility: 'Gathering Storm',
    grenade: 'Pulse Grenade',
    melee: 'Combination Blow',
    classAbility: "Gambler's Dodge",
    playNotes: 'Boss DPS. Cast Gathering Storm in Raiden Flux, then Thunderlord the rest of the bar.',
    description: 'Boss DPS. Cast Gathering Storm in Raiden Flux, then Thunderlord the rest of the bar.',
    creditName: 'light.gg',
    creditUrl: LG_RAIDEN,
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
    statFocus: ['Super', 'Weapons', 'Class'],
    activityTags: ['gm', 'raid'],
    superAbility: 'Gathering Storm',
    grenade: 'Grapple',
    melee: 'Combination Blow',
    classAbility: "Gambler's Dodge",
    playNotes: 'Boss DPS. Bank orbs, then Star-Eater Gathering Storm. Grapple is for the adds.',
    description: 'Boss DPS. Bank orbs, then Star-Eater Gathering Storm. Grapple is for the adds.',
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
    exoticWeapon: 'Witherhoard',
    weapons: ['Fatebringer', 'Witherhoard', 'Commemoration'],
    aspects: ['Stylish Executioner', 'Ascension'],
    fragments: ['Facet of Ruin', 'Facet of Courage', 'Facet of Grace'],
    mods: ['Harmonic Siphon', 'Firepower', 'Recuperation'],
    statFocus: ['Weapons', 'Class', 'Health'],
    activityTags: ['dungeon', 'raid'],
    superAbility: 'Gathering Storm',
    grenade: 'Fusion Grenade',
    melee: 'Knife Trick',
    classAbility: "Gambler's Dodge",
    playNotes: 'Boss burst. Ready Fatebringer so Lucky Pants ramps, then Witherhoard the spawn.',
    description: 'Boss burst. Ready Fatebringer so Lucky Pants ramps, then Witherhoard the spawn.',
    creditName: 'light.gg',
    creditUrl: LG_LUCKY,
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
    playNotes: 'Add clear. Consecrate into a Glacier to stun Unstoppables, then Tractor Cannon the boss.',
    description: 'Add clear. Consecrate into a Glacier to stun Unstoppables, then Tractor Cannon the boss.',
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
    playNotes: 'Champion damage. Stack Roaring Flames, then Lament the champion.',
    description: 'Champion damage. Stack Roaring Flames, then Lament the champion.',
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
    aspects: ['Touch of Thunder', "Storm's Keep"],
    fragments: ['Spark of Amplitude', 'Spark of Volts'],
    mods: ['Recuperation', 'Harmonic Siphon', 'Innervation'],
    statFocus: ['Super', 'Weapons', 'Class'],
    activityTags: ['raid', 'dungeon'],
    superAbility: 'Thundercrash',
    grenade: 'Pulse Grenade',
    melee: 'Seismic Strike',
    classAbility: 'Rally Barricade',
    playNotes: 'Boss DPS. Barricade for Storm\'s Keep Bolt Charge, then Cuirass Thundercrash.',
    description: 'Boss DPS. Barricade for Storm\'s Keep Bolt Charge, then Cuirass Thundercrash.',
    creditName: 'light.gg',
    creditUrl: LG_STORMS,
    rank: 3,
  },
  {
    id: 'f47a0002-0000-4000-8000-000000000004',
    name: 'Sunfire Furnace',
    characterClass: 'titan',
    subclass: 'Solar',
    exoticArmor: 'Hallowfire Heart',
    exoticWeapon: 'Gjallarhorn',
    weapons: ['Witherhoard', 'IKELOS SMG', 'Gjallarhorn'],
    aspects: ['Roaring Flames', 'Consecration'],
    fragments: ['Ember of Ashes', 'Ember of Char', 'Ember of Benevolence'],
    mods: ['Harmonic Siphon', 'Ashes to Assets', 'Recuperation'],
    statFocus: ['Grenade', 'Class', 'Super'],
    activityTags: ['raid', 'dungeon'],
    superAbility: 'Hammer of Sol',
    grenade: 'Fusion Grenade',
    melee: 'Hammer Strike',
    classAbility: 'Towering Barricade',
    playNotes: 'Ability uptime. Hold Hammer of Sol, stack Sunfire Furnace, then ignite with grenades.',
    description: 'Ability uptime. Hold Hammer of Sol, stack Sunfire Furnace, then ignite with grenades.',
    creditName: 'Contrails',
    creditUrl: HALLOWFIRE,
    rank: 4,
  },
  {
    id: 'f47a0002-0000-4000-8000-000000000005',
    name: 'Choir of None',
    characterClass: 'titan',
    subclass: 'Void',
    exoticArmor: 'Peacekeepers',
    exoticWeapon: 'Tarrabah',
    weapons: ['Submission', 'Tarrabah', 'Commemoration'],
    aspects: ['Unbreakable', 'Controlled Demolition'],
    fragments: ['Echo of Instability', 'Echo of Remnants', 'Echo of Undermining'],
    mods: ['Harmonic Siphon', 'Recuperation', 'Innervation'],
    statFocus: ['Weapons', 'Health', 'Class'],
    activityTags: ['raid', 'dungeon'],
    superAbility: 'Ward of Dawn',
    grenade: 'Vortex Grenade',
    melee: 'Shield Throw',
    classAbility: 'Rally Barricade',
    playNotes: 'Add clear. Peacekeepers keeps Tarrabah out. Ward and Unbreakable cover the reload.',
    description: 'Add clear. Peacekeepers keeps Tarrabah out. Ward and Unbreakable cover the reload.',
    creditName: 'light.gg',
    creditUrl: LG_TARRABAH,
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
    activityTags: ['gm', 'raid', 'dungeon'],
    superAbility: 'Thundercrash',
    grenade: 'Glacier Grenade',
    melee: 'Frenzied Blade',
    classAbility: 'Towering Barricade',
    playNotes: 'Survivability. Block with Praxic Blade. Stronghold keeps the guard up through damage.',
    description: 'Survivability. Block with Praxic Blade. Stronghold keeps the guard up through damage.',
    creditName: 'light.gg',
    creditUrl: LG_STRONGHOLD,
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
    playNotes: 'Team support. Phoenix Dive the adds, then Well of Radiance and Gjallarhorn for the phase.',
    description: 'Team support. Phoenix Dive the adds, then Well of Radiance and Gjallarhorn for the phase.',
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
    playNotes: 'Add clear. Eat the grenade for an Arc Soul, then Outbreak from cover while Devour is up.',
    description: 'Add clear. Eat the grenade for an Arc Soul, then Outbreak from cover while Devour is up.',
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
    aspects: ['Electrostatic Mind', 'Arc Soul'],
    fragments: ['Spark of Amplitude', 'Spark of Volts'],
    mods: ['Better Already', 'Ashes to Assets', 'Recuperation'],
    statFocus: ['Grenade', 'Super', 'Weapons'],
    activityTags: ['raid', 'gm'],
    superAbility: 'Chaos Reach',
    grenade: 'Pulse Grenade',
    melee: 'Ball Lightning',
    classAbility: 'Healing Rift',
    playNotes: 'Add clear. Rift for an Arc Soul, then hold Chaos Reach. Stormdancer\'s Brace stretches it.',
    description: 'Add clear. Rift for an Arc Soul, then hold Chaos Reach. Stormdancer\'s Brace stretches it.',
    creditName: 'light.gg',
    creditUrl: LG_ARC_SOUL,
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
    playNotes: 'Add clear. Threadling grenade, perch Wish-Keeper, then Needlestorm the wave.',
    description: 'Add clear. Threadling grenade, perch Wish-Keeper, then Needlestorm the wave.',
    creditName: 'Blueberries.gg',
    creditUrl: BB_WARLOCK,
    rank: 4,
  },
  {
    id: 'f47a0003-0000-4000-8000-000000000005',
    name: 'Starfire Well',
    characterClass: 'warlock',
    subclass: 'Solar',
    exoticArmor: 'Starfire Protocol',
    exoticWeapon: 'Gjallarhorn',
    weapons: ['Witherhoard', 'Explosive Personality', 'Gjallarhorn'],
    aspects: ['Touch of Flame', 'Hellion'],
    fragments: ['Ember of Ashes', 'Ember of Benevolence', 'Ember of Char'],
    mods: ['Impact Induction', 'Firepower', 'Recuperation'],
    statFocus: ['Grenade', 'Super', 'Weapons'],
    activityTags: ['raid', 'dungeon'],
    superAbility: 'Well of Radiance',
    grenade: 'Fusion Grenade',
    melee: 'Incinerator Snap',
    classAbility: 'Phoenix Dive',
    playNotes: 'Grenade DPS. Drop a Well, then throw Starfire fusion grenades and Gjallarhorn.',
    description: 'Grenade DPS. Drop a Well, then throw Starfire fusion grenades and Gjallarhorn.',
    creditName: 'light.gg',
    creditUrl: LG_STARFIRE,
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
    playNotes: 'Survivability. Arc Soul up, Witherhoard the spawn, Praxic Blade anything that closes.',
    description: 'Survivability. Arc Soul up, Witherhoard the spawn, Praxic Blade anything that closes.',
    creditName: 'light.gg',
    creditUrl: LG_GETAWAY,
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
