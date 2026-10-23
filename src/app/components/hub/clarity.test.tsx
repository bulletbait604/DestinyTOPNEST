import { describe, expect, it } from 'vitest'
import { dismissGuide, isGearTab, isGuideDismissed, MAIN_NAV, MORE_NAV, navHint } from '@/app/components/hub/clarity'
import { routeForTab } from '@/lib/destiny/pageCatalog'

describe('plain-language navigation', () => {
  it('describes the current page in one line', () => {
    expect(navHint('overview')).toContain('how TopNest works')
    expect(navHint('guardians')).toContain('vote')
    expect(navHint('leaderboards')).toContain('3D print')
    expect(navHint('compare')).toContain('side by side')
    expect(navHint('sherpas').toLowerCase()).toContain('sherpa')
  })

  it('puts the main actions in the nav and keeps More to three pages', () => {
    expect(MAIN_NAV.map((item) => item.label)).toEqual([
      'Home',
      'Score a Run',
      'Vote',
      'Leaderboards',
      'Builds',
      'Ask AI',
    ])
    expect(MORE_NAV.map((item) => item.label)).toEqual(['Community', 'Weekly & Quests', 'Profile & Prizes'])
  })

  it('groups builds together and sends old links to the new pages', () => {
    expect(isGearTab('loadouts')).toBe(true)
    expect(isGearTab('compare')).toBe(true)
    expect(isGearTab('quests')).toBe(false)
    expect(isGearTab('overview')).toBe(false)
    expect(routeForTab('compare')).toBe('/compare')
    expect(routeForTab('sherpas')).toBe('/sherpas')
    expect(routeForTab('clans')).toBe('/clans')
    expect(routeForTab('contracts')).toBe('/quests')
    expect(routeForTab('season')).toBe('/rules')
    expect(routeForTab('lookup')).toBe('/builds?section=mine')
  })

  it('remembers when the first-visit guide is dismissed', () => {
    const store = new Map<string, string>()
    const storage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value)
      },
    }
    expect(isGuideDismissed(storage)).toBe(false)
    dismissGuide(storage)
    expect(isGuideDismissed(storage)).toBe(true)
  })
})