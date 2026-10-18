import { afterEach, describe, expect, it, vi } from 'vitest'
import { compareLoadoutSides, loadoutSideFromCommunityBuild, readPinnedLoadout, pinLoadoutForCompare, type LoadoutSide } from '@/lib/destiny/loadoutCompare'
import { parseEquippedCharacters } from '@/lib/destiny/equippedSlots'
import { applyQuestProgress, classifyQuestDefinition, collectQuestProgress, filterQuestEntries } from '@/lib/destiny/questCatalog'
import type { CommunityBuildPublic } from '@/lib/destiny/communityBuildModel'

function side(partial: Partial<LoadoutSide>): LoadoutSide {
  return {
    id: 'a',
    title: 'A',
    source: 'shared',
    ownerName: 'Ada',
    characterClass: 'hunter',
    subclass: 'Nightstalker',
    exoticArmor: 'Orpheus Rig',
    exoticWeapon: 'Leviathan’s Breath',
    aspects: 'Vanishing Step',
    fragments: 'Echo of Dilation',
    mods: '—',
    statFocus: 'Mobility',
    tags: 'raid',
    weapons: '—',
    ...partial,
  }
}

describe('loadout compare', () => {
  it('pins an equipped side for the compare table and reads it once', () => {
    const store = new Map<string, string>()
    vi.stubGlobal('window', {
      sessionStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => store.set(key, value),
        removeItem: (key: string) => store.delete(key),
      },
    })
    const equipped = side({ id: 'eq', title: 'Equipped', source: 'equipped', likes: undefined })
    pinLoadoutForCompare(equipped)
    expect(readPinnedLoadout()?.title).toBe('Equipped')
    expect(readPinnedLoadout()).toBeNull()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('marks matching rows and keeps likes on a shared build', () => {
    const build = {
      id: 'b1',
      name: 'Void hunter',
      ownerDisplayName: 'Ada',
      upvoteCount: 4,
      characterClass: 'hunter',
      subclass: 'Nightstalker',
      exoticArmor: 'Orpheus Rig',
      exoticWeapon: 'Leviathan’s Breath',
      aspects: [{ name: 'Vanishing Step' }],
      fragments: [{ name: 'Echo of Dilation' }],
      mods: [],
      statFocus: ['Mobility'],
      activityTags: ['raid'],
    } as unknown as CommunityBuildPublic
    const shared = loadoutSideFromCommunityBuild(build)
    expect(shared.likes).toBe(4)
    const rows = compareLoadoutSides(shared, side({ subclass: 'Gunslinger', exoticArmor: 'Celestial Nighthawk' }))
    expect(rows.find((row) => row.label === 'Class')?.same).toBe(true)
    expect(rows.find((row) => row.label === 'Subclass')?.same).toBe(false)
    expect(rows.find((row) => row.label === 'Exotic armor')?.right).toBe('Celestial Nighthawk')
  })
})

describe('equipped slots', () => {
  it('keeps weapons and the subclass and drops other buckets', () => {
    const characters = parseEquippedCharacters({
      characters: { data: { c1: { characterId: 'c1', classType: 0, light: 2000 } } },
      characterEquipment: {
        data: {
          c1: {
            items: [
              { itemHash: 10, bucketHash: 1498876634 },
              { itemHash: 20, bucketHash: 3284755031 },
              { itemHash: 30, bucketHash: 3448274439 },
            ],
          },
        },
      },
    })
    expect(characters[0]?.className).toBe('titan')
    expect(characters[0]?.slots.map((slot) => slot.bucket)).toEqual(['kinetic', 'subclass'])
  })
})

describe('quest catalog', () => {
  it('classifies quests, exotic quests, pursuits, and catalysts', () => {
    expect(
      classifyQuestDefinition({
        hash: 1,
        displayProperties: { name: 'The Witch Queen' },
        itemTypeDisplayName: 'Quest',
        inventory: { tierTypeName: 'Legendary' },
      })?.kind
    ).toBe('quest')
    expect(
      classifyQuestDefinition({
        hash: 2,
        displayProperties: { name: 'Xenophage' },
        itemTypeDisplayName: 'Quest',
        inventory: { tierTypeName: 'Exotic' },
      })?.kind
    ).toBe('exotic_quest')
    expect(
      classifyQuestDefinition({
        hash: 3,
        displayProperties: { name: 'Weekly bounty' },
        itemTypeDisplayName: 'Bounty',
      })?.kind
    ).toBe('pursuit')
    expect(
      classifyQuestDefinition({
        hash: 4,
        displayProperties: { name: 'Touch of Malice Catalyst' },
        itemTypeDisplayName: 'Modified',
      })?.kind
    ).toBe('catalyst')
    expect(classifyQuestDefinition({ hash: 5, displayProperties: { name: 'Fatebringer' }, itemTypeDisplayName: 'Hand Cannon' })).toBeNull()
  })

  it('marks signed-in progress from inventory and objectives', () => {
    const owned = collectQuestProgress({
      characterInventories: { data: { c: { items: [{ itemHash: 2, itemInstanceId: 'inst' }] } } },
      itemComponents: { objectives: { data: { inst: { objectives: [{ progress: 2, completionValue: 2 }] } } } },
    })
    const [done, fresh] = applyQuestProgress(
      [
        { hash: 2, name: 'Xenophage', description: '', kind: 'exotic_quest' },
        { hash: 9, name: 'Other', description: '', kind: 'quest' },
      ],
      owned
    )
    expect(done?.progress.state).toBe('complete')
    expect(fresh?.progress.state).toBe('not_started')
    expect(filterQuestEntries([done!, fresh!], 'catalyst')).toEqual([])
  })
})
