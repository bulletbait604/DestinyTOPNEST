import type { BuildIntelligenceCard, ExternalBuildSource, PlayerProfile } from '@/lib/destiny/types'

export const PROFILE_CACHE_TTL_MS = 15 * 60 * 1000

const STORAGE_PREFIX = 'topnest-cache-'

const KEYS = {
  full: `${STORAGE_PREFIX}full-profile`,
  summary: `${STORAGE_PREFIX}summary-profile`,
  loadouts: `${STORAGE_PREFIX}loadouts`,
  builds: `${STORAGE_PREFIX}builds`,
} as const

interface CachedEntry<T> {
  savedAt: number
  userId?: string
  data: T
}

export interface LoadoutsCacheData {
  current: import('@/lib/destiny/types').BuildSnapshot | null
  saved: import('@/lib/destiny/types').BuildSnapshot[]
  favorites: import('@/lib/destiny/types').BuildSnapshot[]
  equipSupported: boolean
  equipMessage: string
}

export interface BuildsCacheData {
  verifiedBuilds: BuildIntelligenceCard[]
  externalBuilds: ExternalBuildSource[]
  metaResearchSummary: string
}

/** Prefer localStorage so profile/build cache survives tab close and redeploys (Mongo remains source of truth). */
function readStorage(): Storage | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

function readEntry<T>(key: string, expectedUserId?: string): CachedEntry<T> | null {
  const storage = readStorage()
  if (!storage) return null
  try {
    const raw = storage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CachedEntry<T>
    if (!parsed?.savedAt || parsed.data == null) return null
    if (expectedUserId && parsed.userId && parsed.userId !== expectedUserId) return null
    return parsed
  } catch {
    return null
  }
}

function writeEntry<T>(key: string, data: T, userId?: string): void {
  const storage = readStorage()
  if (!storage) return
  try {
    const entry: CachedEntry<T> = { savedAt: Date.now(), data, userId }
    storage.setItem(key, JSON.stringify(entry))
  } catch {
    // localStorage full or unavailable — in-memory cache still works
  }
}

function removeKey(key: string): void {
  const storage = readStorage()
  if (!storage) return
  storage.removeItem(key)
}

export function isCacheFresh(savedAt: number, ttlMs = PROFILE_CACHE_TTL_MS): boolean {
  return Date.now() - savedAt < ttlMs
}

export function readCachedFullProfile(
  userId?: string
): { profile: PlayerProfile; savedAt: number } | null {
  const entry = readEntry<PlayerProfile>(KEYS.full, userId)
  return entry ? { profile: entry.data, savedAt: entry.savedAt } : null
}

export function writeCachedFullProfile(profile: PlayerProfile): void {
  writeEntry(KEYS.full, profile, profile.userId)
  writeEntry(KEYS.summary, profile, profile.userId)
}

export function readCachedSummaryProfile(
  userId?: string
): { profile: PlayerProfile; savedAt: number } | null {
  const summary = readEntry<PlayerProfile>(KEYS.summary, userId)
  if (summary) return { profile: summary.data, savedAt: summary.savedAt }
  return readCachedFullProfile(userId)
}

export function writeCachedSummaryProfile(profile: PlayerProfile): void {
  writeEntry(KEYS.summary, profile, profile.userId)
}

interface LoadoutsCacheStore {
  savedAtByCharacter: Record<string, number>
  data: Record<string, LoadoutsCacheData>
}

export function readCachedLoadouts(
  characterId: string,
  userId?: string
): { data: LoadoutsCacheData; savedAt: number } | null {
  const all = readEntry<LoadoutsCacheStore>(KEYS.loadouts, userId)
  const row = all?.data.data[characterId]
  const savedAt = all?.data.savedAtByCharacter?.[characterId]
  if (!all || !row || savedAt == null) return null
  return { data: row, savedAt }
}

export function writeCachedLoadouts(
  characterId: string,
  data: LoadoutsCacheData,
  userId?: string
): void {
  const existing = readEntry<LoadoutsCacheStore>(KEYS.loadouts, userId)
  const map = existing?.data.data ?? {}
  const savedAtByCharacter = existing?.data.savedAtByCharacter ?? {}
  map[characterId] = data
  savedAtByCharacter[characterId] = Date.now()
  writeEntry(KEYS.loadouts, { data: map, savedAtByCharacter }, userId)
}

export function readCachedBuilds(userId?: string): { data: BuildsCacheData; savedAt: number } | null {
  const entry = readEntry<BuildsCacheData>(KEYS.builds, userId)
  return entry ? { data: entry.data, savedAt: entry.savedAt } : null
}

export function writeCachedBuilds(data: BuildsCacheData, userId?: string): void {
  writeEntry(KEYS.builds, data, userId)
}

export function clearProfileCacheStorage(): void {
  for (const key of Object.values(KEYS)) removeKey(key)
}

/** One-time migration from sessionStorage after switching to localStorage. */
export function migrateProfileCacheFromSessionStorage(): void {
  if (typeof window === 'undefined') return
  try {
    for (const key of Object.values(KEYS)) {
      const legacy = sessionStorage.getItem(key)
      if (legacy && !localStorage.getItem(key)) {
        localStorage.setItem(key, legacy)
      }
      sessionStorage.removeItem(key)
    }
  } catch {
    // ignore migration failures
  }
}
