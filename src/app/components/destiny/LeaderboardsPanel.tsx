'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { LeaderboardCategory, LeaderboardEntry, LeaderboardPeriod } from '@/lib/destiny/types'
import LeaderboardGridCard from '@/app/components/destiny/LeaderboardGridCard'
import SeasonSection from '@/app/components/destiny/SeasonSection'
import { OVERVIEW_REFRESH_EVENT } from '@/lib/destiny/syncEvents'

const PERIOD_OPTIONS: LeaderboardPeriod[] = ['weekly', 'monthly', 'season', 'all_time']

const BOARDS: {
  category: LeaderboardCategory
  title: string
  defaultPeriod: LeaderboardPeriod
  footnote?: string
}[] = [
  { category: 'raid', title: 'Raids', defaultPeriod: 'season' },
  { category: 'dungeon', title: 'Dungeons', defaultPeriod: 'season' },
  {
    category: 'pantheon',
    title: 'The Pantheon',
    defaultPeriod: 'season',
    footnote: 'Squads ranked by fireteam — each verified boss encounter scores like a raid clear.',
  },
  {
    category: 'top_guardians',
    title: 'Commanders / Sherpas',
    defaultPeriod: 'monthly',
    footnote: 'Top Guardians crowned from MVP votes received each month.',
  },
]

function periodsForCategory(category: LeaderboardCategory): LeaderboardPeriod[] {
  if (category === 'top_guardians') {
    return PERIOD_OPTIONS.filter((p) => p !== 'weekly')
  }
  return PERIOD_OPTIONS
}

type BoardState = {
  entries: LeaderboardEntry[]
  loading: boolean
  period: LeaderboardPeriod
}

function initialBoardState(): Record<LeaderboardCategory, BoardState> {
  return {
    raid: { entries: [], loading: true, period: 'season' },
    dungeon: { entries: [], loading: true, period: 'season' },
    pantheon: { entries: [], loading: true, period: 'season' },
    top_guardians: { entries: [], loading: true, period: 'monthly' },
  }
}

export default function LeaderboardsPanel({ darkMode }: { darkMode: boolean }) {
  const [boards, setBoards] = useState<Record<LeaderboardCategory, BoardState>>(initialBoardState)
  const boardsRef = useRef(boards)
  boardsRef.current = boards

  const fetchBoard = useCallback(async (category: LeaderboardCategory, period: LeaderboardPeriod) => {
    setBoards((prev) => ({
      ...prev,
      [category]: { ...prev[category], loading: true },
    }))

    try {
      const params = new URLSearchParams({ period, category })
      const res = await fetch(`/api/destiny/leaderboards?${params}`, { credentials: 'include' })
      const json = res.ok ? await res.json() : { entries: [] }
      setBoards((prev) => ({
        ...prev,
        [category]: {
          ...prev[category],
          period,
          entries: json.entries ?? [],
          loading: false,
        },
      }))
    } catch {
      setBoards((prev) => ({
        ...prev,
        [category]: { ...prev[category], period, entries: [], loading: false },
      }))
    }
  }, [])

  useEffect(() => {
    void Promise.all(BOARDS.map((board) => fetchBoard(board.category, board.defaultPeriod)))
  }, [fetchBoard])

  useEffect(() => {
    const onRefresh = () => {
      void Promise.all(
        BOARDS.map((board) => {
          const period = boardsRef.current[board.category]?.period ?? board.defaultPeriod
          return fetchBoard(board.category, period)
        })
      )
    }
    window.addEventListener(OVERVIEW_REFRESH_EVENT, onRefresh)
    return () => window.removeEventListener(OVERVIEW_REFRESH_EVENT, onRefresh)
  }, [fetchBoard])

  const handlePeriodChange = useCallback(
    (category: LeaderboardCategory, period: LeaderboardPeriod) => {
      void fetchBoard(category, period)
    },
    [fetchBoard]
  )

  return (
    <div className="space-y-6">
      <div className="tn-lb-wire-grid">
        {BOARDS.map((board) => {
          const state = boards[board.category]
          return (
            <LeaderboardGridCard
              key={board.category}
              title={board.title}
              category={board.category}
              period={state.period}
              periodOptions={periodsForCategory(board.category)}
              onPeriodChange={(period) => handlePeriodChange(board.category, period)}
              entries={state.entries}
              loading={state.loading}
              darkMode={darkMode}
              footnote={board.footnote}
            />
          )
        })}
      </div>

      <SeasonSection darkMode={darkMode} />
    </div>
  )
}
