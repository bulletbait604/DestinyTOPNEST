'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { DestinyTopNestTab } from '@/lib/destiny/types'
import {
  isDestinyTopNestTab,
  parseTabFromSearch,
  stripOAuthParams,
  syncTabToUrl,
} from '@/lib/routing/tabUrl'
import { getDestinyTheme } from '@/app/components/destiny/destinyTheme'
import DestinyNav from '@/app/components/destiny/DestinyNav'
import OverviewPanel from '@/app/components/destiny/OverviewPanel'
import LeaderboardsPanel from '@/app/components/destiny/LeaderboardsPanel'
import FireteamPanel from '@/app/components/destiny/FireteamPanel'
import ProfilePanel from '@/app/components/destiny/ProfilePanel'
import ClansPanel from '@/app/components/destiny/ClansPanel'
import AdminPanel from '@/app/components/destiny/AdminPanel'
import PlayerCardShell from '@/app/components/destiny/PlayerCardShell'
import TabPageHero from '@/app/components/destiny/TabPageHero'
import TabShellAlerts from '@/app/components/destiny/TabShellAlerts'
import HomeSoloPreview from '@/app/components/destiny/HomeSoloPreview'
import { cn } from '@/lib/utils'

type ProfileView = 'guardian' | 'activities' | 'loadouts'
type LoadoutSection = 'mine' | 'community' | 'builder'

interface Props {
  darkMode: boolean
  isAdmin?: boolean
}

function resolveProfileView(tab: DestinyTopNestTab): ProfileView {
  return tab === 'loadouts' || tab === 'builds' ? 'loadouts' : 'guardian'
}

function resolveLoadoutSection(tab: DestinyTopNestTab): LoadoutSection | undefined {
  if (tab === 'builds') return 'community'
  if (tab === 'loadouts') return 'mine'
  return undefined
}

export default function DestinyTopNestApp({ darkMode, isAdmin = false }: Props) {
  const [activeTab, setActiveTab] = useState<DestinyTopNestTab>('overview')
  const [profileView, setProfileView] = useState<ProfileView>('guardian')
  const [loadoutSection, setLoadoutSection] = useState<LoadoutSection | undefined>()
  const theme = getDestinyTheme(darkMode)
  const restored = useRef(false)
  const skipUrlSync = useRef(true)

  const handleTabChange = useCallback((tab: DestinyTopNestTab) => {
    if (tab === 'profile') {
      setProfileView('guardian')
      setLoadoutSection(undefined)
    }
    if (tab === 'loadouts') {
      setProfileView('loadouts')
      setLoadoutSection('mine')
    }
    setActiveTab(tab)
  }, [])

  const navigateToProfileActivities = useCallback(() => {
    setProfileView('activities')
    setLoadoutSection(undefined)
    setActiveTab('profile')
  }, [])

  useEffect(() => {
    if (restored.current) return
    restored.current = true

    const tab = parseTabFromSearch(window.location.search)
    if (isDestinyTopNestTab(tab)) {
      setActiveTab(tab === 'season' ? 'leaderboards' : tab)
      const resolved = tab === 'season' ? 'leaderboards' : tab
      setProfileView(resolveProfileView(resolved))
      setLoadoutSection(resolveLoadoutSection(resolved))
    }
    stripOAuthParams()
  }, [])

  useEffect(() => {
    if (!restored.current) return
    if (skipUrlSync.current) {
      skipUrlSync.current = false
      return
    }
    syncTabToUrl(activeTab)
  }, [activeTab])

  function renderPanel() {
    switch (activeTab) {
      case 'overview':
        return <OverviewPanel darkMode={darkMode} onGoToActivities={navigateToProfileActivities} />
      case 'leaderboards':
        return <LeaderboardsPanel darkMode={darkMode} />
      case 'fireteam':
        return <FireteamPanel darkMode={darkMode} />
      case 'profile':
      case 'loadouts':
      case 'builds':
        return (
          <ProfilePanel
            darkMode={darkMode}
            initialView={profileView}
            initialLoadoutSection={loadoutSection}
          />
        )
      case 'clans':
        return <ClansPanel darkMode={darkMode} />
      case 'season':
        return <LeaderboardsPanel darkMode={darkMode} />
      case 'admin':
        return <AdminPanel darkMode={darkMode} />
    }
  }

  const heroAside =
    activeTab === 'overview' ? <HomeSoloPreview darkMode={darkMode} /> : undefined

  return (
    <div className={cn('rounded-xl overflow-hidden ring-1 ring-white/[0.08] shadow-[0_20px_60px_rgba(0,0,0,0.45)]', theme.shell)}>
      <div className="px-3 sm:px-5 pb-4 sm:pb-5 pt-3 sm:pt-4 space-y-4">
        <DestinyNav activeTab={activeTab} onTabChange={handleTabChange} darkMode={darkMode} showAdmin={isAdmin} />
        <TabShellAlerts darkMode={darkMode} />
        <TabPageHero tab={activeTab} aside={heroAside} />
        <div className="d2-player-card-featured">
          <PlayerCardShell darkMode={darkMode} size="featured" />
        </div>
        <div className="animate-in fade-in duration-300 min-w-0">{renderPanel()}</div>
      </div>
    </div>
  )
}
