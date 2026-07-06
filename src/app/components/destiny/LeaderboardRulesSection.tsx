'use client'

import { useCallback, useEffect, useState } from 'react'
import { GlassCard, LoadingBlock, SectionTitle } from '@/app/components/destiny/DestinyUi'
import { getDestinyTheme } from '@/app/components/destiny/destinyTheme'
import { cn } from '@/lib/utils'

/** Eligibility and scoring rules — sits below the player card on Leaderboards. */
export default function LeaderboardRulesSection({ darkMode }: { darkMode: boolean }) {
  const [eligibility, setEligibility] = useState('')
  const [loading, setLoading] = useState(true)
  const t = getDestinyTheme(darkMode)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/destiny/season', { credentials: 'include' })
      if (res.ok) {
        const json = await res.json()
        setEligibility(json.eligibility ?? '')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) {
    return <LoadingBlock darkMode={darkMode} label="Loading rules…" />
  }

  return (
    <GlassCard darkMode={darkMode} padding="compact">
      <SectionTitle title="Eligibility & rules" darkMode={darkMode} compact />
      {eligibility ? <p className={cn('text-sm mt-2', t.muted)}>{eligibility}</p> : null}
      <ul className={cn('text-xs mt-3 space-y-1 list-disc list-inside', t.muted)}>
        <li>Points only for verified full completions</li>
        <li>2 pts per clan member · 5 pts per rando (raid max 2 randos, dungeon max 1)</li>
        <li>Pantheon squads: each boss encounter counts as one raid worth of points for the fireteam</li>
        <li>MVP votes: +1 pt for voting, +3 pts for the Guardian you pick (Top Guardians board)</li>
        <li>Checkpoint runs tracked but not scored unless admin approved</li>
        <li>Suspicious runs blocked until review (score 70+)</li>
      </ul>
    </GlassCard>
  )
}
