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
import { profileViewForCharacter } from '@/lib/destiny/activeCharacter'
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
  switchingCharacter: boolean
  selectActiveCharacter: (characterId: string) => Promise<void>
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
  const [switchingCharacter, setSwitchingCharacter] = useState(false)

  const fullProfileRef = useRef(fullProfile)
  const summaryProfileRef = useRef(summaryProfile)
  fullProfileRef.current = fullProfile
  summaryProfileRef.current = summaryProfile

  const fullSavedAt = useRef<number>(readCachedFullProfile()?.savedAt ?? 0)
  const summarySavedAt = useRef<number>(readCachedSummaryProfile()?.savedAt ?? 0)
  const buildsSavedAt = useRef<number>(readCachedBuilds()?.savedAt ?? 0)
  const loadoutsSavedAt = useRef<Record<string, number>>({})
  const fullInflight = useRef<Promise<PlayerProfile | null> | null>(null)
  const summaryInflight = useRef<Promise<PlayerProfile | null> | null>(null)
  const loadoutsInflight = useRef<Map<string, Promise<LoadoutsCacheData | null>>>(new Map())
  const buildsInflight = useRef<Promise<BuildsCacheData | null> | null>(null)
  const characterSwitchSeq = useRef(0)
  const characterSwitchInflight = useRef(false)

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
    characterSwitchSeq.current += 1
    characterSwitchInflight.current = false
    setSwitchingCharacter(false)
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

      const profile = fullProfileRef.current

      if (characterSwitchInflight.current && !opts?.force) {
        return profile
      }

      const cacheMatches =
        profile &&
        (!characterId ||
          profile.activeCharacterId === characterId ||
          profile.characters?.some((c) => c.characterId === characterId))

      if (!opts?.force && cacheMatches && isCacheFresh(fullSavedAt.current)) {
        return profile
      }

      if (fullInflight.current && !opts?.force) {
        return fullInflight.current
      }

      const showSpinner = !profile
      if (showSpinner) setFullLoading(true)

      const request = (async () => {
        try {
          const qs = new URLSearchParams({ scope: 'full' })
          if (characterId) qs.set('characterId', characterId)
          const res = await fetch(`/api/destiny/profile?${qs.toString()}`, { credentials: 'include' })
          if (!res.ok) return fullProfileRef.current
          const json = await res.json()
          const next = (json?.profile ?? null) as PlayerProfile | null
          if (next) setFullProfile(next)
          return next
        } finally {
          if (showSpinner) setFullLoading(false)
          fullInflight.current = null
        }
      })()

      fullInflight.current = request
      return request
    },
    [bungie.linked, setFullProfile]
  )

  const ensureSummaryProfile = useCallback(
    async (opts?: FetchOptions): Promise<PlayerProfile | null> => {
      if (!bungie.linked) return null

      const summary = summaryProfileRef.current
      const full = fullProfileRef.current

      if (characterSwitchInflight.current && !opts?.force) {
        return summary ?? full
      }

      if (!opts?.force && summary && isCacheFresh(summarySavedAt.current)) {
        return summary
      }

      if (full && isCacheFresh(fullSavedAt.current)) {
        if (summary !== full) {
          setSummaryProfileState(full)
        }
        summarySavedAt.current = fullSavedAt.current
        return full
      }

      if (summaryInflight.current && !opts?.force) {
        return summaryInflight.current
      }

      const showSpinner = !summary && !full
      if (showSpinner) setSummaryLoading(true)

      const request = (async () => {
        try {
          const res = await fetch('/api/destiny/profile?scope=summary', { credentials: 'include' })
          if (!res.ok) return summaryProfileRef.current ?? fullProfileRef.current
          const json = await res.json()
          const next = (json?.profile ?? null) as PlayerProfile | null
          if (next) {
            setSummaryProfileState(next)
            writeCachedSummaryProfile(next)
            summarySavedAt.current = Date.now()
          }
          return next
        } finally {
          if (showSpinner) setSummaryLoading(false)
          summaryInflight.current = null
        }
      })()

      summaryInflight.current = request
      return request
    },
    [bungie.linked]
  )

  const ensureLoadouts = useCallback(
    async (characterId?: string, opts?: FetchOptions): Promise<LoadoutsCacheData | null> => {
      if (!bungie.linked) return null

      const id = characterId ?? fullProfileRef.current?.activeCharacterId ?? 'default'
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
    [bungie.linked, loadoutsByCharacter]
  )

  const ensureFullProfileRef = useRef(ensureFullProfile)
  ensureFullProfileRef.current = ensureFullProfile

  const selectActiveCharacter = useCallback(
    async (characterId: string) => {
      const current = fullProfileRef.current
      if (!current || characterId === current.activeCharacterId || characterSwitchInflight.current) {
        return
      }

      const seq = ++characterSwitchSeq.current
      characterSwitchInflight.current = true
      setSwitchingCharacter(true)

      const optimistic = {
        ...profileViewForCharacter(current, characterId),
        currentLoadout: undefined,
      }
      setFullProfileState(optimistic)
      setSummaryProfileState(optimistic)

      try {
        const res = await fetch('/api/destiny/profile', {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ activeCharacterId: characterId }),
        })

        if (seq !== characterSwitchSeq.current) return

        if (res.ok) {
          const json = await res.json()
          setFullProfile((json?.profile ?? null) as PlayerProfile | null)
        } else {
          await ensureFullProfileRef.current(characterId, { force: true })
        }
      } finally {
        if (seq === characterSwitchSeq.current) {
          characterSwitchInflight.current = false
          setSwitchingCharacter(false)
        }
      }
    },
    [setFullProfile]
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

  const ensureBuildsRef = useRef(ensureBuilds)
  const ensureLoadoutsRef = useRef(ensureLoadouts)
  const ensureSummaryProfileRef = useRef(ensureSummaryProfile)
  ensureBuildsRef.current = ensureBuilds
  ensureLoadoutsRef.current = ensureLoadouts
  ensureSummaryProfileRef.current = ensureSummaryProfile

  useEffect(() => {
    const onRefresh = () => {
      void ensureFullProfileRef.current(undefined, { force: true })
      void ensureSummaryProfileRef.current({ force: true })
      const activeId = fullProfileRef.current?.activeCharacterId
      if (activeId) {
        void ensureLoadoutsRef.current(activeId, { force: true })
      }
      void ensureBuildsRef.current({ force: true })
    }
    window.addEventListener(PROFILE_REFRESH_EVENT, onRefresh)
    return () => window.removeEventListener(PROFILE_REFRESH_EVENT, onRefresh)
  }, [])

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
      switchingCharacter,
      selectActiveCharacter,
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
      switchingCharacter,
      selectActiveCharacter,
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
