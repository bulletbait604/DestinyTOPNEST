import { describe, expect, it } from 'vitest'
import { collectItems, parseCharacters, parseLifetimeStats, searchItems, sealFromNode, VAULT_BUCKET_HASH } from './fullProfileParse'

describe('full profile parsing', () => {
  it('parses characters newest first', () => {
    const chars = parseCharacters({
      a: { characterId: 'a', classType: 0, light: 2000, dateLastPlayed: '2026-10-01T00:00:00Z' },
      b: { characterId: 'b', classType: 2, light: 2010, dateLastPlayed: '2026-10-10T00:00:00Z', emblemPath: '/x.jpg' },
    })
    expect(chars.map((c) => c.className)).toEqual(['Warlock', 'Titan'])
    expect(chars[0]!.emblemPath).toBe('https://www.bungie.net/x.jpg')
  })
  it('collects vault, inventory and equipped items', () => {
    const items = collectItems({
      profileInventory: { data: { items: [{ itemHash: 1, bucketHash: VAULT_BUCKET_HASH }, { itemHash: 2, bucketHash: 99 }] } },
      characterInventories: { data: { c1: { items: [{ itemHash: 3 }] } } },
      characterEquipment: { data: { c1: { items: [{ itemHash: 4 }] } } },
    })
    expect(items.map((i) => [i.itemHash, i.where])).toEqual([
      [1, 'vault'],
      [3, 'character'],
      [4, 'equipped'],
    ])
  })
  it('searches items by all terms', () => {
    const items = [
      { name: 'Gjallarhorn', itemType: 'Rocket Launcher', tier: 'Exotic' },
      { name: 'Fatebringer', itemType: 'Hand Cannon', tier: 'Legendary' },
    ]
    expect(searchItems(items, 'exotic rocket').map((i) => i.name)).toEqual(['Gjallarhorn'])
    expect(searchItems(items, '')).toHaveLength(2)
  })
  it('computes lifetime stats and raid/dungeon clears', () => {
    const stats = parseLifetimeStats(
      { mergedAllCharacters: { results: { allPvE: { allTime: { kills: { basic: { value: 100 } }, deaths: { basic: { value: 40 } } } } } } },
      {
        raid: { allTime: { activitiesCleared: { basic: { value: 3 } }, fastestCompletionMs: { basic: { value: 1800000 } } } },
        dungeon: { allTime: { activitiesCleared: { basic: { value: 2 } } } },
      }
    )
    expect(stats.kd).toBe(2.5)
    expect(stats.raidClears).toBe(3)
    expect(stats.dungeonClears).toBe(2)
    expect(stats.fastestRaidSeconds).toBe(1800)
  })
  it('builds seal progress', () => {
    expect(sealFromNode(5, { displayProperties: { name: 'Rivensbane' } }, { progressValue: 4, completionValue: 4 }).complete).toBe(true)
  })
})
