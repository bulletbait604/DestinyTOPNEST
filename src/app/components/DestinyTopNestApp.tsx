'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { DestinyTopNestTab } from '@/lib/destiny/types'
import {
  isDestinyTopNestTab,
  parseTabFromSearch,
  stripOAuthParams,
  syncTabToUrl,
  DESTINY_TAB_NAV_EVENT,
  DESTINY_PROFILE_NAV_EVENT,
  navigateProfileSection,
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
import HomeTopNestCallout from '@/app/components/destiny/HomeTopNestCallout'
import HomeSoloPreview from '@/app/components/destiny/HomeSoloPreview'
import LeaderboardRulesSection from '@/app/components/destiny/LeaderboardRulesSection'
import RunSyncToast from '@/app/components/destiny/RunSyncToast'
import NewcomerWelcomeModal from '@/app/components/destiny/NewcomerWelcomeModal'
import { ProfileDataProvider, useProfileData } from '@/contexts/ProfileDataContext'
import { OverviewDataProvider } from '@/contexts/OverviewDataContext'
import { useActiveCharacterSelect } from '@/hooks/useActiveCharacterSelect'
import { cn } from '@/lib/utils'
import HubErrorBoundary from '@/app/components/hub/HubErrorBoundary'
import { HubClans, HubContracts, HubEvents, HubSherpas } from '@/app/components/hub/HubPages'
import YourWeek from '@/app/components/hub/YourWeek'

type ProfileView = 'guardian' | 'passport' | 'activities' | 'loadouts'
type LoadoutSection = 'mine' | 'community' | 'builder'

interface Props {
  darkMode: boolean
  isAdmin?: boolean
  isOwner?: boolean
  userId?: string
  /** Page chrome already shows the Guardian Hub nav. */
  embedded?: boolean
}

function resolveProfileView(tab: DestinyTopNestTab): ProfileView {
  return tab === 'loadouts' || tab === 'builds' ? 'loadouts' : 'guardian'
}

function resolveLoadoutSection(tab: DestinyTopNestTab): LoadoutSection | undefined {
  if (tab === 'builds') return 'community'
  if (tab === 'loadouts') return 'mine'
  return undefined
}

const PROFILE_TABS = new Set<DestinyTopNestTab>(['profile', 'loadouts', 'builds'])

function ProfilePlayerBanner({
  darkMode,
  activeTab,
}: {
  darkMode: boolean
  activeTab: DestinyTopNestTab
}) {
  const { fullProfile } = useProfileData()
  const { selectCharacter, switchingCharacter } = useActiveCharacterSelect()
  const selectable = PROFILE_TABS.has(activeTab)

  return (
    <PlayerCardShell
      darkMode={darkMode}
      size="featured"
      selectable={selectable}
      onCharacterSelect={(id) => void selectCharacter(id)}
      switchingCharacter={switchingCharacter}
      subtitleFor={(character) =>
        character.characterId === fullProfile?.activeCharacterId && fullProfile?.currentLoadout?.subclass
          ? fullProfile.currentLoadout.subclass
          : undefined
      }
    />
  )
}

export default function DestinyTopNestApp({
  darkMode,
  isAdmin = false,
  isOwner = false,
  userId,
  embedded = false,
}: Props) {
  const [activeTab, setActiveTab] = useState<DestinyTopNestTab>('overview')
  const [profileView, setProfileView] = useState<ProfileView>('guardian')
  const [loadoutSection, setLoadoutSection] = useState<LoadoutSection | undefined>()
  const theme = getDestinyTheme(darkMode)
  const restored = useRef(false)
  const skipUrlSync = useRef(true)
  const [profilePanelMounted, setProfilePanelMounted] = useState(false)

  const handleTabChange = useCallback((tab: DestinyTopNestTab) => {
    if (tab === 'admin' && !isAdmin) return
    if (tab === 'profile') {
      setProfileView('guardian')
      setLoadoutSection(undefined)
    }
    if (tab === 'loadouts') {
      setProfileView('loadouts')
      setLoadoutSection('mine')
    }
    setActiveTab(tab)
  }, [isAdmin])

  const navigateToProfileActivities = useCallback(() => {
    navigateProfileSection('activities')
  }, [])

  useEffect(() => {
    if (restored.current) return
    restored.current = true

    const tab = parseTabFromSearch(window.location.search)
    if (isDestinyTopNestTab(tab)) {
      const resolved = tab === 'season' ? 'leaderboards' : tab
      if (resolved === 'admin' && !isAdmin) {
        setActiveTab('overview')
      } else {
        setActiveTab(resolved)
        setProfileView(resolveProfileView(resolved))
        setLoadoutSection(resolveLoadoutSection(resolved))
        if (PROFILE_TABS.has(resolved)) {
          setProfilePanelMounted(true)
        }
      }
    }
    stripOAuthParams()
  }, [isAdmin])

  useEffect(() => {
    const onProfileNav = (event: Event) => {
      const view = (event as CustomEvent<ProfileView>).detail
      if (view !== 'guardian' && view !== 'passport' && view !== 'activities' && view !== 'loadouts') return
      setProfileView(view)
      setLoadoutSection(undefined)
      setActiveTab('profile')
      setProfilePanelMounted(true)
      syncTabToUrl('profile')
    }

    window.addEventListener(DESTINY_PROFILE_NAV_EVENT, onProfileNav)
    return () => window.removeEventListener(DESTINY_PROFILE_NAV_EVENT, onProfileNav)
  }, [])

  useEffect(() => {
    const onTabNav = (event: Event) => {
      const tab = (event as CustomEvent<DestinyTopNestTab>).detail
      if (!tab || !isDestinyTopNestTab(tab)) return
      if (tab === 'admin' && !isAdmin) return
      handleTabChange(tab)
    }

    window.addEventListener(DESTINY_TAB_NAV_EVENT, onTabNav)
    return () => window.removeEventListener(DESTINY_TAB_NAV_EVENT, onTabNav)
  }, [isAdmin, handleTabChange])

  useEffect(() => {
    if (!restored.current) return
    if (skipUrlSync.current) {
      skipUrlSync.current = false
      return
    }
    syncTabToUrl(activeTab)
  }, [activeTab])

  useEffect(() => {
    if (PROFILE_TABS.has(activeTab)) {
      setProfilePanelMounted(true)
    }
  }, [activeTab])

  function renderPanel() {
    const isProfileTab = PROFILE_TABS.has(activeTab)

    return (
      <>
        {profilePanelMounted ? (
          <div className={cn(!isProfileTab && 'hidden')} aria-hidden={!isProfileTab}>
            <ProfilePanel
              darkMode={darkMode}
              initialView={profileView}
              initialLoadoutSection={loadoutSection}
            />
          </div>
        ) : null}

        {!isProfileTab ? (
          <div className="animate-in fade-in duration-300 min-w-0">{renderMainPanel()}</div>
        ) : null}
      </>
    )
  }

  function renderMainPanel() {
    switch (activeTab) {
      case 'overview':
        return (
          <>
            <HubErrorBoundary label="your week">
              <YourWeek />
            </HubErrorBoundary>
            <OverviewPanel darkMode={darkMode} onGoToActivities={navigateToProfileActivities} />
          </>
        )
      case 'leaderboards':
        return <LeaderboardsPanel darkMode={darkMode} />
      case 'fireteam':
        return <FireteamPanel darkMode={darkMode} isAdmin={isAdmin} />
      case 'profile':
      case 'loadouts':
      case 'builds':
        return null
      case 'clans':
        return (
          <>
            <HubClans />
            <ClansPanel darkMode={darkMode} />
          </>
        )
      case 'contracts':
        return <HubContracts />
      case 'sherpas':
        return <HubSherpas />
      case 'events':
        return <HubEvents />
      case 'season':
        return <LeaderboardsPanel darkMode={darkMode} />
      case 'admin':
        return isAdmin ? (
          <AdminPanel darkMode={darkMode} isAdmin isOwner={isOwner} />
        ) : (
          <AdminPanel darkMode={darkMode} isAdmin={false} isOwner={false} />
        )
    }
  }

  const hubTab = activeTab === 'overview' || activeTab === 'contracts' || activeTab === 'sherpas' || activeTab === 'events' || activeTab === 'clans'
  const showTopNestCallout = activeTab === 'overview' && !embedded
  const showLeaderboardRules = activeTab === 'leaderboards' || activeTab === 'season'
  const showHero = !embedded || !hubTab
  const showPlayerCard = !embedded || PROFILE_TABS.has(activeTab)
  const heroAside = showTopNestCallout ? <HomeSoloPreview darkMode={darkMode} /> : undefined

  return (
    <OverviewDataProvider>
      <ProfileDataProvider>
        {userId ? <NewcomerWelcomeModal darkMode={darkMode} userId={userId} /> : null}
        <div className={cn(!embedded && 'rounded-xl overflow-hidden ring-1 ring-white/[0.08] shadow-[0_20px_60px_rgba(0,0,0,0.45)]', !embedded && theme.shell)}>
        <RunSyncToast darkMode={darkMode} />
        <div className={cn('space-y-4', !embedded && 'px-3 sm:px-5 pb-4 sm:pb-5 pt-3 sm:pt-4')}>
          {embedded ? null : (
            <DestinyNav activeTab={activeTab} onTabChange={handleTabChange} darkMode={darkMode} showAdmin={isAdmin} />
          )}
          <TabShellAlerts darkMode={darkMode} />
          {showHero ? <TabPageHero tab={activeTab} aside={heroAside} /> : null}
          {showPlayerCard ? (
            <div className="d2-player-card-featured">
              <ProfilePlayerBanner darkMode={darkMode} activeTab={activeTab} />
            </div>
          ) : null}
          {showLeaderboardRules ? <LeaderboardRulesSection darkMode={darkMode} /> : null}
          {showTopNestCallout ? <HomeTopNestCallout darkMode={darkMode} /> : null}
          <div className="min-w-0">{renderPanel()}</div>
        </div>
        </div>
      </ProfileDataProvider>
    </OverviewDataProvider>
  )
}
