/** Curated drop tables for featured raid/dungeon rotation UI. */

export type LootRarity = 'exotic' | 'catalyst' | 'legendary'

export interface ActivityLootDrop {
  name: string
  kind: LootRarity
  note?: string
}

export interface ActivityLootIntel {
  armorSet: { name: string; note?: string }
  drops: ActivityLootDrop[]
  tagline?: string
}

export const ACTIVITY_LOOT: Record<string, ActivityLootIntel> = {
  "King's Fall": {
    tagline: 'Chase Touch of Malice and the Kingslayer catalyst this week.',
    armorSet: { name: 'Warpriest\'s Chest', note: 'Full raid armor set — high-stat rolls on Master' },
    drops: [
      { name: 'Touch of Malice', kind: 'exotic', note: 'Final boss exotic scout' },
      { name: 'Kingslayer', kind: 'catalyst', note: 'Touch of Malice catalyst' },
      { name: 'Smite of Merain', kind: 'legendary', note: 'Warpriest pulse — PvE god roll chase' },
      { name: 'Defiance of Yasmin', kind: 'legendary', note: 'Sniper from Warpriest' },
    ],
  },
  'Vault of Glass': {
    tagline: 'Vex Mythoclast and Fatebringer are the headline farms.',
    armorSet: { name: 'Praetorian Suit', note: 'Classic VoG armor — high Intellect / Recovery builds' },
    drops: [
      { name: 'Vex Mythoclast', kind: 'exotic', note: 'Atheon exotic fusion rifle' },
      { name: 'Fatebringer', kind: 'legendary', note: 'Hand cannon — Firefly / Explosive Payload' },
      { name: 'Vision of Confluence', kind: 'legendary', note: 'Scout rifle — Full Auto / Frenzy' },
      { name: 'Hezen Vengeance', kind: 'legendary', note: 'Rocket launcher from Templar' },
    ],
  },
  'Garden of Salvation': {
    tagline: 'Divinity remains the must-have exotic for boss DPS.',
    armorSet: { name: 'Garden of Salvation Suit', note: 'Relay-themed armor — spike Resilience on chest' },
    drops: [
      { name: 'Divinity', kind: 'exotic', note: 'Trace rifle — weaken on sustained aim' },
      { name: 'Zealot\'s Robe', kind: 'legendary', note: 'High-stat raid armor' },
      { name: 'Emperor\'s Courtesy', kind: 'legendary', note: 'Shotgun from final encounter' },
      { name: 'Reckless Endangerment', kind: 'legendary', note: 'Sniper from Sanctified Mind' },
    ],
  },
  'Last Wish': {
    tagline: 'One Thousand Voices and curated raid weapons on rotation.',
    armorSet: { name: 'Riven\'s Curse Suit', note: 'Dreaming City raid armor — spike Recovery gloves' },
    drops: [
      { name: 'One Thousand Voices', kind: 'exotic', note: 'Riven exotic fusion rifle' },
      { name: 'Nation of Beasts', kind: 'legendary', note: 'Hand cannon — Outlaw / Rampage' },
      { name: 'Chattering Bone', kind: 'legendary', note: 'Pulse rifle — Kill Clip' },
      { name: 'Age-Old Bond', kind: 'legendary', note: 'Auto rifle from Morgeth' },
    ],
  },
  "Crota's End": {
    tagline: 'Necrochasm and Swordbreaker define the reprised loot pool.',
    armorSet: { name: 'Ascendant Plate', note: 'Moon raid armor — high Strength / Discipline' },
    drops: [
      { name: 'Necrochasm', kind: 'exotic', note: 'Crota exotic auto rifle' },
      { name: 'Swordbreaker', kind: 'legendary', note: 'Shotgun — Surrounded / One-Two Punch' },
      { name: 'Omnigul\'s Grieve', kind: 'legendary', note: 'Hand cannon from Ir YÃ»t' },
      { name: 'Abyssal Defiant', kind: 'legendary', note: 'Scout rifle — Subsistence / Frenzy' },
    ],
  },
  'Root of Nightmares': {
    tagline: 'Conditional Finality is the exotic everyone still needs.',
    armorSet: { name: 'Root of Nightmares Suit', note: 'Neomuna pyramid armor — Resilience focus' },
    drops: [
      { name: 'Conditional Finality', kind: 'exotic', note: 'Nezarec exotic shotgun' },
      { name: 'Rufus\'s Fury', kind: 'legendary', note: 'Auto rifle — Demolitionist / Repulsor Brace' },
      { name: 'Mykel\'s Reverence', kind: 'legendary', note: 'Sidearm — Pugilist / One-Two Punch' },
      { name: 'Nimrod\'s Hunter', kind: 'legendary', note: 'Scout rifle — Explosive Payload' },
    ],
  },
  'Vow of the Disciple': {
    tagline: 'Forbearance and Lubrae\'s Ruin anchor the Rhulk farm.',
    armorSet: { name: 'Vow of the Disciple Suit', note: 'Throne World raid armor — spike Discipline' },
    drops: [
      { name: 'Lubrae\'s Ruin', kind: 'exotic', note: 'Rhulk exotic glaive' },
      { name: 'Forbearance', kind: 'legendary', note: 'Grenade launcher — Ambitious Assassin / Chain Reaction' },
      { name: 'Insidious', kind: 'legendary', note: 'Bow — Archer\'s Tempo / Rampage' },
      { name: 'Deliverance', kind: 'legendary', note: 'Fusion rifle — Perpetual Motion / Reservoir Burst' },
    ],
  },
  'Deep Stone Crypt': {
    tagline: 'Eyes of Tomorrow and Heritage still print on repeat clears.',
    armorSet: { name: 'Deep Stone Crypt Suit', note: 'Cosmodrome raid armor — Recovery / Intellect spikes' },
    drops: [
      { name: 'Eyes of Tomorrow', kind: 'exotic', note: 'Taniks exotic rocket launcher' },
      { name: 'Heritage', kind: 'legendary', note: 'Shotgun — Reconstruction / Slideshot' },
      { name: 'Commemoration', kind: 'legendary', note: 'Auto rifle — Subsistence / Rampage' },
      { name: 'Posterity', kind: 'legendary', note: 'Hand cannon — Killing Wind / Rampage' },
    ],
  },
  "Salvation's Edge": {
    tagline: 'Ergo Sum and the latest raid weapons are on farm.',
    armorSet: { name: 'Salvation\'s Edge Suit', note: 'Newest raid armor — high-stat artifice slots on Master' },
    drops: [
      { name: 'Ergo Sum', kind: 'exotic', note: 'Final boss exotic sword' },
      { name: 'Imminence', kind: 'legendary', note: 'Submachine gun — PvE staple' },
      { name: 'Non-Denouement', kind: 'legendary', note: 'Bow — Precision / Rampage' },
      { name: 'Forthcoming Deviance', kind: 'legendary', note: 'Fusion rifle — Perpetual Motion' },
    ],
  },
  'Crown of Sorrow': {
    tagline: 'Tarrabah and Crown weapons return on rotation.',
    armorSet: { name: 'Crown of Sorrow Suit', note: 'Leviathan raid armor reprised' },
    drops: [
      { name: 'Tarrabah', kind: 'exotic', note: 'Exotic SMG — ramping damage' },
      { name: 'Apex Predator', kind: 'legendary', note: 'Rocket launcher — Clown Cartridge / Bait and Switch' },
      { name: 'Beloved', kind: 'legendary', note: 'Scout rifle — Outlaw / Rampage' },
      { name: 'Nation of Beasts', kind: 'legendary', note: 'Hand cannon — curated roll chase' },
    ],
  },
  'Grasp of Avarice': {
    tagline: 'Gjallarhorn and Xenophage catalyst routes live here.',
    armorSet: { name: 'Avarice Suit', note: 'Dungeon armor — high Recovery on legs' },
    drops: [
      { name: 'Gjallarhorn', kind: 'exotic', note: 'Exotic rocket — Wolfpack Rounds' },
      { name: 'Xenophage', kind: 'catalyst', note: 'Catalyst quest / dungeon route' },
      { name: 'Eyasluna', kind: 'legendary', note: 'Hand cannon — Rangefinder / Kill Clip' },
      { name: 'The Comedian', kind: 'legendary', note: 'Shotgun — One-Two Punch' },
    ],
  },
  'Shattered Throne': {
    tagline: 'Wish-Ender and Twilight Oath are the classic chase items.',
    armorSet: { name: 'Reverie Dawn Suit', note: 'Dreaming City dungeon armor — spike Mobility' },
    drops: [
      { name: 'Wish-Ender', kind: 'exotic', note: 'Exotic bow — wall-hack rounds' },
      { name: 'Twilight Oath', kind: 'legendary', note: 'Sniper — Snapshot / Opening Shot' },
      { name: 'The Tyranny of Heaven', kind: 'legendary', note: 'Bow — Explosive Head / Rampage' },
      { name: 'Transfiguration', kind: 'legendary', note: 'Scout rifle — Rampage / Kill Clip' },
    ],
  },
  'Spire of the Watcher': {
    tagline: 'Hierarchy of Needs and Zaouli\'s Wrath headline the Seraph dungeon.',
    armorSet: { name: 'Seraph Suit', note: 'Bunker dungeon armor — Resilience / Recovery focus' },
    drops: [
      { name: 'Hierarchy of Needs', kind: 'exotic', note: 'Persys exotic bow' },
      { name: 'Zaouli\'s Wrath', kind: 'legendary', note: 'Grenade launcher — Chain Reaction' },
      { name: 'Forgiveness', kind: 'legendary', note: 'Sidearm — Kill Clip / Rangefinder' },
      { name: 'Terminus Horizon', kind: 'legendary', note: 'Linear fusion — Envious Assassin' },
    ],
  },
  Duality: {
    tagline: 'Heartshadow and craftable dungeon weapons on repeat.',
    armorSet: { name: 'Nightmare Suit', note: 'Nightmare realm armor — high Discipline' },
    drops: [
      { name: 'Heartshadow', kind: 'exotic', note: 'Caiatl co-op exotic sword' },
      { name: 'Forgiveness', kind: 'legendary', note: 'Sidearm — PvP / PvE hybrid' },
      { name: 'Incursion', kind: 'legendary', note: 'Pulse rifle — Outlaw / Frenzy' },
      { name: 'Fixed Odds', kind: 'legendary', note: 'Auto rifle — Subsistence / Rampage' },
    ],
  },
  'Ghosts of the Deep': {
    tagline: 'The Navigator exotic glaive drops from the final encounter.',
    armorSet: { name: 'Deep Explorer Suit', note: 'Titan dungeon armor — Strength / Resilience' },
    drops: [
      { name: 'The Navigator', kind: 'exotic', note: 'Exotic glaive — heal on melee' },
      { name: 'Rufus\'s Fire', kind: 'legendary', note: 'Trace rifle — Lead from Gold' },
      { name: 'Under Your Skin', kind: 'legendary', note: 'Bow — Archer\'s Tempo / Rampage' },
      { name: 'Out of Bounds', kind: 'legendary', note: 'SMG — Dynamic Sway Reduction' },
    ],
  },
  'Pit of Heresy': {
    tagline: 'Ballista and the Moon dungeon armor set farm.',
    armorSet: { name: 'Pit of Heresy Suit', note: 'Moon dungeon armor — high-stat spike rolls' },
    drops: [
      { name: 'Ballista', kind: 'legendary', note: 'Heavy grenade launcher — Spike / Auto-Loading' },
      { name: 'The Militia\'s Birthright', kind: 'legendary', note: 'Grenade launcher — Spike / Ambitious Assassin' },
      { name: 'The Clever Rat', kind: 'legendary', note: 'Sidearm — Kill Clip' },
      { name: 'The Long Goodbye', kind: 'legendary', note: 'Sniper — Triple Tap / Firing Line' },
    ],
  },
  Prophecy: {
    tagline: 'IKELOS weapons and the Nine-themed armor return.',
    armorSet: { name: 'Prophecy Suit', note: 'Nine dungeon armor — Recovery / Intellect' },
    drops: [
      { name: 'IKELOS_SMG_v1.0.1.', kind: 'legendary', note: 'SMG — Threat Detector / Surrounded' },
      { name: 'IKELOS_SG_v1.0.1.', kind: 'legendary', note: 'Shotgun — Trench Barrel / Lead from Gold' },
      { name: 'IKELOS_SR_v1.0.1.', kind: 'legendary', note: 'Sniper — Fourth Time\'s the Charm' },
      { name: 'Midnight Coup', kind: 'legendary', note: 'Hand cannon — Outlaw / Rampage' },
    ],
  },
  "Warlord's Ruin": {
    tagline: 'Dark Age arsenal and the Warlord exotic SMG.',
    armorSet: { name: 'Warlord\'s Ruin Suit', note: 'Dark Age dungeon armor — Resilience spikes' },
    drops: [
      { name: 'Dark Age Arsenal', kind: 'exotic', note: 'Final boss exotic SMG' },
      { name: 'Forgiveness', kind: 'legendary', note: 'Sidearm — curated roll' },
      { name: 'Incisor', kind: 'legendary', note: 'Trace rifle — Envious Assassin' },
      { name: 'Outlast', kind: 'legendary', note: 'Pulse rifle — Outlaw / Kill Clip' },
    ],
  },
  "Vesper's Host": {
    tagline: 'Vesper\'s Host exotic and Bray tech weapons.',
    armorSet: { name: 'Vesper\'s Host Suit', note: 'Braytech dungeon armor — high-stat artifice' },
    drops: [
      { name: 'Vesper\'s Host', kind: 'exotic', note: 'Final encounter exotic' },
      { name: 'Cold Comfort', kind: 'legendary', note: 'Shotgun — One-Two Punch' },
      { name: 'Swordbreaker', kind: 'legendary', note: 'Shotgun — PvE roll chase' },
      { name: 'Forgiveness', kind: 'legendary', note: 'Sidearm — Rangefinder' },
    ],
  },
}

export function activityLootIntel(activityName: string): ActivityLootIntel | null {
  return ACTIVITY_LOOT[activityName] ?? null
}
