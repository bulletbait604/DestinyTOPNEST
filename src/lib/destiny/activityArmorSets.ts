import { buildBungieIconUrl } from '@/lib/destiny/bungieUrls'
import { catalogLookup } from '@/lib/destiny/itemsCatalog'
import { itemIconPathFallback } from '@/lib/destiny/itemIconPaths'
import type { DestinyIconRef } from '@/lib/destiny/types'

const LIGHT_GG_SET_BASE = 'https://www.light.gg/db/armor/set-bonuses'

export interface ArmorSetBonusTier {
  requiredCount: 2 | 4
  perkName: string
  description: string
}

export interface ActivityArmorSet {
  setName: string
  lightGgSlug: string
  iconItem: string
  twoPiece: ArmorSetBonusTier
  fourPiece: ArmorSetBonusTier
}

/** Armor 3.0 set that drops from each featured activity (light.gg sources). */
export const ACTIVITY_ARMOR_SET_BY_NAME: Record<string, ActivityArmorSet> = {
  "King's Fall": {
    setName: "Oryx's Memory",
    lightGgSlug: 'oryxs-memory',
    iconItem: "War Numen's Chest",
    twoPiece: {
      requiredCount: 2,
      perkName: 'Iron Sharpens Iron',
      description: 'Final blows on Guardians and powerful combatants generate additional ammo progress.',
    },
    fourPiece: {
      requiredCount: 4,
      perkName: 'Ascendant Escape',
      description: 'After a final blow on a powerful combatant, the next time your shields break, you become invisible.',
    },
  },
  'Vault of Glass': {
    setName: "Atheon's Memory",
    lightGgSlug: 'atheons-memory',
    iconItem: "Kabr's Wrath",
    twoPiece: {
      requiredCount: 2,
      perkName: 'Radiolaria Breach',
      description:
        'After picking up an Orb of Power, the next time your shields break, gain bonus Health and release radiolaria.',
    },
    fourPiece: {
      requiredCount: 4,
      perkName: 'Collective Power',
      description: 'While you have a subclass buff, dealing sustained damage creates an Orb of Power.',
    },
  },
  'Garden of Salvation': {
    setName: 'Kentarch 3',
    lightGgSlug: 'kentarch-3',
    iconItem: 'Plate of Transcendence',
    twoPiece: {
      requiredCount: 2,
      perkName: 'Network Admin',
      description: 'Allies nearby improve your handling and reload; other Network Admins grant bonus Health.',
    },
    fourPiece: {
      requiredCount: 4,
      perkName: 'Network Upload',
      description: 'Weapon final blows grant you and nearby allies melee energy.',
    },
  },
  'Last Wish': {
    setName: 'Great Hunt',
    lightGgSlug: 'great-hunt',
    iconItem: 'Plate of the Great Hunt',
    twoPiece: {
      requiredCount: 2,
      perkName: 'Taken Barrier',
      description: 'Grenade final blows temporarily reduce incoming damage.',
    },
    fourPiece: {
      requiredCount: 4,
      perkName: 'Taken Armaments',
      description: 'Grenade final blows grant additional Heavy ammo progress.',
    },
  },
  "Crota's End": {
    setName: "Crota's Memory",
    lightGgSlug: 'crotas-memory',
    iconItem: 'Bane of Crota Shell',
    twoPiece: {
      requiredCount: 2,
      perkName: 'Cursed Fist',
      description: 'Melee final blows trigger a Cursed Thrall explosion.',
    },
    fourPiece: {
      requiredCount: 4,
      perkName: 'Power of the Son',
      description: 'Being in combat grants progressively more flinch and damage resistance versus combatants.',
    },
  },
  'Root of Nightmares': {
    setName: "Nezarec's Nightmare",
    lightGgSlug: 'nezarecs-nightmare',
    iconItem: 'Plate of Agony',
    twoPiece: {
      requiredCount: 2,
      perkName: 'Bad Dreams',
      description: 'Final blows versus debuffed targets have an escalating chance to spawn an Orb of Power.',
    },
    fourPiece: {
      requiredCount: 4,
      perkName: 'Dream-Devourer',
      description: 'Finishers on powerful combatants grant Devour and damage resistance while Devour is active.',
    },
  },
  'Vow of the Disciple': {
    setName: 'Resonant Fury',
    lightGgSlug: 'resonant-fury',
    iconItem: 'Resonant Fury Plate',
    twoPiece: {
      requiredCount: 2,
      perkName: 'Resonant Plating',
      description: 'Health begins regenerating immediately after melee damage from a powerful combatant.',
    },
    fourPiece: {
      requiredCount: 4,
      perkName: 'Siphoning Touch',
      description: 'Weapon or Glaive melee hits grant stacks; switching weapons heals you and consumes stacks.',
    },
  },
  'Deep Stone Crypt': {
    setName: "Legacy's Oath",
    lightGgSlug: 'legacys-oath',
    iconItem: "Legacy's Oath Plate",
    twoPiece: {
      requiredCount: 2,
      perkName: 'Augmented Servos',
      description: 'Powered melees release an extra disorienting pulse when used to defeat a target.',
    },
    fourPiece: {
      requiredCount: 4,
      perkName: 'God-like Judgment',
      description: 'When shields break or on Super cast, release heat-seeking micro-missiles.',
    },
  },
  "Salvation's Edge": {
    setName: 'Promised',
    lightGgSlug: 'promised',
    iconItem: 'Promised Reign Vest',
    twoPiece: {
      requiredCount: 2,
      perkName: 'Stable Resonance',
      description: 'Defeating a powerful combatant grants damage resistance and increased weapon damage.',
    },
    fourPiece: {
      requiredCount: 4,
      perkName: 'Resonance Redirection',
      description: 'With Stable Resonance, weapon damage occasionally triggers a damaging resonance burst.',
    },
  },
  'Grasp of Avarice': {
    setName: 'Yearning Echo',
    lightGgSlug: 'yearning-echo',
    iconItem: 'Twisting Echo Vest',
    twoPiece: {
      requiredCount: 2,
      perkName: 'Untold Greed',
      description: 'Pickups grant Untold Greed stacks for damage reduction and reload speed until shields break.',
    },
    fourPiece: {
      requiredCount: 4,
      perkName: 'Overflowing Coffers',
      description: 'With Untold Greed, pickups grant more energy; broken shields convert stacks into Orbs of Power.',
    },
  },
  'Shattered Throne': {
    setName: "Techeun's Regalia",
    lightGgSlug: 'techeuns-regalia',
    iconItem: "Techeun's Regalia Plate",
    twoPiece: {
      requiredCount: 2,
      perkName: 'Queensfoil Rush',
      description: 'Finishers grant a powerful overshield and release a slowing burst.',
    },
    fourPiece: {
      requiredCount: 4,
      perkName: 'Truth to Power',
      description: 'Damage dealt builds damage resistance; finishers accelerate stacks and ability recharge at max.',
    },
  },
  'Spire of the Watcher': {
    setName: 'TM Custom',
    lightGgSlug: 'tm-custom',
    iconItem: 'TM-Cogburn Custom Plate',
    twoPiece: {
      requiredCount: 2,
      perkName: 'Old Martian Diplomacy',
      description: 'Stowing a weapon after defeating a powerful combatant or Guardian heals and disorients nearby foes.',
    },
    fourPiece: {
      requiredCount: 4,
      perkName: 'High Noon',
      description: 'Freshly drawn weapons deal increased precision damage; Tex weapons gain extra benefit.',
    },
  },
  Duality: {
    setName: 'Deep Explorer',
    lightGgSlug: 'deep-explorer',
    iconItem: 'Deep Explorer Plate',
    twoPiece: {
      requiredCount: 2,
      perkName: 'Built Bitter',
      description: 'Taking damage increases reload speed until the weapon is stowed; more damage stacks the effect.',
    },
    fourPiece: {
      requiredCount: 4,
      perkName: 'Bittersweet',
      description: 'Stowing a weapon restores health based on Built Bitter stacks lost.',
    },
  },
  'Ghosts of the Deep': {
    setName: 'Taken King',
    lightGgSlug: 'taken-king',
    iconItem: 'Plate of the Taken King',
    twoPiece: {
      requiredCount: 2,
      perkName: 'The Ceremony',
      description: 'Finishers or revives start a Lucent Hive ritual that increases Super stat while active.',
    },
    fourPiece: {
      requiredCount: 4,
      perkName: 'Lucent Swarm',
      description: 'Orbs extend the Ceremony; ability final blows occasionally spawn allied Arc moths.',
    },
  },
  'Pit of Heresy': {
    setName: "Apostate's Blade",
    lightGgSlug: 'apostates-blade',
    iconItem: "Apostate's Blade Plate",
    twoPiece: {
      requiredCount: 2,
      perkName: 'Regenerative Threshold',
      description: 'Finishers store power; broken shields consume it to heal and start health regeneration.',
    },
    fourPiece: {
      requiredCount: 4,
      perkName: 'Melee Conduction',
      description: 'With Radiant, Restoration, or Cure, melee hits release a scorch burst.',
    },
  },
  Prophecy: {
    setName: 'CODA',
    lightGgSlug: 'coda',
    iconItem: 'Crushing Plate (CODA)',
    twoPiece: {
      requiredCount: 2,
      perkName: 'Between Poles',
      description: 'Light final blows grant Grenade stat; Dark/Kinetic final blows grant Melee stat.',
    },
    fourPiece: {
      requiredCount: 4,
      perkName: 'So Very Thin',
      description: 'Light final blows grant grenade energy; Dark/Kinetic grant melee; alternating grants damage resist.',
    },
  },
  "Warlord's Ruin": {
    setName: 'Dark Age',
    lightGgSlug: 'dark-age',
    iconItem: 'Dark Age Chestrig',
    twoPiece: {
      requiredCount: 2,
      perkName: 'Taking Initiative',
      description: 'Melee or Sword hits grant Initiative stacks for handling and reload.',
    },
    fourPiece: {
      requiredCount: 4,
      perkName: 'Healing Initiative',
      description: 'With Initiative, class ability creates a healing aura scaled by stacks.',
    },
  },
  "Vesper's Host": {
    setName: 'Spacewalk',
    lightGgSlug: 'spacewalk',
    iconItem: 'Spacewalk Vest',
    twoPiece: {
      requiredCount: 2,
      perkName: 'Augmented Armaments',
      description: 'Primary weapons deal increased damage to disoriented combatants.',
    },
    fourPiece: {
      requiredCount: 4,
      perkName: 'Augmented Explosives',
      description: 'Grenades release an additional disorienting pulse shortly after detonating.',
    },
  },
  Pantheon: {
    setName: 'Pantheos Resplendent',
    lightGgSlug: 'pantheos-resplendent',
    iconItem: 'Pantheos Resplendent Plate',
    twoPiece: {
      requiredCount: 2,
      perkName: 'Well Prepared',
      description: 'Picking up ammo grants Armor Charge and bonus Health per charge.',
    },
    fourPiece: {
      requiredCount: 4,
      perkName: 'Down the Line',
      description: 'Boss damage builds weapon damage versus combatants; final blows consume stacks.',
    },
  },
}

export function activityArmorSet(activityName: string): ActivityArmorSet | null {
  return ACTIVITY_ARMOR_SET_BY_NAME[activityName] ?? null
}

export function lightGgArmorSetUrl(set: ActivityArmorSet | string): string {
  const slug = typeof set === 'string' ? set : set.lightGgSlug
  return `${LIGHT_GG_SET_BASE}/${slug}/`
}

export function lightGgArmorSetLinkTitle(set: ActivityArmorSet): string {
  return `${set.setName} set bonuses — light.gg`
}

function resolveSetIconRef(iconItem: string, setName: string): DestinyIconRef {
  const catalog = catalogLookup(iconItem) ?? catalogLookup(setName)
  const iconPath = catalog?.iconPath ?? itemIconPathFallback(iconItem) ?? itemIconPathFallback(setName)

  return {
    name: setName,
    hash: catalog?.hash,
    iconUrl: iconPath ? buildBungieIconUrl(iconPath) : undefined,
    tierLabel: 'Armor',
    entityType: catalog?.entity ?? 'DestinyInventoryItemDefinition',
  }
}

export function armorSetIconRef(set: ActivityArmorSet): DestinyIconRef {
  return resolveSetIconRef(set.iconItem, set.setName)
}

export function armorSetBonusTierIconRef(set: ActivityArmorSet, tier: ArmorSetBonusTier): DestinyIconRef {
  return {
    ...resolveSetIconRef(set.iconItem, `${set.setName} — ${tier.perkName}`),
    name: tier.perkName,
  }
}

/** Sync activity loot tables with the Armor 3.0 set name shown in UI. */
export function armorSetLootMeta(set: ActivityArmorSet): {
  name: string
  note: string
  iconItem: string
} {
  return {
    name: set.setName,
    note: `2pc ${set.twoPiece.perkName} · 4pc ${set.fourPiece.perkName}`,
    iconItem: set.iconItem,
  }
}
