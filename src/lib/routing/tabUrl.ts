import { routeForTab } from '@/lib/destiny/pageCatalog'
import type { DestinyTopNestTab } from '@/lib/destiny/types'

const DESTINY_TABS = new Set<DestinyTopNestTab>([
  'overview',
  'leaderboards',
  'fireteam',
  'profile',
  'loadouts',
  'builds',
  'clans',
  'season',
  'admin',
  'contracts',
  'sherpas',
  'events',
  'guardians',
  'compare',
  'lookup',
  'quests',
  'ask',
])

export function isDestinyTopNestTab(value: string): value is DestinyTopNestTab {
  return DESTINY_TABS.has(value as DestinyTopNestTab)
}

export function parseTabFromSearch(search: string): DestinyTopNestTab {
  const params = new URLSearchParams(search)
  const tab = params.get('tab') ?? params.get('destiny')
  // 'season' is now its own tab (rules, prizes, dates).
  if (tab && isDestinyTopNestTab(tab)) return tab
  if (params.get('bungie')) return 'overview'
  return 'overview'
}

export function syncTabToUrl(tab: DestinyTopNestTab) {
  if (typeof window === 'undefined') return

  const params = new URLSearchParams(window.location.search)
  params.delete('destiny')
  params.delete('profileView')
  params.delete('section')

  if (tab === 'overview') {
    params.delete('tab')
  } else {
    params.set('tab', tab)
  }

  if (tab !== 'guardians') {
    params.delete('q')
    params.delete('guardian')
    params.delete('membershipType')
  }

  const qs = params.toString()
  const path = hubPathname()
  const next = qs ? `${path}?${qs}` : path
  window.history.replaceState(null, '', next)
}

export function syncLoadoutSectionToUrl(section: LoadoutSectionId) {
  if (typeof window === 'undefined') return
  const params = new URLSearchParams(window.location.search)
  if (section === 'mine') params.delete('section')
  else params.set('section', section)
  const qs = params.toString()
  const next = qs ? `${window.location.pathname}?${qs}` : window.location.pathname
  window.history.replaceState(null, '', next)
}

export const DESTINY_TAB_NAV_EVENT = 'destiny-topnest:tab'

export type ProfileNavView = 'guardian' | 'passport' | 'activities' | 'loadouts'

export const LOADOUT_SECTIONS = ['mine', 'community', 'builder', 'shared'] as const
export type LoadoutSectionId = (typeof LOADOUT_SECTIONS)[number]

export const DESTINY_PROFILE_NAV_EVENT = 'destiny-topnest:profile-nav'

function hubPathname(): string {
  if (typeof window === 'undefined') return '/'
  if (window.location.pathname.startsWith('/builds')) return '/'
  return window.location.pathname || '/'
}

export function parseLoadoutSection(search: string): LoadoutSectionId | undefined {
  const section = new URLSearchParams(search).get('section')
  if (section && (LOADOUT_SECTIONS as readonly string[]).includes(section)) {
    return section as LoadoutSectionId
  }
  return undefined
}

export function parseProfileView(search: string): ProfileNavView | undefined {
  const value = new URLSearchParams(search).get('profileView')
  if (value === 'guardian' || value === 'passport' || value === 'activities' || value === 'loadouts') {
    return value
  }
  return undefined
}

/** Switch to Profile and a specific sub-section (Guardian, Passport, Loadouts). */
export function navigateProfileSection(view: ProfileNavView) {
  if (typeof window === 'undefined') return
  if (view === 'passport') {
    window.location.assign('/passport')
    return
  }
  if (view === 'loadouts') {
    window.location.assign('/builds?section=mine')
    return
  }
  window.location.assign('/profile')
}

/** Switch the shell, or open the dedicated page for builds, community, weekly, and profile. */
export function navigateDestinyTab(tab: DestinyTopNestTab) {
  if (typeof window === 'undefined') return
  const target = routeForTab(tab)
  if (target) {
    const here = `${window.location.pathname}${window.location.search}`
    if (here !== target) {
      window.location.assign(target)
      return
    }
    window.dispatchEvent(new CustomEvent(DESTINY_TAB_NAV_EVENT, { detail: tab }))
    return
  }
  if (window.location.pathname !== '/') {
    window.location.assign(`/?tab=${tab}`)
    return
  }
  syncTabToUrl(tab)
  window.dispatchEvent(new CustomEvent(DESTINY_TAB_NAV_EVENT, { detail: tab }))
}

/** Open player-shared builds. */
export function navigateSharedBuilds() {
  if (typeof window === 'undefined') return
  window.location.assign('/builds')
}

export const GUARDIAN_SEARCH_EVENT = 'destiny-topnest:guardian-search'

function assignPeople(next: string) {
  if (typeof window === 'undefined') return
  window.location.assign(next)
}

/** Open the guardian directory, optionally with a Bungie name query. */
export function navigateGuardianSearch(query: string) {
  const params = new URLSearchParams()
  const q = query.trim()
  if (q) params.set('q', q)
  const qs = params.toString()
  assignPeople(qs ? `/people?${qs}` : '/people')
}

/** Open one public guardian profile by Bungie membership id. */
export function navigateGuardianProfile(membershipId: string, membershipType?: number) {
  const params = new URLSearchParams()
  params.set('guardian', membershipId)
  if (membershipType) params.set('membershipType', String(membershipType))
  assignPeople(`/people?${params.toString()}`)
}

export function defaultBungieReturnPath(): string {
  return '/'
}

export function stripOAuthParams() {
  if (typeof window === 'undefined') return
  const params = new URLSearchParams(window.location.search)
  if (!params.has('bungie') && !params.has('message')) return
  params.delete('bungie')
  params.delete('message')
  const qs = params.toString()
  const next = qs ? `${window.location.pathname}?${qs}` : window.location.pathname
  window.history.replaceState(null, '', next)
}

export function stripUrlParams(keys: string[]) {
  if (typeof window === 'undefined') return
  const params = new URLSearchParams(window.location.search)
  let changed = false
  for (const key of keys) {
    if (params.has(key)) {
      params.delete(key)
      changed = true
    }
  }
  if (!changed) return
  const qs = params.toString()
  const next = qs ? `${window.location.pathname}?${qs}` : window.location.pathname
  window.history.replaceState(null, '', next)
}
