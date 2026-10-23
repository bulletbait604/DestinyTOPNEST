import { describe, expect, it } from 'vitest'
import { dismissGuide, isGearTab, isGuideDismissed, MAIN_NAV, navHint } from '@/app/components/hub/clarity'

describe('plain-language navigation', () => {
  it('describes the current page in one line', () => {
    expect(navHint('overview')).toContain('how TopNest works')
    expect(navHint('guardians')).toContain('rating')
    expect(navHint('leaderboards')).toContain('3D print')
    expect(navHint('compare')).toContain('side by side')
    expect(navHint('sherpas').toLowerCase()).toContain('sherpa')
  })

  it('puts the five main actions in the nav', () => {
    expect(MAIN_NAV.map((item) => item.label)).toEqual([
      'Home',
      'Score a Run',
      'Rate a Guardian',
      'Leaderboards',
      'Ask AI',
    ])
  })

  it('groups builds, compare, lookup, and quests as gear', () => {
    expect(isGearTab('loadouts')).toBe(true)
    expect(isGearTab('quests')).toBe(true)
    expect(isGearTab('overview')).toBe(false)
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