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
])

export function isDestinyTopNestTab(value: string): value is DestinyTopNestTab {
  return DESTINY_TABS.has(value as DestinyTopNestTab)
}

export function parseTabFromSearch(search: string): DestinyTopNestTab {
  const params = new URLSearchParams(search)
  const tab = params.get('tab') ?? params.get('destiny')
  if (tab === 'season') return 'leaderboards'
  if (tab && isDestinyTopNestTab(tab)) return tab
  if (params.get('bungie')) return 'overview'
  return 'overview'
}

export function syncTabToUrl(tab: DestinyTopNestTab) {
  if (typeof window === 'undefined') return

  const params = new URLSearchParams(window.location.search)
  params.delete('destiny')

  if (tab === 'overview') {
    params.delete('tab')
  } else {
    params.set('tab', tab)
  }

  const qs = params.toString()
  const next = qs ? `${window.location.pathname}?${qs}` : window.location.pathname
  window.history.replaceState(null, '', next)
}

export const DESTINY_TAB_NAV_EVENT = 'destiny-topnest:tab'

export type ProfileNavView = 'guardian' | 'activities' | 'loadouts'

export const DESTINY_PROFILE_NAV_EVENT = 'destiny-topnest:profile-nav'

/** Switch to Profile and a specific sub-section (Guardian, Previous Activities, Loadouts). */
export function navigateProfileSection(view: ProfileNavView) {
  syncTabToUrl('profile')
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(DESTINY_PROFILE_NAV_EVENT, { detail: view }))
  }
}

/** Update URL and notify the shell to switch tabs (e.g. header Settings → Admin). */
export function navigateDestinyTab(tab: DestinyTopNestTab) {
  syncTabToUrl(tab)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(DESTINY_TAB_NAV_EVENT, { detail: tab }))
  }
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
