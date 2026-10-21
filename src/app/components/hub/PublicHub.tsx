'use client'

import { useEffect, useState } from 'react'
import AskGuide from '@/app/components/hub/AskGuide'
import CommunityBuildsBrowser from '@/app/components/destiny/community/CommunityBuildsBrowser'
import BuildLookup from '@/app/components/hub/BuildLookup'
import GuardianDirectory from '@/app/components/hub/GuardianDirectory'
import LoadoutCompare from '@/app/components/hub/LoadoutCompare'
import QuestLookup from '@/app/components/hub/QuestLookup'
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
  if (tab === 'ask') return <AskGuide />
  if (tab === 'guardians') return <GuardianDirectory onLogin={onLogin} />
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
  if (tab === 'compare') return <LoadoutCompare />
  if (tab === 'lookup') return <BuildLookup />
  if (tab === 'quests') return <QuestLookup onLogin={onLogin} />

  const gated =
    tab === 'profile'
      ? {
          title: 'Your Guardian',
          body: 'Sign in so your clears earn points, your stamps save, and you can share a build.',
        }
      : {
          title: 'Sign in to continue',
          body: 'Sign in with Bungie so this page can use your characters and your clears.',
        }

  return <SignInGate title={gated.title} body={gated.body} onLogin={onLogin} />
}
