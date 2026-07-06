'use client'

import { useCallback, useEffect, useState } from 'react'
import { Trophy, X } from 'lucide-react'
import type { SyncResultDetail } from '@/lib/destiny/syncEvents'
import { SYNC_RESULT_EVENT } from '@/lib/destiny/syncEvents'
import { getDestinyTheme } from '@/app/components/destiny/destinyTheme'
import { cn } from '@/lib/utils'

interface ToastItem {
  id: string
  title: string
  body: string
  tone: 'success' | 'review' | 'neutral'
}

function toastFromSync(detail: SyncResultDetail): ToastItem | null {
  if (!detail.imported || !detail.newRuns.length) return null

  const totalPoints = detail.newRuns.reduce((sum, run) => sum + (run.pointsAwarded ?? 0), 0)
  const scored = detail.newRuns.filter((run) => (run.pointsAwarded ?? 0) > 0)
  const flagged = detail.newRuns.filter((run) => run.verificationStatus === 'flagged')

  if (scored.length === 1) {
    const run = scored[0]!
    return {
      id: `${Date.now()}-${run.activityName}`,
      title: 'New run detected!',
      body: `${run.activityName} · +${run.pointsAwarded} pts`,
      tone: 'success',
    }
  }

  if (scored.length > 1) {
    return {
      id: `${Date.now()}-multi`,
      title: 'New runs detected!',
      body: `${scored.length} clears · +${totalPoints} pts total`,
      tone: 'success',
    }
  }

  if (flagged.length > 0) {
    const run = flagged[0]!
    return {
      id: `${Date.now()}-flagged`,
      title: 'Run logged',
      body:
        flagged.length === 1
          ? `${run.activityName} — flagged for review`
          : `${flagged.length} runs logged — under review`,
      tone: 'review',
    }
  }

  const run = detail.newRuns[0]!
  return {
    id: `${Date.now()}-pending`,
    title: 'New run detected!',
    body:
      detail.newRuns.length === 1
        ? `${run.activityName} — pending verification`
        : `${detail.newRuns.length} new runs — pending verification`,
    tone: 'neutral',
  }
}

export default function RunSyncToast({ darkMode }: { darkMode: boolean }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const t = getDestinyTheme(darkMode)

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  useEffect(() => {
    const onSyncResult = (event: Event) => {
      const detail = (event as CustomEvent<SyncResultDetail>).detail
      if (!detail) return
      const toast = toastFromSync(detail)
      if (!toast) return
      setToasts((current) => [...current.slice(-2), toast])
    }

    window.addEventListener(SYNC_RESULT_EVENT, onSyncResult)
    return () => window.removeEventListener(SYNC_RESULT_EVENT, onSyncResult)
  }, [])

  useEffect(() => {
    if (!toasts.length) return
    const timers = toasts.map((toast) =>
      window.setTimeout(() => dismiss(toast.id), 7000)
    )
    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [toasts, dismiss])

  if (!toasts.length) return null

  return (
    <div className="tn-sync-toast-stack" aria-live="polite">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'tn-sync-toast',
            toast.tone === 'success' && 'tn-sync-toast-success',
            toast.tone === 'review' && 'tn-sync-toast-review'
          )}
        >
          <div className="tn-sync-toast-icon" aria-hidden>
            <Trophy className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className={cn('tn-sync-toast-title', t.heading)}>{toast.title}</p>
            <p className={cn('tn-sync-toast-body', t.muted)}>{toast.body}</p>
          </div>
          <button
            type="button"
            className="tn-sync-toast-dismiss"
            aria-label="Dismiss"
            onClick={() => dismiss(toast.id)}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}
