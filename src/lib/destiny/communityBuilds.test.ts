import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import CommunityBuildsBrowser from '@/app/components/destiny/community/CommunityBuildsBrowser'
import type { BuildSnapshot } from '@/lib/destiny/types'
import {
  communityBuildDraftFromSnapshot,
  communityBuildListFilter,
  inferActivityTags,
  isCommunityBuildId,
  parseCommunityBuildListQuery,
  sanitizePlainText,
  statFocusFromSnapshot,
  validateCommunityBuildComment,
  validateCommunityBuildInput,
} from '@/lib/destiny/communityBuildModel'
import {
  resetCommunityBuildRateLimits,
  takeCommunityBuildRateLimit,
} from '@/lib/destiny/communityBuildRateLimit'
import { parseLoadoutSection } from '@/lib/routing/tabUrl'

function validBuild(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Nightfall well',
    characterClass: 'warlock',
    subclass: 'Dawnblade',
    aspects: ['Touch of Flame'],
    fragments: ['Ember of Empyrean'],
    exoticArmor: 'Sunbracers',
    exoticWeapon: 'Gjallarhorn',
    mods: ['Font of Restoration'],
    statFocus: ['Grenade', 'Health'],
    activityTags: ['gm', 'nightfall'],
    description: 'Stay airborne and keep restoration up.',
    source: 'manual',
    ...overrides,
  }
}

function snapshot(partial: Partial<BuildSnapshot>): BuildSnapshot {
  return {
    id: 'live-1',
    runId: '',
    userId: 'user',
    characterClass: 'warlock',
    subclass: 'Stormcaller',
    super: 'Chaos Reach',
    aspects: ['Arc Soul'],
    fragments: ['Spark of Shock'],
    abilities: [],
    exoticArmor: 'Crown of Tempests',
    exoticWeapon: '—',
    kineticWeapon: 'Fatebringer',
    energyWeapon: '—',
    powerWeapon: 'Gjallarhorn',
    armorMods: ['Font of Agility', '—'],
    artifactPerks: [],
    stats: { Weapons: 30, Health: 100, Class: 70 },
    activityId: 0,
    activityName: 'Currently equipped',
    difficulty: 'normal',
    completedAt: '2026-10-13T00:00:00.000Z',
    durationSeconds: 0,
    deaths: 0,
    fireteamComposition: 'solo',
    ...partial,
  }
}

describe('community build text', () => {
  it('strips tags, decoded markup, and control characters', () => {
    expect(sanitizePlainText('  <b>Solar</b>  Titan  ')).toBe('Solar Titan')
    expect(sanitizePlainText('&lt;script&gt;alert(1)&lt;/script&gt; Raid')).toBe('alert(1) Raid')
    expect(sanitizePlainText('line\u0000one\n\n\n\ntwo', { multiline: true })).toBe('lineone\n\ntwo')
    expect(sanitizePlainText('https://evil.example/x')).toBe('https://evil.example/x')
  })
})

describe('community build validation', () => {
  it('accepts a complete build and drops a mismatched icon', () => {
    const result = validateCommunityBuildInput(
      validBuild({
        name: '<i>Nightfall well</i>',
        exoticArmorRef: { name: 'Other', iconUrl: 'javascript:alert(1)' },
        exoticWeaponRef: {
          name: 'Gjallarhorn',
          hash: 1363886209,
          iconUrl: 'https://www.bungie.net/common/destiny2_content/icons/example.png',
        },
      })
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.name).toBe('Nightfall well')
    expect(result.value.exoticArmorRef).toBeUndefined()
    expect(result.value.exoticWeaponRef?.iconUrl).toContain('bungie.net')
    expect(result.value.statFocus).toEqual(['Grenade', 'Health'])
  })

  it('rejects empty names, unknown classes, missing exotics, and extra stats', () => {
    expect(validateCommunityBuildInput(validBuild({ name: '<b>ab</b>' })).ok).toBe(false)
    expect(validateCommunityBuildInput(validBuild({ characterClass: 'drone' })).ok).toBe(false)
    expect(validateCommunityBuildInput(validBuild({ exoticArmor: '—', exoticWeapon: '' })).ok).toBe(false)
    expect(
      validateCommunityBuildInput(
        validBuild({ statFocus: ['Weapons', 'Health', 'Class', 'Super'] })
      ).ok
    ).toBe(false)
    expect(validateCommunityBuildInput(validBuild({ activityTags: ['coffee'] })).ok).toBe(false)
    expect(validateCommunityBuildComment({ body: '<b>Nice</b>  well  ' })).toEqual({ ok: true, text: 'Nice well' })
    expect(validateCommunityBuildComment({ body: '   ' }).ok).toBe(false)
  })
})

describe('equipped loadout draft', () => {
  it('maps subclass, aspects, mods, and the highest stats', () => {
    const draft = communityBuildDraftFromSnapshot(snapshot({}), '123')
    expect(draft.name).toBe('Stormcaller Warlock')
    expect(draft.characterId).toBe('123')
    expect(draft.source).toBe('equipped')
    expect(draft.exoticArmor).toBe('Crown of Tempests')
    expect(draft.exoticWeapon).toBe('')
    expect(draft.aspects.map((plug) => plug.name)).toEqual(['Arc Soul'])
    expect(draft.mods.map((plug) => plug.name)).toEqual(['Font of Agility'])
    expect(draft.statFocus).toEqual(['Health', 'Class'])
    expect(draft.activityTags).toEqual([])
    expect(statFocusFromSnapshot({ Mobility: 80, Resilience: 10 })).toEqual(['Weapons', 'Health'])
  })

  it('guesses activity tags from the activity name', () => {
    expect(inferActivityTags("King's Fall raid", 'normal')).toEqual(['raid'])
    expect(inferActivityTags('Grandmaster Nightfall', 'master')).toEqual(['gm'])
    expect(inferActivityTags('Trials of Osiris')).toEqual(['trials'])
    expect(inferActivityTags('Currently equipped')).toEqual([])
  })
})

describe('community build queries', () => {
  it('parses filters and escapes search text', () => {
    const parsed = parseCommunityBuildListQuery(
      new URLSearchParams('q=a.b&class=hunter&tag=raid&stat=Melee&sort=top&scope=mine&limit=99&offset=3')
    )
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.query.limit).toBe(24)
    expect(parsed.query.characterClass).toBe('hunter')
    expect(parsed.query.tag).toBe('raid')
    expect(parsed.query.stat).toBe('Melee')
    const filter = communityBuildListFilter(parsed.query, { ownerUserId: 'ada' })
    expect(filter.ownerUserId).toBe('ada')
    expect(filter.status).toBeUndefined()
    const clauses = filter.$or as { name: { $regex: string } }[]
    expect(clauses[0].name.$regex).toBe('a\\.b')
  })

  it('only lists published builds for the public scope', () => {
    const parsed = parseCommunityBuildListQuery(new URLSearchParams())
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    const filter = communityBuildListFilter(parsed.query, {})
    expect(filter.status).toBe('published')
    const saved = communityBuildListFilter({ ...parsed.query, scope: 'saved' }, { savedIds: ['one'] })
    expect(saved).toMatchObject({ status: 'published', id: { $in: ['one'] } })
  })

  it('rejects an unknown sort', () => {
    expect(parseCommunityBuildListQuery(new URLSearchParams('sort=hot')).ok).toBe(false)
  })
})

describe('community build rate limit', () => {
  it('blocks a burst and allows another player', () => {
    resetCommunityBuildRateLimits()
    const start = 1_700_000_000_000
    for (let i = 0; i < 6; i += 1) {
      expect(takeCommunityBuildRateLimit({ userId: 'Ada', action: 'create', now: start + i }).ok).toBe(true)
    }
    const blocked = takeCommunityBuildRateLimit({ userId: 'ada', action: 'create', now: start + 10 })
    expect(blocked.ok).toBe(false)
    if (blocked.ok) return
    expect(blocked.retryAfterSec).toBeGreaterThan(0)
    expect(takeCommunityBuildRateLimit({ userId: 'other', action: 'create', now: start }).ok).toBe(true)
    expect(
      takeCommunityBuildRateLimit({ userId: 'ada', action: 'create', now: start + 60 * 60 * 1000 + 20 }).ok
    ).toBe(true)
  })
})

describe('shared builds placement', () => {
  it('reads the shared section without adding a nav tab id', () => {
    expect(parseLoadoutSection('?tab=loadouts&section=shared')).toBe('shared')
    expect(parseLoadoutSection('?tab=loadouts')).toBeUndefined()
    expect(isCommunityBuildId('not-an-id')).toBe(false)
    expect(isCommunityBuildId('11111111-1111-4111-8111-111111111111')).toBe(true)
  })

  it('renders the shared builds browser in the dark shell', () => {
    const html = renderToStaticMarkup(createElement(CommunityBuildsBrowser, { darkMode: true }))
    expect(html).toContain('Shared builds')
    expect(html).toContain('Loading shared builds')
  })
})
