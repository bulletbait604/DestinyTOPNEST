'use client'

import { useEffect, useState } from 'react'
import type { PublicHubSnapshot } from '@/lib/destiny/publicHub'
import type { DestinyTopNestTab } from '@/lib/destiny/types'
import { navigateDestinyTab } from '@/lib/routing/tabUrl'

function asArray<T>(value: T[] | undefined | null): T[] {
  return Array.isArray(value) ? value : []
}

/** Drop a hub payload that is missing the lists the page maps over. */
export function normalizePublicHub(value: unknown): PublicHubSnapshot | null {
  if (!value || typeof value !== 'object') return null
  const data = value as Partial<PublicHubSnapshot>
  if (!Array.isArray(data.contracts) || !Array.isArray(data.scoring)) return null
  return {
    weekLabel: typeof data.weekLabel === 'string' ? data.weekLabel : '',
    resetsInLabel: typeof data.resetsInLabel === 'string' ? data.resetsInLabel : '',
    featuredDungeons: asArray(data.featuredDungeons),
    featuredRaids: asArray(data.featuredRaids),
    pantheon: typeof data.pantheon === 'string' ? data.pantheon : undefined,
    nightfall: typeof data.nightfall === 'string' ? data.nightfall : undefined,
    contracts: data.contracts,
    sherpas: asArray(data.sherpas),
    clans: asArray(data.clans),
    events: asArray(data.events),
    fireteams: asArray(data.fireteams),
    scoring: data.scoring,
    historyComplete: data.historyComplete !== false,
    topGuardians: asArray(data.topGuardians),
    featuredBuilds: asArray(data.featuredBuilds),
  }
}

export function usePublicHub() {
  const [snapshot, setSnapshot] = useState<PublicHubSnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/destiny/hub', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Hub unavailable')
        return normalizePublicHub(await response.json())
      })
      .then((data) => {
        if (cancelled) return
        if (!data) {
          setError('The public boards came back empty. Refresh to try again.')
          return
        }
        setSnapshot(data)
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
