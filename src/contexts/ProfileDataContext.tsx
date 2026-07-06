'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { PlayerProfile } from '@/lib/destiny/types'
import {
  clearProfileCacheStorage,
  isCacheFresh,
  readCachedBuilds,
  readCachedFullProfile,
  readCachedLoadouts,
  readCachedSummaryProfile,
  writeCachedBuilds,
  writeCachedFullProfile,
  writeCachedLoadouts,
  writeCachedSummaryProfile,
  type BuildsCacheData,
  type LoadoutsCacheData,
} from '@/lib/destiny/profileCacheStorage'
import { PROFILE_REFRESH_EVENT } from '@/lib/destiny/syncEvents'
import { useBungieLink } from '@/hooks/useBungieLink'

interface FetchOptions {
  force?: boolean
}

interface ProfileDataContextValue {
  fullProfile: PlayerProfile | null
  summaryProfile: PlayerProfile | null
  fullLoading: boolean
  summaryLoading: boolean
  loadoutsByCharacter: Record<string, LoadoutsCacheData>
  builds: BuildsCacheData | null
  loadoutsLoading: boolean
  buildsLoading: boolean
  ensureFullProfile: (characterId?: string, opts?: FetchOptions) => Promise<PlayerProfile | null>
  ensureSummaryProfile: (opts?: FetchOptions) => Promise<PlayerProfile | null>
  ensureLoadouts: (characterId?: string, opts?: FetchOptions) => Promise<LoadoutsCacheData | null>
  ensureBuilds: (opts?: FetchOptions) => Promise<BuildsCacheData | null>
  setFullProfile: (profile: PlayerProfile | null) => void
  invalidateAll: () => void
}

const ProfileDataContext = createContext<ProfileDataContextValue | null>(null)

export function ProfileDataProvider({ children }: { children: ReactNode }) {
  const bungie = useBungieLink()
  const [fullProfile, setFullProfileState] = useState<PlayerProfile | null>(
    () => readCachedFullProfile()?.profile ?? null
  )
  const [summaryProfile, setSummaryProfileState] = useState<PlayerProfile | null>(
    () => readCachedSummaryProfile()?.profile ?? null
  )
  const [loadoutsByCharacter, setLoadoutsByCharacter] = useState<Record<string, LoadoutsCacheData>>({})
  const [builds, setBuilds] = useState<BuildsCacheData | null>(() => readCachedBuilds()?.data ?? null)
  const [fullLoading, setFullLoading] = useState(false)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [loadoutsLoading, setLoadoutsLoading] = useState(false)
  const [buildsLoading, setBuildsLoading] = useState(false)

  const fullSavedAt = useRef<number>(readCachedFullProfile()?.savedAt ?? 0)
  const summarySavedAt = useRef<number>(readCachedSummaryProfile()?.savedAt ?? 0)
  const buildsSavedAt = useRef<number>(readCachedBuilds()?.savedAt ?? 0)
  const loadoutsSavedAt = useRef<Record<string, number>>({})
  const fullInflight = useRef<Promise<PlayerProfile | null> | null>(null)
  const summaryInflight = useRef<Promise<PlayerProfile | null> | null>(null)
  const loadoutsInflight = useRef<Map<string, Promise<LoadoutsCacheData | null>>>(new Map())
  const buildsInflight = useRef<Promise<BuildsCacheData | null> | null>(null)

  const setFullProfile = useCallback((profile: PlayerProfile | null) => {
    setFullProfileState(profile)
    if (profile) {
      writeCachedFullProfile(profile)
      fullSavedAt.current = Date.now()
      setSummaryProfileState(profile)
      writeCachedSummaryProfile(profile)
      summarySavedAt.current = Date.now()
    }
  }, [])

  const invalidateAll = useCallback(() => {
    setFullProfileState(null)
    setSummaryProfileState(null)
    setLoadoutsByCharacter({})
    setBuilds(null)
    fullSavedAt.current = 0
    summarySavedAt.current = 0
    buildsSavedAt.current = 0
    loadoutsSavedAt.current = {}
    fullInflight.current = null
    summaryInflight.current = null
    loadoutsInflight.current.clear()
    buildsInflight.current = null
    clearProfileCacheStorage()
  }, [])

  useEffect(() => {
    if (!bungie.loading && !bungie.linked) {
      invalidateAll()
    }
  }, [bungie.linked, bungie.loading, invalidateAll])

  const ensureFullProfile = useCallback(
    async (characterId?: string, opts?: FetchOptions): Promise<PlayerProfile | null> => {
      if (!bungie.linked) return null

      const cacheMatches =
        fullProfile &&
        (!characterId ||
          fullProfile.activeCharacterId === characterId ||
          fullProfile.characters?.some((c) => c.characterId === characterId))

      if (!opts?.force && cacheMatches && isCacheFresh(fullSavedAt.current)) {
        return fullProfile
      }

      if (fullInflight.current && !opts?.force) {
        return fullInflight.current
      }

      const showSpinner = !fullProfile
      if (showSpinner) setFullLoading(true)

      const request = (async () => {
        try {
          const qs = new URLSearchParams({ scope: 'full' })
          if (characterId) qs.set('characterId', characterId)
          const res = await fetch(`/api/destiny/profile?${qs.toString()}`, { credentials: 'include' })
          if (!res.ok) return fullProfile
          const json = await res.json()
          const profile = (json?.profile ?? null) as PlayerProfile | null
          if (profile) setFullProfile(profile)
          return profile
        } finally {
          if (showSpinner) setFullLoading(false)
          fullInflight.current = null
        }
      })()

      fullInflight.current = request
      return request
    },
    [bungie.linked, fullProfile, setFullProfile]
  )

  const ensureSummaryProfile = useCallback(
    async (opts?: FetchOptions): Promise<PlayerProfile | null> => {
      if (!bungie.linked) return null

      if (!opts?.force && summaryProfile && isCacheFresh(summarySavedAt.current)) {
        return summaryProfile
      }

      if (fullProfile && isCacheFresh(fullSavedAt.current)) {
        setSummaryProfileState(fullProfile)
        summarySavedAt.current = fullSavedAt.current
        return fullProfile
      }

      if (summaryInflight.current && !opts?.force) {
        return summaryInflight.current
      }

      const showSpinner = !summaryProfile && !fullProfile
      if (showSpinner) setSummaryLoading(true)

      const request = (async () => {
        try {
          const res = await fetch('/api/destiny/profile?scope=summary', { credentials: 'include' })
          if (!res.ok) return summaryProfile ?? fullProfile
          const json = await res.json()
          const profile = (json?.profile ?? null) as PlayerProfile | null
          if (profile) {
            setSummaryProfileState(profile)
            writeCachedSummaryProfile(profile)
            summarySavedAt.current = Date.now()
          }
          return profile
        } finally {
          if (showSpinner) setSummaryLoading(false)
          summaryInflight.current = null
        }
      })()

      summaryInflight.current = request
      return request
    },
    [bungie.linked, fullProfile, summaryProfile]
  )

  const ensureLoadouts = useCallback(
    async (characterId?: string, opts?: FetchOptions): Promise<LoadoutsCacheData | null> => {
      if (!bungie.linked) return null

      const id = characterId ?? fullProfile?.activeCharacterId ?? 'default'
      let cached = loadoutsByCharacter[id]
      let savedAt = loadoutsSavedAt.current[id] ?? 0

      if (!cached) {
        const stored = readCachedLoadouts(id)
        if (stored) {
          cached = stored.data
          savedAt = stored.savedAt
          setLoadoutsByCharacter((prev) => ({ ...prev, [id]: stored.data }))
          loadoutsSavedAt.current[id] = stored.savedAt
        }
      }

      if (!opts?.force && cached && isCacheFresh(savedAt)) {
        return cached
      }

      const inflight = loadoutsInflight.current.get(id)
      if (inflight && !opts?.force) return inflight

      const showSpinner = !cached
      if (showSpinner) setLoadoutsLoading(true)

      const request = (async () => {
        try {
          const qs = id && id !== 'default' ? `?characterId=${encodeURIComponent(id)}` : ''
          const res = await fetch(`/api/destiny/loadouts${qs}`, { credentials: 'include' })
          if (!res.ok) return cached ?? null
          const data = (await res.json()) as LoadoutsCacheData
          setLoadoutsByCharacter((prev) => ({ ...prev, [id]: data }))
          writeCachedLoadouts(id, data)
          loadoutsSavedAt.current[id] = Date.now()
          return data
        } finally {
          if (showSpinner) setLoadoutsLoading(false)
          loadoutsInflight.current.delete(id)
        }
      })()

      loadoutsInflight.current.set(id, request)
      return request
    },
    [bungie.linked, fullProfile?.activeCharacterId, loadoutsByCharacter]
  )

  const ensureBuilds = useCallback(
    async (opts?: FetchOptions): Promise<BuildsCacheData | null> => {
      if (!opts?.force && builds && isCacheFresh(buildsSavedAt.current)) {
        return builds
      }

      if (buildsInflight.current && !opts?.force) {
        return buildsInflight.current
      }

      const showSpinner = !builds
      if (showSpinner) setBuildsLoading(true)

      const request = (async () => {
        try {
          const res = await fetch('/api/destiny/builds', { credentials: 'include' })
          if (!res.ok) return builds
          const json = await res.json()
          const data: BuildsCacheData = {
            verifiedBuilds: json.verifiedBuilds ?? [],
            externalBuilds: json.externalBuilds ?? [],
            metaResearchSummary: json.metaResearchSummary ?? '',
          }
          setBuilds(data)
          writeCachedBuilds(data)
          buildsSavedAt.current = Date.now()
          return data
        } finally {
          if (showSpinner) setBuildsLoading(false)
          buildsInflight.current = null
        }
      })()

      buildsInflight.current = request
      return request
    },
    [builds]
  )

  useEffect(() => {
    const onRefresh = () => {
      void ensureFullProfile(undefined, { force: true })
      void ensureSummaryProfile({ force: true })
      if (fullProfile?.activeCharacterId) {
        void ensureLoadouts(fullProfile.activeCharacterId, { force: true })
      }
      void ensureBuilds({ force: true })
    }
    window.addEventListener(PROFILE_REFRESH_EVENT, onRefresh)
    return () => window.removeEventListener(PROFILE_REFRESH_EVENT, onRefresh)
  }, [ensureBuilds, ensureFullProfile, ensureLoadouts, ensureSummaryProfile, fullProfile?.activeCharacterId])

  const value = useMemo<ProfileDataContextValue>(
    () => ({
      fullProfile,
      summaryProfile,
      fullLoading,
      summaryLoading,
      loadoutsByCharacter,
      builds,
      loadoutsLoading,
      buildsLoading,
      ensureFullProfile,
      ensureSummaryProfile,
      ensureLoadouts,
      ensureBuilds,
      setFullProfile,
      invalidateAll,
    }),
    [
      fullProfile,
      summaryProfile,
      fullLoading,
      summaryLoading,
      loadoutsByCharacter,
      builds,
      loadoutsLoading,
      buildsLoading,
      ensureFullProfile,
      ensureSummaryProfile,
      ensureLoadouts,
      ensureBuilds,
      setFullProfile,
      invalidateAll,
    ]
  )

  return <ProfileDataContext.Provider value={value}>{children}</ProfileDataContext.Provider>
}

export function useProfileData(): ProfileDataContextValue {
  const ctx = useContext(ProfileDataContext)
  if (!ctx) {
    throw new Error('useProfileData must be used within ProfileDataProvider')
  }
  return ctx
}
