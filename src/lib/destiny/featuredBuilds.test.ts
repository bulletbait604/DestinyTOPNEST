import { describe, expect, it } from 'vitest'
import { isCommunityBuildId } from '@/lib/destiny/communityBuildModel'
import {
  FEATURED_BUILD_SPECS,
  featuredBuildRecords,
  featuredBuildsForClass,
  manifestRefForName,
} from '@/lib/destiny/featuredBuilds'
import { catalogLookup } from '@/lib/destiny/itemsCatalog'
import { groupHallByBoard, hallRankReason } from '@/lib/destiny/seasonHall'
import type { SeasonWinner } from '@/lib/destiny/types'

describe('featured builds', () => {
  it('ships 5 or 6 curated builds per class with a source link', () => {
    for (const characterClass of ['hunter', 'titan', 'warlock'] as const) {
      const rows = featuredBuildsForClass(characterClass)
      expect(rows.length).toBeGreaterThanOrEqual(5)
      expect(rows.length).toBeLessThanOrEqual(6)
      for (const row of rows) {
        expect(row.creditName.length).toBeGreaterThan(0)
        expect(row.creditUrl.startsWith('https://')).toBe(true)
        expect(isCommunityBuildId(row.id)).toBe(true)
      }
    }
    const ids = FEATURED_BUILD_SPECS.map((row) => row.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('attaches a hash only when the manifest catalog has that item', () => {
    for (const record of featuredBuildRecords()) {
      expect(record.listing).toBe('featured')
      expect(record.ownerDisplayName).toBe('Featured')
      const named = [
        record.exoticArmorRef,
        record.exoticWeaponRef,
        ...record.aspects,
        ...record.fragments,
        ...record.mods,
      ]
      for (const plug of named) {
        if (!plug?.hash) continue
        const entry = catalogLookup(plug.name)
        expect(entry?.hash).toBe(plug.hash)
      }
      if (record.exoticArmor) {
        const ref = manifestRefForName(record.exoticArmor)
        expect(ref?.name).toBe(record.exoticArmor)
        if (ref?.hash) expect(catalogLookup(record.exoticArmor)?.hash).toBe(ref.hash)
      }
    }
  })
})

describe('season hall', () => {
  it('groups prize boards and explains rank 1 separately from the list', () => {
    const winners: SeasonWinner[] = [
      { category: 'raid', rank: 2, displayName: 'Bee', prize: 'Listed', seasonId: 's1' },
      { category: 'raid', rank: 1, displayName: 'Ada', prize: 'Print', seasonId: 's1' },
      { category: 'new_bonds', rank: 1, displayName: 'Cy', prize: 'Print', seasonId: 's1' },
    ]
    const grouped = groupHallByBoard(winners)
    expect(grouped.raid.map((row) => row.displayName)).toEqual(['Ada', 'Bee'])
    expect(grouped.dungeon).toEqual([])
    expect(grouped.new_bonds[0]?.displayName).toBe('Cy')
    expect(hallRankReason(1)).toContain('Prize leader')
    expect(hallRankReason(3)).toContain('#3')
  })
})
