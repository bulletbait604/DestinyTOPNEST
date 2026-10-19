import { describe, expect, it } from 'vitest'
import {
  buildSnapshotTrend,
  cleanManifestName,
  countOwnedCollectibles,
  dossierFromSnapshots,
  formatPlayed,
  parseActivityHistory,
  parseCharacterSnapshotProfile,
  parseWeaponKills,
  shouldCaptureSnapshot,
  snapshotIsFresh,
  utcDayKey,
  type CharacterSnapshotDoc,
} from './characterSnapshot'

const profile = {
  profile: { data: { currentGuardianRank: 9 } },
  profileRecords: { data: { activeScore: 42000, score: 1000 } },
  profileCollectibles: {
    data: {
      collectibles: {
        '1': { state: 0 },
        '2': { state: 1 },
        '3': { state: 4 },
      },
    },
  },
  characterCollectibles: {
    data: {
      c1: { collectibles: { '1': { state: 0 }, '4': { state: 0 } } },
    },
  },
  characters: {
    data: {
      c1: {
        characterId: 'c1',
        classType: 1,
        light: 2040,
        emblemPath: '/emblem.png',
        emblemBackgroundPath: '/banner.jpg',
        titleRecordHash: 77,
        minutesPlayedTotal: 180,
      },
      c2: { characterId: 'c2', classType: 0, light: 2010, minutesPlayedTotal: 60 },
    },
  },
  characterProgressions: {
    data: { c1: { seasonalArtifact: { powerBonus: 15 } } },
  },
  characterEquipment: {
    data: {
      c1: {
        items: [
          { bucketHash: 3284755031, itemHash: 500 },
          { bucketHash: 1498876634, itemHash: 600 },
          { bucketHash: 1498876634, itemHash: 601 },
        ],
      },
    },
  },
}

function doc(partial: Partial<CharacterSnapshotDoc> & Pick<CharacterSnapshotDoc, 'characterId' | 'day' | 'light'>): CharacterSnapshotDoc {
  return {
    membershipId: '1',
    membershipType: 3,
    capturedAt: `${partial.day}T12:00:00.000Z`,
    className: 'hunter',
    minutesPlayedTotal: 60,
    equipped: [],
    activityClears: [],
    weaponKills: [],
    recentHistory: [],
    ...partial,
  }
}

describe('character snapshots', () => {
  it('reads light, class, subclass, title, artifact, triumphs, and owned collections', () => {
    const parsed = parseCharacterSnapshotProfile(profile)
    expect(parsed.guardianRank).toBe(9)
    expect(parsed.triumphScore).toBe(42000)
    expect(parsed.collectionsOwned).toBe(3)
    expect(parsed.characters.map((character) => character.className)).toEqual(['hunter', 'titan'])
    expect(parsed.characters[0]).toMatchObject({
      light: 2040,
      subclassHash: 500,
      titleRecordHash: 77,
      minutesPlayedTotal: 180,
      artifactPower: 15,
      emblemUrl: 'https://www.bungie.net/emblem.png',
      emblemBackgroundUrl: 'https://www.bungie.net/banner.jpg',
    })
    expect(parsed.characters[0]!.equipped.map((slot) => slot.itemHash)).toEqual([500, 600])
  })

  it('leaves triumphs unset when records were not returned', () => {
    expect(parseCharacterSnapshotProfile({ characters: { data: {} } }).triumphScore).toBeUndefined()
    expect(countOwnedCollectibles({})).toBeUndefined()
  })

  it('counts completed activities and keeps unfinished runs out of the clear total', () => {
    const parsed = parseActivityHistory(
      {
        activities: [
          { period: '2026-10-02T00:00:00Z', activityDetails: { referenceId: 10 }, values: { completed: { basic: { value: 1 } } } },
          { period: '2026-10-03T00:00:00Z', activityDetails: { directorActivityHash: 10 }, values: { completed: { basic: { value: 1 } } } },
          { period: '2026-10-04T00:00:00Z', activityDetails: { referenceId: 11 }, values: { completed: { basic: { value: 0 } } } },
        ],
      },
      'raid'
    )
    expect(parsed.clears).toEqual([{ activityHash: 10, mode: 'raid', clears: 2 }])
    expect(parsed.recent[0]?.activityHash).toBe(11)
    expect(parsed.recent).toHaveLength(3)
  })

  it('keeps the five highest weapon kill counts', () => {
    const weapons = Array.from({ length: 6 }, (_, index) => ({
      referenceId: index + 1,
      values: { uniqueWeaponKills: { basic: { value: (index + 1) * 10 } } },
    }))
    expect(parseWeaponKills({ weapons }).map((weapon) => weapon.itemHash)).toEqual([6, 5, 4, 3, 2])
  })

  it('builds one trend point per day from the highest light', () => {
    const trend = buildSnapshotTrend([
      { day: '2026-10-02', light: 2000, triumphScore: 10 },
      { day: '2026-10-01', light: 1990 },
      { day: '2026-10-02', light: 2010 },
      { day: 'bad', light: 3000 },
    ])
    expect(trend).toEqual([
      { day: '2026-10-01', light: 1990, triumphScore: undefined },
      { day: '2026-10-02', light: 2010, triumphScore: 10 },
    ])
  })

  it('skips a refresh when the snapshot is under 12 hours old', () => {
    const now = new Date('2026-10-19T18:00:00.000Z')
    expect(snapshotIsFresh('2026-10-19T08:00:00.000Z', now)).toBe(true)
    expect(shouldCaptureSnapshot('2026-10-19T08:00:00.000Z', now)).toBe(false)
    expect(shouldCaptureSnapshot('2026-10-18T18:00:00.000Z', now)).toBe(true)
    expect(shouldCaptureSnapshot(undefined, now)).toBe(true)
    expect(utcDayKey(now)).toBe('2026-10-19')
  })

  it('drops hash fallbacks and formats play time', () => {
    expect(cleanManifestName('Item 12', 12)).toBeUndefined()
    expect(cleanManifestName('Fatebringer', 12)).toBe('Fatebringer')
    expect(formatPlayed(180)).toBe('3h')
    expect(formatPlayed(0)).toBe('—')
  })

  it('builds a dossier from the latest day and flags guides', () => {
    const dossier = dossierFromSnapshots(
      [
        doc({
          characterId: 'old',
          day: '2026-10-01',
          light: 1900,
          triumphScore: 10,
        }),
        doc({
          characterId: 'hunter',
          day: '2026-10-02',
          light: 2040,
          className: 'hunter',
          triumphScore: 20,
          subclassName: 'Nightstalker',
          activityClears: [
            { name: "King's Fall", mode: 'raid', clears: 2 },
            { name: '', mode: 'raid', clears: 4 },
          ],
          weaponKills: [{ name: 'Fatebringer', kills: 400 }],
          recentHistory: [{ name: "King's Fall", mode: 'raid', completed: true, period: '2026-10-02T00:00:00Z' }],
        }),
        doc({
          characterId: 'titan',
          day: '2026-10-02',
          light: 2010,
          className: 'titan',
          activityClears: [{ name: "King's Fall", mode: 'raid', clears: 1 }],
        }),
      ],
      12
    )
    expect(dossier?.day).toBe('2026-10-02')
    expect(dossier?.characters.map((character) => character.characterId)).toEqual(['hunter', 'titan'])
    expect(dossier?.activityClears).toEqual([{ name: "King's Fall", mode: 'raid', clears: 3 }])
    expect(dossier?.weaponKills[0]?.name).toBe('Fatebringer')
    expect(dossier?.trend.map((point) => point.light)).toEqual([1900, 2040])
    expect(dossier?.guidesFirstClears).toBe(true)
    expect(dossierFromSnapshots([], 0)).toBeNull()
  })
})
