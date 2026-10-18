'use client'

import BoardsHub from '@/app/components/hub/BoardsHub'
import SeasonSection from '@/app/components/destiny/SeasonSection'

/** Signed-in boards: the public hub plus the season prize track. */
export default function LeaderboardsPanel({ darkMode }: { darkMode: boolean }) {
  return (
    <div className="space-y-6">
      <BoardsHub />
      <SeasonSection darkMode={darkMode} />
    </div>
  )
}
