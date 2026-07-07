'use client'

import { useCallback, useEffect, useState } from 'react'
import { fetchManifestIconUrl } from '@/lib/destiny/clientManifestIcon'
import { isUsableIconUrl } from '@/lib/destiny/iconUtils'
import type { DestinyIconRef } from '@/lib/destiny/types'

function initialUrl(item?: DestinyIconRef, name?: string, iconUrl?: string): string | undefined {
  const url = item?.iconUrl ?? iconUrl
  return url && isUsableIconUrl(url) ? url : undefined
}

/** Proactively resolve missing or generic icon URLs (static catalog + manifest API). */
export function useResolvedIconUrl(
  item?: DestinyIconRef,
  name?: string,
  iconUrl?: string
): { displayUrl?: string; failed: boolean; onImageError: () => void } {
  const label = item?.name ?? name
  const [resolvedUrl, setResolvedUrl] = useState<string | undefined>()
  const [failed, setFailed] = useState(false)
  const seedUrl = initialUrl(item, name, iconUrl)
  const displayUrl = resolvedUrl ?? seedUrl

  useEffect(() => {
    if (displayUrl || failed || (!label && !item?.hash)) return
    let cancelled = false
    void fetchManifestIconUrl(item, name).then((manifestUrl) => {
      if (!cancelled && manifestUrl) setResolvedUrl(manifestUrl)
    })
    return () => {
      cancelled = true
    }
  }, [displayUrl, failed, item, name, label])

  const onImageError = useCallback(() => {
    if (failed) return
    if (resolvedUrl) {
      setFailed(true)
      return
    }
    void fetchManifestIconUrl(item, name).then((manifestUrl) => {
      if (manifestUrl) setResolvedUrl(manifestUrl)
      else setFailed(true)
    })
  }, [failed, item, name, resolvedUrl])

  return {
    displayUrl: displayUrl && !failed ? displayUrl : undefined,
    failed,
    onImageError,
  }
}
