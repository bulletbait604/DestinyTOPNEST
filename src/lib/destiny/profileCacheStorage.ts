import type { BuildIntelligenceCard, ExternalBuildSource, PlayerProfile } from '@/lib/destiny/types'

export const PROFILE_CACHE_TTL_MS = 15 * 60 * 1000

const KEYS = {
  full: 'topnest-cache-full-profile',
  summary: 'topnest-cache-summary-profile',
  loadouts: 'topnest-cache-loadouts',
  builds: 'topnest-cache-builds',
} as const

interface CachedEntry<T> {
  savedAt: number
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

function readEntry<T>(key: string): CachedEntry<T> | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CachedEntry<T>
    if (!parsed?.savedAt || parsed.data == null) return null
    return parsed
  } catch {
    return null
  }
}

function writeEntry<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return
  try {
    const entry: CachedEntry<T> = { savedAt: Date.now(), data }
    sessionStorage.setItem(key, JSON.stringify(entry))
  } catch {
    // sessionStorage full or unavailable — in-memory cache still works
  }
}

function removeKey(key: string): void {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(key)
}

export function isCacheFresh(savedAt: number, ttlMs = PROFILE_CACHE_TTL_MS): boolean {
  return Date.now() - savedAt < ttlMs
}

export function readCachedFullProfile(): { profile: PlayerProfile; savedAt: number } | null {
  const entry = readEntry<PlayerProfile>(KEYS.full)
  return entry ? { profile: entry.data, savedAt: entry.savedAt } : null
}

export function writeCachedFullProfile(profile: PlayerProfile): void {
  writeEntry(KEYS.full, profile)
  writeEntry(KEYS.summary, profile)
}

export function readCachedSummaryProfile(): { profile: PlayerProfile; savedAt: number } | null {
  const summary = readEntry<PlayerProfile>(KEYS.summary)
  if (summary) return { profile: summary.data, savedAt: summary.savedAt }
  return readCachedFullProfile()
}

export function writeCachedSummaryProfile(profile: PlayerProfile): void {
  writeEntry(KEYS.summary, profile)
}

export function readCachedLoadouts(
  characterId: string
): { data: LoadoutsCacheData; savedAt: number } | null {
  const all = readEntry<Record<string, LoadoutsCacheData>>(KEYS.loadouts)
  const row = all?.data[characterId]
  if (!all || !row) return null
  return { data: row, savedAt: all.savedAt }
}

export function writeCachedLoadouts(characterId: string, data: LoadoutsCacheData): void {
  const existing = readEntry<Record<string, LoadoutsCacheData>>(KEYS.loadouts)
  const map = existing?.data ?? {}
  map[characterId] = data
  writeEntry(KEYS.loadouts, map)
}

export function readCachedBuilds(): { data: BuildsCacheData; savedAt: number } | null {
  const entry = readEntry<BuildsCacheData>(KEYS.builds)
  return entry ? { data: entry.data, savedAt: entry.savedAt } : null
}

export function writeCachedBuilds(data: BuildsCacheData): void {
  writeEntry(KEYS.builds, data)
}

export function clearProfileCacheStorage(): void {
  for (const key of Object.values(KEYS)) removeKey(key)
}
