'use client'

import { useCallback, useEffect, useState } from 'react'
import { fetchManifestIconUrl } from '@/lib/destiny/clientManifestIcon'
import type { DestinyIconRef } from '@/lib/destiny/types'

/** Proactively resolve missing icon URLs (static catalog + manifest API). */
export function useResolvedIconUrl(
  item?: DestinyIconRef,
  name?: string,
  initialUrl?: string
): { displayUrl?: string; failed: boolean; onImageError: () => void } {
  const url = item?.iconUrl ?? initialUrl
  const label = item?.name ?? name
  const [resolvedUrl, setResolvedUrl] = useState<string | undefined>()
  const [failed, setFailed] = useState(false)
  const displayUrl = resolvedUrl ?? url

  useEffect(() => {
    if (displayUrl || failed || !label) return
    let cancelled = false
    void fetchManifestIconUrl(item, name).then((manifestUrl) => {
      if (!cancelled && manifestUrl) setResolvedUrl(manifestUrl)
    })
    return () => {
      cancelled = true
    }
  }, [displayUrl, failed, item, name, label])

  const onImageError = useCallback(() => {
    if (resolvedUrl || failed) {
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
