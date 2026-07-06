'use client'

import { GlassCard, SectionTitle } from '@/app/components/destiny/DestinyUi'
import { getDestinyTheme } from '@/app/components/destiny/destinyTheme'
import {
  LEADERBOARD_RULES_APPEALS_EMAIL,
  LEADERBOARD_RULES_BULLETS,
  LEADERBOARD_RULES_POLICY,
  LEADERBOARD_RULES_SUMMARY,
} from '@/lib/destiny/leaderboardRules'
import { cn } from '@/lib/utils'

/** Eligibility and scoring rules — sits below the player card on Leaderboards. */
export default function LeaderboardRulesSection({ darkMode }: { darkMode: boolean }) {
  const t = getDestinyTheme(darkMode)

  return (
    <GlassCard darkMode={darkMode} padding="compact">
      <SectionTitle title="Eligibility & rules" darkMode={darkMode} compact />
      <p className={cn('text-sm mt-2', t.muted)}>{LEADERBOARD_RULES_SUMMARY()}</p>
      <ul className={cn('text-xs mt-3 space-y-1 list-disc list-inside', t.muted)}>
        {LEADERBOARD_RULES_BULLETS.slice(0, 2).map((rule) => (
          <li key={rule}>{rule}</li>
        ))}
        <li>
          {LEADERBOARD_RULES_POLICY}{' '}
          <a
            href={`mailto:${LEADERBOARD_RULES_APPEALS_EMAIL}`}
            className="underline text-amber-300/90 hover:text-amber-200"
          >
            {LEADERBOARD_RULES_APPEALS_EMAIL}
          </a>
          .
        </li>
        {LEADERBOARD_RULES_BULLETS.slice(2).map((rule) => (
          <li key={rule}>{rule}</li>
        ))}
      </ul>
    </GlassCard>
  )
}
