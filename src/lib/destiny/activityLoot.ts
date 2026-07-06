/** Curated drop tables for featured raid/dungeon rotation UI. */

import { activityArmorSet, armorSetIconRef, armorSetLootMeta } from '@/lib/destiny/activityArmorSets'
import { buildBungieIconUrl } from '@/lib/destiny/bungieUrls'
import { catalogLookup } from '@/lib/destiny/itemsCatalog'
import { itemIconPathFallback } from '@/lib/destiny/itemIconPaths'
import type { DestinyIconRef } from '@/lib/destiny/types'

export type LootRarity = 'exotic' | 'catalyst' | 'legendary'

export interface ActivityLootDrop {
  name: string
  kind: LootRarity
  note?: string
}

export interface ActivityLootIntel {
  armorSet: { name: string; note?: string; iconItem: string }
  drops: ActivityLootDrop[]
  tagline?: string
}

export const ACTIVITY_LOOT: Record<string, ActivityLootIntel> = {
  "King's Fall": {
    tagline: 'Chase Touch of Malice and the Kingslayer catalyst this week.',
    armorSet: { name: 'Bushido', note: 'Full raid armor set — high-stat rolls on Master', iconItem: 'Bushido Plate' },
    drops: [
      { name: 'Touch of Malice', kind: 'exotic', note: 'Final boss exotic scout' },
      { name: 'Kingslayer', kind: 'catalyst', note: 'Touch of Malice catalyst' },
      { name: 'Smite of Merain', kind: 'legendary', note: 'Warpriest pulse — PvE god roll chase' },
      { name: 'Defiance of Yasmin', kind: 'legendary', note: 'Sniper from Warpriest' },
    ],
  },
  'Vault of Glass': {
    tagline: 'Vex Mythoclast and Fatebringer are the headline farms.',
    armorSet: { name: 'Fused Aurum', note: 'Classic VoG armor — high Intellect / Recovery builds', iconItem: 'Fused Aurum Plate' },
    drops: [
      { name: 'Vex Mythoclast', kind: 'exotic', note: 'Atheon exotic fusion rifle' },
      { name: 'Fatebringer', kind: 'legendary', note: 'Hand cannon — Firefly / Explosive Payload' },
      { name: 'Vision of Confluence', kind: 'legendary', note: 'Scout rifle — Full Auto / Frenzy' },
      { name: 'Hezen Vengeance', kind: 'legendary', note: 'Rocket launcher from Templar' },
    ],
  },
  'Garden of Salvation': {
    tagline: 'Divinity remains the must-have exotic for boss DPS.',
    armorSet: { name: 'Prime Zealot', note: 'Relay-themed armor — spike Resilience on chest', iconItem: 'Prime Zealot Cuirass' },
    drops: [
      { name: 'Divinity', kind: 'exotic', note: 'Trace rifle — weaken on sustained aim' },
      { name: 'Zealot\'s Reward', kind: 'legendary', note: 'Fusion rifle — high-stat raid weapon' },
      { name: 'Emperor\'s Courtesy', kind: 'legendary', note: 'Shotgun from final encounter' },
      { name: 'Reckless Endangerment', kind: 'legendary', note: 'Sniper from Sanctified Mind' },
    ],
  },
  'Last Wish': {
    tagline: 'One Thousand Voices and curated raid weapons on rotation.',
    armorSet: { name: 'Willbreaker\'s Resolve', note: 'Dreaming City raid armor — spike Recovery gloves', iconItem: 'Willbreaker\'s Resolve' },
    drops: [
      { name: 'One Thousand Voices', kind: 'exotic', note: 'Riven exotic fusion rifle' },
      { name: 'Nation of Beasts', kind: 'legendary', note: 'Hand cannon — Outlaw / Rampage' },
      { name: 'Chattering Bone', kind: 'legendary', note: 'Pulse rifle — Kill Clip' },
      { name: 'Age-Old Bond', kind: 'legendary', note: 'Auto rifle from Morgeth' },
    ],
  },
  "Crota's End": {
    tagline: 'Necrochasm and Swordbreaker define the reprised loot pool.',
    armorSet: { name: 'Moonfang-X7', note: 'Moon raid armor — high Strength / Discipline', iconItem: 'Moonfang-X7 Rig' },
    drops: [
      { name: 'Necrochasm', kind: 'exotic', note: 'Crota exotic auto rifle' },
      { name: 'Swordbreaker', kind: 'legendary', note: 'Shotgun — Surrounded / One-Two Punch' },
      { name: 'Word of Crota', kind: 'legendary', note: 'Hand cannon from Ir Yût' },
      { name: 'Abyss Defiant', kind: 'legendary', note: 'Scout rifle — Subsistence / Frenzy' },
    ],
  },
  'Root of Nightmares': {
    tagline: 'Conditional Finality is the exotic everyone still needs.',
    armorSet: { name: 'Resonant Fury', note: 'Neomuna pyramid armor — Resilience focus', iconItem: 'Resonant Fury Plate' },
    drops: [
      { name: 'Conditional Finality', kind: 'exotic', note: 'Nezarec exotic shotgun' },
      { name: 'Rufus\'s Fury', kind: 'legendary', note: 'Auto rifle — Demolitionist / Repulsor Brace' },
      { name: 'Mykel\'s Reverence', kind: 'legendary', note: 'Sidearm — Pugilist / One-Two Punch' },
      { name: 'Acacia\'s Dejection', kind: 'legendary', note: 'Trace rifle — Lead from Gold' },
    ],
  },
  'Vow of the Disciple': {
    tagline: 'Collective Obligation and Lubrae\'s Ruin headline the Rhulk farm.',
    armorSet: { name: 'Eidolon Pursuant', note: 'Throne World raid armor — spike Discipline', iconItem: 'Eidolon Pursuant Plate' },
    drops: [
      { name: 'Collective Obligation', kind: 'exotic', note: 'Rhulk exotic Void pulse rifle' },
      { name: 'Lubrae\'s Ruin', kind: 'legendary', note: 'Solar glaive from final encounter' },
      { name: 'Forbearance', kind: 'legendary', note: 'Grenade launcher — Ambitious Assassin / Chain Reaction' },
      { name: 'Insidious', kind: 'legendary', note: 'Bow — Archer\'s Tempo / Rampage' },
    ],
  },
  'Deep Stone Crypt': {
    tagline: 'Eyes of Tomorrow and Heritage still print on repeat clears.',
    armorSet: { name: 'Legacy\'s Oath', note: 'Cosmodrome raid armor — Recovery / Intellect spikes', iconItem: 'Legacy\'s Oath Plate' },
    drops: [
      { name: 'Eyes of Tomorrow', kind: 'exotic', note: 'Taniks exotic rocket launcher' },
      { name: 'Heritage', kind: 'legendary', note: 'Shotgun — Reconstruction / Slideshot' },
      { name: 'Commemoration', kind: 'legendary', note: 'Auto rifle — Subsistence / Rampage' },
      { name: 'Posterity', kind: 'legendary', note: 'Hand cannon — Killing Wind / Rampage' },
    ],
  },
  "Salvation's Edge": {
    tagline: 'Euphony and the latest raid weapons are on farm.',
    armorSet: { name: 'Untethered Edge', note: 'Newest raid armor — high-stat artifice slots on Master', iconItem: 'Untethered Edge Plate' },
    drops: [
      { name: 'Euphony', kind: 'exotic', note: 'The Witness exotic Strand linear fusion rifle' },
      { name: 'Imminence', kind: 'legendary', note: 'Submachine gun — PvE staple' },
      { name: 'Non-Denouement', kind: 'legendary', note: 'Bow — Dragonfly / Voltshot chase' },
      { name: 'Forthcoming Deviance', kind: 'legendary', note: 'Glaive — Perpetual Motion' },
    ],
  },
  'Crown of Sorrow': {
    tagline: 'Tarrabah and Crown weapons return on rotation.',
    armorSet: { name: 'Twofold Crown', note: 'Leviathan raid armor reprised', iconItem: 'Twofold Crown Plate' },
    drops: [
      { name: 'Tarrabah', kind: 'exotic', note: 'Exotic SMG — ramping damage' },
      { name: 'Apex Predator', kind: 'legendary', note: 'Rocket launcher — Clown Cartridge / Bait and Switch' },
      { name: 'Beloved', kind: 'legendary', note: 'Scout rifle — Outlaw / Rampage' },
      { name: 'Optative', kind: 'legendary', note: 'Hand cannon — rapid-fire Crown drop' },
    ],
  },
  'Grasp of Avarice': {
    tagline: 'Gjallarhorn drops from the final encounter.',
    armorSet: { name: 'Opulent Duelist', note: 'Dungeon armor — high Recovery on legs', iconItem: 'Opulent Duelist Plate' },
    drops: [
      { name: 'Gjallarhorn', kind: 'exotic', note: 'Exotic rocket — Wolfpack Rounds' },
      { name: 'Eyasluna', kind: 'legendary', note: 'Hand cannon — Rangefinder / Kill Clip' },
      { name: 'The Comedian', kind: 'legendary', note: 'Shotgun — One-Two Punch' },
      { name: 'Swordbreaker', kind: 'legendary', note: 'Shotgun — PvE roll chase' },
    ],
  },
  'Shattered Throne': {
    tagline: 'Wish-Ender and Twilight Oath are the classic chase items.',
    armorSet: { name: 'Reverie Dawn', note: 'Dreaming City dungeon armor — spike Mobility', iconItem: 'Reverie Dawn Plate' },
    drops: [
      { name: 'Wish-Ender', kind: 'exotic', note: 'Exotic bow — wall-hack rounds' },
      { name: 'Twilight Oath', kind: 'legendary', note: 'Sniper — Snapshot / Opening Shot' },
      { name: 'The Tyranny of Heaven', kind: 'legendary', note: 'Bow — Explosive Head / Rampage' },
      { name: 'Transfiguration', kind: 'legendary', note: 'Scout rifle — Rampage / Kill Clip' },
    ],
  },
  'Spire of the Watcher': {
    tagline: 'Hierarchy of Needs and Zaouli\'s Bane headline the Seraph dungeon.',
    armorSet: { name: 'Seventh Seraph', note: 'Bunker dungeon armor — Resilience / Recovery focus', iconItem: 'Seventh Seraph Plate' },
    drops: [
      { name: 'Hierarchy of Needs', kind: 'exotic', note: 'Persys exotic bow' },
      { name: 'Zaouli\'s Bane', kind: 'legendary', note: 'Hand cannon — Incandescent' },
      { name: 'Forgiveness', kind: 'legendary', note: 'Sidearm — Kill Clip / Rangefinder' },
      { name: 'Terminus Horizon', kind: 'legendary', note: 'Linear fusion — Envious Assassin' },
    ],
  },
  Duality: {
    tagline: 'Heartshadow and craftable dungeon weapons on repeat.',
    armorSet: { name: 'Temptation', note: 'Nightmare realm armor — high Discipline', iconItem: 'Temptation\'s Bond' },
    drops: [
      { name: 'Heartshadow', kind: 'exotic', note: 'Caiatl co-op exotic sword' },
      { name: 'Forgiveness', kind: 'legendary', note: 'Sidearm — PvP / PvE hybrid' },
      { name: 'Duality', kind: 'legendary', note: 'Shotgun — One-Two Punch / Incursion' },
      { name: 'Fixed Odds', kind: 'legendary', note: 'Auto rifle — Subsistence / Rampage' },
    ],
  },
  'Ghosts of the Deep': {
    tagline: 'The Navigator exotic glaive drops from the final encounter.',
    armorSet: { name: 'Deep Explorer', note: 'Titan dungeon armor — Strength / Resilience', iconItem: 'Deep Explorer Plate' },
    drops: [
      { name: 'The Navigator', kind: 'exotic', note: 'Exotic trace rifle — heal on melee' },
      { name: 'Thoughtless', kind: 'legendary', note: 'Sniper rifle — Firing Line / Fourth Time' },
      { name: 'Under Your Skin', kind: 'legendary', note: 'Bow — Archer\'s Tempo / Rampage' },
      { name: 'Out of Bounds', kind: 'legendary', note: 'SMG — Dynamic Sway Reduction' },
    ],
  },
  'Pit of Heresy': {
    tagline: 'Heretic and Moon dungeon weapons — Xenophage unlocks via the Emergence quest on the Moon.',
    armorSet: { name: 'Unassailable', note: 'Moon dungeon armor — high-stat spike rolls', iconItem: 'Mark of the Unassailable' },
    drops: [
      { name: 'Heretic', kind: 'legendary', note: 'Heavy grenade launcher — Spike / Auto-Loading' },
      { name: 'The Militia\'s Birthright', kind: 'legendary', note: 'Grenade launcher — Spike / Ambitious Assassin' },
      { name: 'Perfect Pitch', kind: 'legendary', note: 'Sidearm — Kill Clip' },
      { name: 'The Long Goodbye', kind: 'legendary', note: 'Sniper — Triple Tap / Firing Line' },
    ],
  },
  Prophecy: {
    tagline: 'IKELOS weapons and the Nine-themed armor return.',
    armorSet: { name: 'Tusked Allegiance', note: 'Nine dungeon armor — Recovery / Intellect', iconItem: 'Tusked Allegiance Plate' },
    drops: [
      { name: 'IKELOS_SMG_v1.0.1', kind: 'legendary', note: 'SMG — Threat Detector / Surrounded' },
      { name: 'IKELOS_SG_v1.0.1', kind: 'legendary', note: 'Shotgun — Trench Barrel / Lead from Gold' },
      { name: 'IKELOS_SR_v1.0.1', kind: 'legendary', note: 'Sniper — Fourth Time\'s the Charm' },
      { name: 'Midnight Coup', kind: 'legendary', note: 'Hand cannon — Outlaw / Rampage' },
    ],
  },
  "Warlord's Ruin": {
    tagline: 'Buried Bloodline drops from Hefnd, the final boss.',
    armorSet: { name: 'Dark Age', note: 'Dark Age dungeon armor — Resilience spikes', iconItem: 'Dark Age Chestrig' },
    drops: [
      { name: 'Buried Bloodline', kind: 'exotic', note: 'Final boss exotic Void sidearm' },
      { name: 'Indebted Kindness', kind: 'legendary', note: 'Arc sidearm — rocket-assisted frame' },
      { name: 'Vengeful Whisper', kind: 'legendary', note: 'Strand bow — precision frame' },
      { name: 'Dragoncult Sickle', kind: 'legendary', note: 'Strand sword — caster frame' },
    ],
  },
  "Vesper's Host": {
    tagline: 'Ice Breaker drops from the Corrupted Puppeteer.',
    armorSet: { name: 'BrayTech Combat', note: 'Braytech dungeon armor — high-stat artifice', iconItem: 'BrayTech Combat Vest' },
    drops: [
      { name: 'Ice Breaker', kind: 'exotic', note: 'Final boss exotic sniper rifle' },
      { name: 'VS Chill Inhibitor', kind: 'legendary', note: 'Heavy grenade launcher' },
      { name: 'VS Gravitic Arrest', kind: 'legendary', note: 'Fusion rifle' },
      { name: 'VS Pyroelectric Propellant', kind: 'legendary', note: 'Auto rifle' },
    ],
  },
}

export function activityLootIntel(activityName: string): ActivityLootIntel | null {
  const loot = ACTIVITY_LOOT[activityName]
  if (!loot) return null

  const armor = activityArmorSet(activityName)
  if (!armor) return loot

  return {
    ...loot,
    armorSet: armorSetLootMeta(armor),
  }
}

/** Map loot table labels to catalog keys when names differ in-game. */
const LOOT_ICON_ALIASES: Record<string, string> = {
  'ikelos_smg_v1.0.1': 'ikelos_smg_v1.0.1',
  'ikelos_sg_v1.0.1': 'ikelos_sg_v1.0.1',
  'ikelos_sr_v1.0.1': 'ikelos_sr_v1.0.1',
  'the tyranny of heaven': 'tyranny of heaven',
  'the militia\'s birthright': 'militia\'s birthright',
  'the long goodbye': 'long goodbye',
  'the comedian': 'comedian',
  'the navigator': 'the navigator',
  kingslayer: 'touch of malice catalyst',
  'collective obligation': 'collective obligation',
  'buried bloodline': 'buried bloodline',
  euphony: 'euphony',
  'ice breaker': 'ice breaker',
  'indebted kindness': 'indebted kindness',
  'vengeful whisper': 'vengeful whisper',
  'dragoncult sickle': 'dragoncult sickle',
  'vs chill inhibitor': 'vs chill inhibitor',
  'vs gravitic arrest': 'vs gravitic arrest',
  'vs pyroelectric propellant': 'vs pyroelectric propellant',
  'lubrae\'s ruin': 'lubrae\'s ruin',
  optative: 'optative',
  'zaouli\'s wrath': 'zaouli\'s bane',
  'omnigul\'s grieve': 'word of crota',
  'abyssal defiant': 'abyss defiant',
  'nimrod\'s hunter': 'acacia\'s dejection',
  'rufus\'s fire': 'thoughtless',
  'calus\'s selected': 'optative',
  ballista: 'heretic',
  'the clever rat': 'perfect pitch',
  incursion: 'duality',
  'zealot\'s robe': 'prime zealot cuirass',
}

function tierForKind(kind: LootRarity): string {
  if (kind === 'exotic') return 'Exotic'
  if (kind === 'catalyst') return 'Catalyst'
  return 'Legendary'
}

export function resolveLootCatalogName(name: string): string {
  const key = name.trim().toLowerCase()
  return LOOT_ICON_ALIASES[key] ?? key
}

export function lootDropLookupName(drop: ActivityLootDrop): string {
  if (drop.kind === 'catalyst' && drop.name.trim().toLowerCase() === 'xenophage') {
    return 'xenophage catalyst'
  }
  return resolveLootCatalogName(drop.name)
}

/** Build an icon ref for a weekly loot drop (catalog + manifest fallback in UI). */
export function lootDropIconRef(drop: ActivityLootDrop): DestinyIconRef {
  const catalogKey = lootDropLookupName(drop)
  const catalog = catalogLookup(catalogKey) ?? catalogLookup(drop.name)
  const iconPath = catalog?.iconPath ?? itemIconPathFallback(catalogKey) ?? itemIconPathFallback(drop.name)

  return {
    name: drop.name,
    hash: catalog?.hash,
    iconUrl: iconPath ? buildBungieIconUrl(iconPath) : undefined,
    tierLabel: tierForKind(drop.kind),
    entityType: catalog?.entity ?? 'DestinyInventoryItemDefinition',
  }
}

function lootItemIconRef(name: string, tierLabel = 'Legendary'): DestinyIconRef {
  const catalogKey = resolveLootCatalogName(name)
  const catalog = catalogLookup(catalogKey) ?? catalogLookup(name)
  const iconPath = catalog?.iconPath ?? itemIconPathFallback(catalogKey) ?? itemIconPathFallback(name)

  return {
    name,
    hash: catalog?.hash,
    iconUrl: iconPath ? buildBungieIconUrl(iconPath) : undefined,
    tierLabel,
    entityType: catalog?.entity ?? 'DestinyInventoryItemDefinition',
  }
}

/** Armor set row uses the activity's Armor 3.0 chest piece icon. */
export function lootArmorSetIconRef(intel: ActivityLootIntel, activityName?: string): DestinyIconRef | undefined {
  const armor = activityName ? activityArmorSet(activityName) : null
  if (armor) return armorSetIconRef(armor)
  const ref = lootItemIconRef(intel.armorSet.iconItem, 'Armor')
  return { ...ref, name: intel.armorSet.name }
}
