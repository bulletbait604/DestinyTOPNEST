'use client'

import { useEffect, useState } from 'react'
import type { PublicHubSnapshot } from '@/lib/destiny/publicHub'
import type { DestinyTopNestTab } from '@/lib/destiny/types'
import { navigateDestinyTab } from '@/lib/routing/tabUrl'

export function usePublicHub() {
  const [snapshot, setSnapshot] = useState<PublicHubSnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/destiny/hub', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Hub unavailable')
        return (await response.json()) as PublicHubSnapshot
      })
      .then((data) => {
        if (!cancelled) setSnapshot(data)
      })
      .catch(() => {
        if (!cancelled) {
          setError('The public boards could not load. You can still sign in and use your Guardian.')
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { snapshot, error, loading: !snapshot && !error }
}

export function openHubTab(tab: DestinyTopNestTab) {
  navigateDestinyTab(tab)
}

export function formatEventWhen(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(date)
}
