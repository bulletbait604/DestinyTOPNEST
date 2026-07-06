import type { ActivityType, VerificationStatus } from '@/lib/destiny/types'

export const SYNC_RECENT_MS = 5 * 60 * 1000
export const SYNC_ACTIVE_MS = 45 * 1000

export const SYNC_AT_STORAGE_KEY = 'topnestLastSyncAt'
export const SYNC_UPDATED_EVENT = 'topnest-sync-updated'
export const SYNC_RESULT_EVENT = 'topnest-sync-result'
export const OVERVIEW_REFRESH_EVENT = 'topnest-overview-refresh'
export const PROFILE_REFRESH_EVENT = 'topnest-profile-refresh'

export interface SyncedRunSummary {
  activityName: string
  activityType: ActivityType
  pointsAwarded: number
  verificationStatus: VerificationStatus
}

export interface SyncResultDetail {
  imported: number
  synced: number
  flagged: number
  builds: number
  newRuns: SyncedRunSummary[]
}

export function dispatchSyncSuccess(detail: SyncResultDetail) {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(SYNC_AT_STORAGE_KEY, String(Date.now()))
  window.dispatchEvent(new Event(SYNC_UPDATED_EVENT))
  window.dispatchEvent(new Event(PROFILE_REFRESH_EVENT))
  window.dispatchEvent(new Event('topnest-profile-refresh'))
  window.dispatchEvent(new Event(OVERVIEW_REFRESH_EVENT))
  window.dispatchEvent(new CustomEvent<SyncResultDetail>(SYNC_RESULT_EVENT, { detail }))
}

export function readLastSyncedAt(): number | null {
  if (typeof window === 'undefined') return null
  const raw = sessionStorage.getItem(SYNC_AT_STORAGE_KEY)
  if (!raw) return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}
