'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { defaultBungieReturnPath, stripUrlParams } from '@/lib/routing/tabUrl'
import { bungieOAuthErrorMessage } from '@/lib/destiny/bungieOAuthMessages'
import {
  dispatchSyncSuccess,
  readLastSyncedAt,
  SYNC_RECENT_MS,
  SYNC_AT_STORAGE_KEY,
  SYNC_UPDATED_EVENT,
  type SyncResultDetail,
  type SyncedRunSummary,
} from '@/lib/destiny/syncEvents'

export { SYNC_RECENT_MS } from '@/lib/destiny/syncEvents'

export interface BungieLinkStatus {
  configured: boolean
  linked: boolean
  tokenHealthy?: boolean
  needsReconnect?: boolean
  bungieDisplayName?: string
  connectedAt?: string
  redirectUri?: string
  emblemUrl?: string
  powerLevel?: number
}

export interface SyncRunsResult {
  synced?: number
  imported?: number
  flagged?: number
  builds?: number
  newRuns?: SyncedRunSummary[]
  error?: string
}

export interface BungieLinkValue {
  status: BungieLinkStatus | null
  loading: boolean
  linked: boolean
  configured: boolean
  connectHref: string
  connect: () => void
  disconnect: () => Promise<void>
  disconnecting: boolean
  syncRuns: (opts?: { silent?: boolean }) => Promise<SyncRunsResult>
  syncing: boolean
  lastSyncedAt: number | null
  isRecentlySynced: boolean
  linkMessage: string | null
  setLinkMessage: (message: string | null) => void
  copyRedirectUri: () => Promise<void>
  reload: () => Promise<void>
}

const BungieLinkContext = createContext<BungieLinkValue | null>(null)

function useBungieLinkState(): BungieLinkValue {
  const [status, setStatus] = useState<BungieLinkStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [disconnecting, setDisconnecting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [linkMessage, setLinkMessage] = useState<string | null>(null)
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(() => readLastSyncedAt())
  const [connectHref, setConnectHref] = useState(
    `/api/destiny/auth/bungie/start?return=${encodeURIComponent(defaultBungieReturnPath())}`
  )

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/destiny/auth/bungie/status', { credentials: 'include' })
      if (res.ok) setStatus(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const current = window.location.pathname + window.location.search
    setConnectHref(`/api/destiny/auth/bungie/start?return=${encodeURIComponent(current)}`)

    const params = new URLSearchParams(window.location.search)
    const bungie = params.get('bungie')
    if (bungie === 'linked') {
      const text = 'Signed in with Bungie.'
      setLinkMessage(text)
      sessionStorage.removeItem('bungieLinkMessage')
      void load()
    } else if (bungie === 'error') {
      const msg = params.get('message') || ''
      const text = msg
        ? `Bungie sign-in failed: ${bungieOAuthErrorMessage(msg)}`
        : 'Bungie sign-in failed. Try again.'
      setLinkMessage(text)
      sessionStorage.setItem('bungieLinkMessage', text)
    } else {
      const saved = sessionStorage.getItem('bungieLinkMessage')
      if (saved) setLinkMessage(saved)
    }
    if (bungie) stripUrlParams(['bungie', 'message'])
  }, [load])

  useEffect(() => {
    const onSyncUpdated = () => setLastSyncedAt(readLastSyncedAt())
    window.addEventListener(SYNC_UPDATED_EVENT, onSyncUpdated)
    return () => window.removeEventListener(SYNC_UPDATED_EVENT, onSyncUpdated)
  }, [])

  useEffect(() => {
    if (status?.needsReconnect && !linkMessage) {
      setLinkMessage('Bungie session expired — reconnect once to restore live data.')
    }
  }, [status?.needsReconnect, linkMessage])

  const connect = useCallback(() => {
    window.location.href = connectHref
  }, [connectHref])

  const disconnect = useCallback(async () => {
    setDisconnecting(true)
    try {
      await fetch('/api/destiny/auth/bungie/disconnect', {
        method: 'POST',
        credentials: 'include',
      })
      sessionStorage.removeItem(SYNC_AT_STORAGE_KEY)
      setLastSyncedAt(null)
      await load()
      setLinkMessage('Bungie unlinked. Sign in with Bungie again when you want to sync runs.')
    } finally {
      setDisconnecting(false)
    }
  }, [load])

  const syncRuns = useCallback(async (opts?: { silent?: boolean }): Promise<SyncRunsResult> => {
    setSyncing(true)
    try {
      const res = await fetch('/api/destiny/runs/sync', {
        method: 'POST',
        credentials: 'include',
      })
      const json = (await res.json().catch(() => ({}))) as {
        synced?: number
        imported?: number
        flagged?: number
        builds?: number
        newRuns?: SyncedRunSummary[]
        error?: string
        message?: string
      }
      if (!res.ok) {
        const text = json.error || json.message || 'Sync failed'
        if (!opts?.silent) setLinkMessage(text)
        return { error: text }
      }

      const detail: SyncResultDetail = {
        synced: json.synced ?? 0,
        imported: json.imported ?? 0,
        flagged: json.flagged ?? 0,
        builds: json.builds ?? 0,
        newRuns: json.newRuns ?? [],
      }
      dispatchSyncSuccess(detail)
      setLastSyncedAt(readLastSyncedAt())

      if (!opts?.silent) {
        const text = `Synced ${detail.synced} run(s)${detail.builds ? ` · ${detail.builds} build(s)` : ''}${detail.imported ? ` · ${detail.imported} new` : ''}${detail.flagged ? ` · ${detail.flagged} flagged for review` : ''}.`
        setLinkMessage(text)
      }

      return {
        synced: detail.synced,
        imported: detail.imported,
        flagged: detail.flagged,
        builds: detail.builds,
        newRuns: detail.newRuns,
      }
    } finally {
      setSyncing(false)
    }
  }, [])

  const copyRedirectUri = useCallback(async () => {
    if (!status?.redirectUri) return
    try {
      await navigator.clipboard.writeText(status.redirectUri)
      setLinkMessage('Redirect URL copied. Paste it into your Bungie app OAuth settings.')
    } catch {
      setLinkMessage(`Copy this into Bungie: ${status.redirectUri}`)
    }
  }, [status?.redirectUri])

  const isRecentlySynced = lastSyncedAt != null && Date.now() - lastSyncedAt < SYNC_RECENT_MS

  return useMemo(
    () => ({
      status,
      loading,
      linked: status?.linked ?? false,
      configured: status?.configured ?? false,
      connectHref,
      connect,
      disconnect,
      disconnecting,
      syncRuns,
      syncing,
      lastSyncedAt,
      isRecentlySynced,
      linkMessage,
      setLinkMessage,
      copyRedirectUri,
      reload: load,
    }),
    [
      status,
      loading,
      connectHref,
      connect,
      disconnect,
      disconnecting,
      syncRuns,
      syncing,
      lastSyncedAt,
      isRecentlySynced,
      linkMessage,
      copyRedirectUri,
      load,
    ]
  )
}

/** Single shared Bungie link state for the whole app (one status fetch). */
export function BungieLinkProvider({ children }: { children: ReactNode }) {
  const value = useBungieLinkState()
  return <BungieLinkContext.Provider value={value}>{children}</BungieLinkContext.Provider>
}

export function useBungieLink(): BungieLinkValue {
  const ctx = useContext(BungieLinkContext)
  if (!ctx) {
    throw new Error('useBungieLink must be used within BungieLinkProvider')
  }
  return ctx
}

export type BungieLink = BungieLinkValue
