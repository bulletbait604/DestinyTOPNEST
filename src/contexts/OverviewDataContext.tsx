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
import type { OverviewPayload } from '@/lib/destiny/types'
import { OVERVIEW_CACHE_TTL_MS, OVERVIEW_REFRESH_EVENT } from '@/lib/destiny/syncEvents'

interface FetchOptions {
  silent?: boolean
  force?: boolean
}

interface OverviewDataContextValue {
  data: OverviewPayload | null
  loading: boolean
  error: string | null
  reload: (opts?: FetchOptions) => Promise<void>
}

const OverviewDataContext = createContext<OverviewDataContextValue | null>(null)

/** One overview fetch shared by home hero widgets and the overview tab. */
export function OverviewDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<OverviewPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const savedAt = useRef(0)
  const hasData = useRef(false)
  const inflight = useRef<Promise<void> | null>(null)

  const load = useCallback(async (opts?: FetchOptions) => {
    const now = Date.now()
    if (!opts?.force && hasData.current && now - savedAt.current < OVERVIEW_CACHE_TTL_MS) {
      return
    }

    if (inflight.current && !opts?.force) {
      return inflight.current
    }

    if (!opts?.silent) {
      setError(null)
      if (!hasData.current) setLoading(true)
    }

    const request = (async () => {
      try {
        const res = await fetch('/api/destiny/overview', { credentials: 'include' })
        if (!res.ok) throw new Error('Failed to load overview')
        const json = (await res.json()) as OverviewPayload
        setData(json)
        savedAt.current = Date.now()
        hasData.current = true
        if (!opts?.silent) setError(null)
      } catch (e) {
        if (!opts?.silent) {
          setError(e instanceof Error ? e.message : 'Load failed')
        }
      } finally {
        if (!opts?.silent) setLoading(false)
        inflight.current = null
      }
    })()

    inflight.current = request
    return request
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const onRefresh = () => void load({ silent: true, force: true })
    window.addEventListener(OVERVIEW_REFRESH_EVENT, onRefresh)
    return () => window.removeEventListener(OVERVIEW_REFRESH_EVENT, onRefresh)
  }, [load])

  const value = useMemo(
    () => ({ data, loading, error, reload: load }),
    [data, loading, error, load]
  )

  return <OverviewDataContext.Provider value={value}>{children}</OverviewDataContext.Provider>
}

export function useOverviewData(): OverviewDataContextValue {
  const ctx = useContext(OverviewDataContext)
  if (!ctx) {
    throw new Error('useOverviewData must be used within OverviewDataProvider')
  }
  return ctx
}
