'use client'

import AdminFireteamSection from '@/app/components/destiny/admin/AdminFireteamSection'
import FlierTeamFinderPanel from '@/app/components/destiny/FlierTeamFinderPanel'

/** Fireteams tab — FlierTeam Finder LFG rooms. */
export default function FireteamPanel({
  darkMode,
  isAdmin = false,
}: {
  darkMode: boolean
  isAdmin?: boolean
}) {
  return (
    <div className="space-y-6">
      {isAdmin ? <AdminFireteamSection darkMode={darkMode} compact /> : null}
      <FlierTeamFinderPanel darkMode={darkMode} />
    </div>
  )
}
