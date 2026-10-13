'use client'

import { useEffect, useState } from 'react'
import CommunityBuildsBrowser from '@/app/components/destiny/community/CommunityBuildsBrowser'
import {
  ConnectedHome,
  HubClans,
  HubContracts,
  HubEvents,
  HubFireteams,
  HubLeaderboardPreview,
  HubSherpas,
  SignInGate,
} from '@/app/components/hub/HubPages'
import SeasonRulesPanel from '@/app/components/nest/SeasonRulesPanel'
import type { DestinyTopNestTab } from '@/lib/destiny/types'
import { DESTINY_TAB_NAV_EVENT, isDestinyTopNestTab, parseTabFromSearch } from '@/lib/routing/tabUrl'

export default function PublicHub({ onLogin }: { onLogin: () => void }) {
  const [tab, setTab] = useState<DestinyTopNestTab>('overview')

  useEffect(() => {
    const read = () => {
      const next = parseTabFromSearch(window.location.search)
      setTab(next)
    }
    read()
    const onTab = (event: Event) => {
      const next = (event as CustomEvent<DestinyTopNestTab>).detail
      if (next && isDestinyTopNestTab(next)) setTab(next)
    }
    window.addEventListener(DESTINY_TAB_NAV_EVENT, onTab)
    window.addEventListener('popstate', read)
    return () => {
      window.removeEventListener(DESTINY_TAB_NAV_EVENT, onTab)
      window.removeEventListener('popstate', read)
    }
  }, [])

  if (tab === 'overview') return <ConnectedHome onLogin={onLogin} />
  if (tab === 'fireteam') return <HubFireteams onLogin={onLogin} />
  if (tab === 'contracts') return <HubContracts />
  if (tab === 'leaderboards') return <HubLeaderboardPreview onLogin={onLogin} />
  if (tab === 'season') return <SeasonRulesPanel />
  if (tab === 'clans') return <HubClans />
  if (tab === 'sherpas') return <HubSherpas />
  if (tab === 'events') return <HubEvents />
  if (tab === 'loadouts' || tab === 'builds') {
    return <CommunityBuildsBrowser darkMode onLogin={onLogin} />
  }

  const gated =
    tab === 'profile'
      ? {
          title: 'Your Guardian',
          body: 'Passport stamps, loadouts, and your weekly progress open after you sign in with Bungie.',
        }
      : {
          title: 'Sign in to continue',
          body: 'That part of the hub is available on your account.',
        }

  return <SignInGate title={gated.title} body={gated.body} onLogin={onLogin} />
}
