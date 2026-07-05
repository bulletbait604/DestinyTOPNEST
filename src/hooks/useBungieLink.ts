'use client'

import { useCallback, useEffect, useState } from 'react'
import { defaultBungieReturnPath, stripUrlParams } from '@/lib/routing/tabUrl'
import { bungieOAuthErrorMessage } from '@/lib/destiny/bungieOAuthMessages'

export const SYNC_AT_STORAGE_KEY = 'topnestLastSyncAt'
export const SYNC_UPDATED_EVENT = 'topnest-sync-updated'
export const SYNC_RECENT_MS = 5 * 60 * 1000

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

function readLastSyncedAt(): number | null {
  if (typeof window === 'undefined') return null
  const raw = sessionStorage.getItem(SYNC_AT_STORAGE_KEY)
  if (!raw) return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

function writeLastSyncedAt(at: number) {
  sessionStorage.setItem(SYNC_AT_STORAGE_KEY, String(at))
  window.dispatchEvent(new Event(SYNC_UPDATED_EVENT))
  window.dispatchEvent(new Event('topnest-profile-refresh'))
}

export function useBungieLink(options?: { returnPath?: string }) {
  const [status, setStatus] = useState<BungieLinkStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [disconnecting, setDisconnecting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [linkMessage, setLinkMessage] = useState<string | null>(null)
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(() => readLastSyncedAt())
  const [connectHref, setConnectHref] = useState(
    `/api/destiny/auth/bungie/start?return=${encodeURIComponent(options?.returnPath ?? defaultBungieReturnPath())}`
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
      window.location.replace('/')
    } finally {
      setDisconnecting(false)
    }
  }, [load])

  const syncRuns = useCallback(
    async (opts?: { silent?: boolean }): Promise<{ synced?: number; flagged?: number; error?: string }> => {
      setSyncing(true)
      try {
        const res = await fetch('/api/destiny/runs/sync', {
          method: 'POST',
          credentials: 'include',
        })
        const json = (await res.json().catch(() => ({}))) as {
          synced?: number
          flagged?: number
          builds?: number
          error?: string
          message?: string
        }
        if (!res.ok) {
          const text = json.error || json.message || 'Sync failed'
          if (!opts?.silent) setLinkMessage(text)
          return { error: text }
        }
        writeLastSyncedAt(Date.now())
        setLastSyncedAt(Date.now())
        if (!opts?.silent) {
          const text = `Synced ${json.synced ?? 0} run(s)${json.builds ? ` · ${json.builds} build(s)` : ''}${json.flagged ? ` · ${json.flagged} flagged for review` : ''}.`
          setLinkMessage(text)
        }
        return { synced: json.synced, flagged: json.flagged }
      } finally {
        setSyncing(false)
      }
    },
    []
  )

  const copyRedirectUri = useCallback(async () => {
    if (!status?.redirectUri) return
    try {
      await navigator.clipboard.writeText(status.redirectUri)
      setLinkMessage('Redirect URL copied. Paste it into your Bungie app OAuth settings.')
    } catch {
      setLinkMessage(`Copy this into Bungie: ${status.redirectUri}`)
    }
  }, [status?.redirectUri])

  const isRecentlySynced =
    lastSyncedAt != null && Date.now() - lastSyncedAt < SYNC_RECENT_MS

  return {
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
  }
}
