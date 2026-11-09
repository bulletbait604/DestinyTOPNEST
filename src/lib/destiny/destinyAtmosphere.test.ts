import { describe, expect, it } from 'vitest'
import {
  DESTINY_ACCENTS,
  DESTINY_INK,
  DESTINY_MUTED,
  DESTINY_PANEL,
  DESTINY_SCENES,
  contrastRatio,
  destinyAccentById,
  destinySceneById,
  sceneCredit,
} from '@/lib/destiny/destinyAtmosphere'

describe('destiny atmosphere', () => {
  it('uses Bungie post-game paths this app already serves from bungie.net', () => {
    expect(DESTINY_SCENES.map((scene) => scene.path)).toEqual([
      '/img/destiny_content/pgcr/patrol_edz.jpg',
      '/img/destiny_content/pgcr/tower.jpg',
      '/img/destiny_content/pgcr/raid_garden_of_salvation.jpg',
      '/img/destiny_content/pgcr/europa-raid-deep-stone-crypt.jpg',
    ])
    expect(sceneCredit(DESTINY_SCENES[0]!)).toContain('www.bungie.net')
    expect(sceneCredit(DESTINY_SCENES[0]!)).toContain('not affiliated')
  })

  it('keeps accent buttons and panel text at WCAG AA', () => {
    for (const accent of DESTINY_ACCENTS) {
      expect(contrastRatio(accent.onColor, accent.color)).toBeGreaterThanOrEqual(4.5)
    }
    expect(contrastRatio(DESTINY_INK, DESTINY_PANEL)).toBeGreaterThanOrEqual(7)
    expect(contrastRatio(DESTINY_MUTED, DESTINY_PANEL)).toBeGreaterThanOrEqual(4.5)
  })

  it('falls back instead of accepting an unknown look', () => {
    expect(destinySceneById('nope').id).toBe('traveler')
    expect(destinyAccentById(null).id).toBe('arc')
  })
})
