'use client'

import { useCallback, useState } from 'react'
import { ShieldAlert } from 'lucide-react'
import AdminActivitySection from '@/app/components/destiny/admin/AdminActivitySection'
import AdminLeaderboardsSection from '@/app/components/destiny/admin/AdminLeaderboardsSection'
import AdminRunReviewSection from '@/app/components/destiny/admin/AdminRunReviewSection'
import AdminSeasonSection from '@/app/components/destiny/admin/AdminSeasonSection'
import AdminUsersSection from '@/app/components/destiny/admin/AdminUsersSection'
import { GlassCard, SegmentedControl, SectionTitle } from '@/app/components/destiny/DestinyUi'
import { getDestinyTheme } from '@/app/components/destiny/destinyTheme'
import { cn } from '@/lib/utils'

type AdminSection = 'activity' | 'runs' | 'users' | 'leaderboards' | 'season'

const SECTIONS: { value: AdminSection; label: string }[] = [
  { value: 'activity', label: 'Activity feed' },
  { value: 'runs', label: 'Run review' },
  { value: 'users', label: 'Users' },
  { value: 'leaderboards', label: 'Leaderboards' },
  { value: 'season', label: 'Season & prizes' },
]

export default function AdminPanel({
  darkMode,
  isAdmin = false,
}: {
  darkMode: boolean
  isAdmin?: boolean
}) {
  const [section, setSection] = useState<AdminSection>('activity')
  const [feedKey, setFeedKey] = useState(0)
  const t = getDestinyTheme(darkMode)

  const refreshFeed = useCallback(() => {
    setFeedKey((k) => k + 1)
  }, [])

  if (!isAdmin) {
    return (
      <GlassCard darkMode={darkMode}>
        <div className="flex items-center gap-2 mb-2">
          <ShieldAlert className="w-5 h-5 text-red-400" />
          <SectionTitle title="Staff only" subtitle="This area is restricted to site admins." darkMode={darkMode} />
        </div>
        <p className={cn('text-sm', t.muted)}>You do not have permission to view the admin console.</p>
      </GlassCard>
    )
  }

  return (
    <div className="space-y-4">
      <GlassCard darkMode={darkMode}>
        <SectionTitle
          title="Admin console"
          subtitle="Review runs, moderate users, adjust leaderboards, and monitor activity"
          darkMode={darkMode}
        />
        <div className="mt-4">
          <SegmentedControl
            label="Section"
            options={SECTIONS}
            value={section}
            onChange={setSection}
            darkMode={darkMode}
          />
        </div>
      </GlassCard>

      {section === 'activity' ? <AdminActivitySection key={feedKey} darkMode={darkMode} /> : null}
      {section === 'runs' ? (
        <AdminRunReviewSection darkMode={darkMode} onReviewed={refreshFeed} />
      ) : null}
      {section === 'users' ? (
        <AdminUsersSection darkMode={darkMode} onAction={refreshFeed} />
      ) : null}
      {section === 'leaderboards' ? (
        <AdminLeaderboardsSection darkMode={darkMode} onAction={refreshFeed} />
      ) : null}
      {section === 'season' ? (
        <AdminSeasonSection darkMode={darkMode} onAction={refreshFeed} />
      ) : null}
    </div>
  )
}
