'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { DestinyTopNestTab } from '@/lib/destiny/types'
import { BRAND_SHORT, BRAND_TAGLINE } from '@/lib/destiny/branding'
import {
  isDestinyTopNestTab,
  parseTabFromSearch,
  stripOAuthParams,
  syncTabToUrl,
} from '@/lib/routing/tabUrl'
import TopNestBrandBanner from '@/app/components/destiny/TopNestBrandBanner'
import { getDestinyTheme } from '@/app/components/destiny/destinyTheme'
import DestinyNav from '@/app/components/destiny/DestinyNav'
import OverviewPanel from '@/app/components/destiny/OverviewPanel'
import LeaderboardsPanel from '@/app/components/destiny/LeaderboardsPanel'
import FireteamPanel from '@/app/components/destiny/FireteamPanel'
import ProfilePanel from '@/app/components/destiny/ProfilePanel'
import ClansPanel from '@/app/components/destiny/ClansPanel'
import SeasonPanel from '@/app/components/destiny/SeasonPanel'
import AdminPanel from '@/app/components/destiny/AdminPanel'
import PlayerCardShell from '@/app/components/destiny/PlayerCardShell'
import { cn } from '@/lib/utils'

type ProfileView = 'guardian' | 'loadouts'
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
    setActiveTab(tab)
  }, [])

  useEffect(() => {
    if (restored.current) return
    restored.current = true

    const tab = parseTabFromSearch(window.location.search)
    if (isDestinyTopNestTab(tab)) {
      setActiveTab(tab)
      setProfileView(resolveProfileView(tab))
      setLoadoutSection(resolveLoadoutSection(tab))
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
        return <OverviewPanel darkMode={darkMode} />
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
        return <SeasonPanel darkMode={darkMode} />
      case 'admin':
        return <AdminPanel darkMode={darkMode} />
    }
  }

  return (
    <div className={cn('rounded-xl overflow-hidden ring-1 ring-white/[0.08] shadow-[0_20px_60px_rgba(0,0,0,0.45)]', theme.shell)}>
      <TopNestBrandBanner title={BRAND_SHORT} tagline={BRAND_TAGLINE} />

      <div className="px-4 sm:px-6 py-4 sm:py-5">
        <div className="flex flex-col xl:flex-row xl:items-start xl:gap-5 gap-3 mb-4">
          <PlayerCardShell darkMode={darkMode} />
          <div className="flex-1 min-w-0">
            <DestinyNav activeTab={activeTab} onTabChange={handleTabChange} darkMode={darkMode} showAdmin={isAdmin} />
          </div>
        </div>

        <div className="animate-in fade-in duration-300">{renderPanel()}</div>
      </div>
    </div>
  )
}
