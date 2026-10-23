import { describe, expect, it } from 'vitest'
import { DESTINY_PROFILE_COMPONENTS } from '@/lib/destiny/bungieClient'
import {
  communityBuildFromInGameLoadout,
  parseInGameLoadoutSummary,
  validateCommunityBuildInput,
} from '@/lib/destiny/communityBuildModel'
import { buildProfileSnapshot, equippedToInGameLoadout } from '@/lib/destiny/profileSnapshot'

const catalogs = {
  loadoutNames: { 99: 'Boss DPS' },
  items: {
    10: { name: 'Nightstalker', itemType: 'Subclass' },
    20: { name: 'Fatebringer', tier: 'Legendary' },
    30: { name: 'Gjallarhorn', tier: 'Exotic', exotic: true },
    40: { name: 'Celestial Nighthawk', tier: 'Exotic', exotic: true },
    501: { name: 'Vanishing Step', itemType: 'Aspect' },
    70: { name: 'Funnelweb', tier: 'Legendary' },
  },
}

function profileFixture() {
  return {
    characters: { data: { c1: { classType: 1, light: 2000 } } },
    characterEquipment: {
      data: {
        c1: {
          items: [{ itemInstanceId: 'eq1', itemHash: 10, bucketHash: 3284755031 }],
        },
      },
    },
    characterInventories: {
      data: {
        c1: {
          items: [{ itemInstanceId: 'inv1', itemHash: 20, bucketHash: 1498876634 }],
        },
      },
    },
    profileInventory: {
      data: {
        items: [
          { itemInstanceId: 'vault1', itemHash: 30, bucketHash: 953998645 },
          { itemInstanceId: 'armor1', itemHash: 40, bucketHash: 3448274439 },
        ],
      },
    },
    characterLoadouts: {
      data: {
        c1: {
          loadouts: [
            {
              nameHash: 99,
              items: [
                { itemInstanceId: 'eq1', plugItemHashes: [501] },
                { itemInstanceId: 'inv1' },
                { itemInstanceId: 'vault1' },
                { itemInstanceId: 'armor1' },
                { itemInstanceId: '' },
              ],
            },
            { nameHash: 100, items: [] },
            { items: [{ itemInstanceId: 'inv2', itemHash: 70, bucketHash: 2465295065 }] },
          ],
        },
      },
    },
  }
}

describe('CharacterLoadouts component 206', () => {
  it('requests profile components 102 and 206 with the rest of the profile', () => {
    expect([...DESTINY_PROFILE_COMPONENTS]).toEqual([
      100, 102, 200, 201, 205, 206, 300, 302, 304, 305, 800, 900, 1100,
    ])
  })

  it('resolves a named in-game loadout from equipment, inventory, and the vault', () => {
    const snapshot = buildProfileSnapshot(profileFixture(), catalogs)
    const character = snapshot.characters[0]
    expect(character?.characterClass).toBe('hunter')
    expect(character?.inGameLoadouts.map((loadout) => loadout.name)).toEqual(['Boss DPS', 'Loadout 3'])

    const boss = character?.inGameLoadouts[0]
    expect(boss).toMatchObject({
      index: 0,
      classType: 'Hunter',
      characterId: 'c1',
      subclass: 'Nightstalker',
      exoticArmor: 'Celestial Nighthawk',
      exoticWeapon: 'Gjallarhorn',
    })
    expect(boss?.weapons).toEqual(['Fatebringer', 'Gjallarhorn'])
    expect(boss?.armor).toEqual(['Celestial Nighthawk'])
    expect(boss?.aspects).toEqual(['Vanishing Step'])
    expect(boss?.items.some((item) => !item.itemHash)).toBe(false)

    const equipped = character?.equipped
    expect(equipped?.name).toBe('Currently Equipped')
    expect(equipped?.subclass).toBe('Nightstalker')
    expect(equippedToInGameLoadout(equipped!).classType).toBe('Hunter')
  })

  it('publishes an in-game loadout into the shared builds list', () => {
    const snapshot = buildProfileSnapshot(profileFixture(), catalogs)
    const boss = snapshot.characters[0]?.inGameLoadouts[0]
    expect(boss).toBeTruthy()
    const posted = parseInGameLoadoutSummary({
      ...boss,
      characterId: '2305843009212345678',
    })
    expect(posted?.name).toBe('Boss DPS')

    const published = communityBuildFromInGameLoadout(posted!, { name: 'GM Nightfall', description: 'Vault rocket included.' })
    expect(published.ok).toBe(true)
    if (!published.ok) return
    expect(validateCommunityBuildInput(published.value).ok).toBe(true)
    expect(published.value).toMatchObject({
      name: 'GM Nightfall',
      characterClass: 'hunter',
      subclass: 'Nightstalker',
      exoticArmor: 'Celestial Nighthawk',
      exoticWeapon: 'Gjallarhorn',
      source: 'equipped',
      statFocus: ['Weapons'],
      activityTags: ['gm'],
    })
    expect(published.value.aspects.map((plug) => plug.name)).toEqual(['Vanishing Step'])
    expect(published.value.description).toBe('Vault rocket included.')
  })

  it('uses a general tag when the loadout name does not name an activity', () => {
    const snapshot = buildProfileSnapshot(profileFixture(), catalogs)
    const boss = snapshot.characters[0]?.inGameLoadouts[0]
    const published = communityBuildFromInGameLoadout({ ...boss!, characterId: '1' })
    expect(published.ok).toBe(true)
    if (!published.ok) return
    expect(published.value.activityTags).toEqual(['general'])
    expect(published.value.description).toBe('In-game loadout: Boss DPS')
  })
})
