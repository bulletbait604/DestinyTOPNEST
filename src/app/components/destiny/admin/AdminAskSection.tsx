'use client'

import { useEffect, useState } from 'react'
import { GlassCard, SectionTitle } from '@/app/components/destiny/DestinyUi'
import { getDestinyTheme } from '@/app/components/destiny/destinyTheme'
import { cn } from '@/lib/utils'

type FeedbackRow = { question: string; vote: string; createdAt: string; answerId: string }

export default function AdminAskSection({ darkMode }: { darkMode: boolean }) {
  const t = getDestinyTheme(darkMode)
  const [rows, setRows] = useState<FeedbackRow[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void fetch('/api/destiny/admin/ask-feedback', { credentials: 'include' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Could not load Ask feedback.')
        return response.json() as Promise<{ feedback?: FeedbackRow[] }>
      })
      .then((json) => setRows(json.feedback ?? []))
      .catch((err: Error) => setError(err.message))
  }, [])

  return (
    <GlassCard darkMode={darkMode}>
      <SectionTitle title="Ask feedback" subtitle="Thumbs up and down from Ask TopNest." darkMode={darkMode} />
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      {rows.length === 0 && !error ? <p className={cn('text-sm', t.muted)}>No ratings yet.</p> : null}
      <ul className="gh-list">
        {rows.map((row) => (
          <li key={`${row.createdAt}-${row.answerId}`}>
            <span>
              {row.vote === 'up' ? 'Helpful' : 'Not helpful'} · {row.question}
            </span>
            <span className="gh-muted">{row.createdAt.slice(0, 10)}</span>
          </li>
        ))}
      </ul>
    </GlassCard>
  )
}
