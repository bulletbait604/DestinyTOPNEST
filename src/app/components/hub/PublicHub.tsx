'use client'

import { useEffect, useState } from 'react'
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
import type { DestinyTopNestTab } from '@/lib/destiny/types'
import { DESTINY_TAB_NAV_EVENT, isDestinyTopNestTab, parseTabFromSearch } from '@/lib/routing/tabUrl'

export default function PublicHub({ onLogin }: { onLogin: () => void }) {
  const [tab, setTab] = useState<DestinyTopNestTab>('overview')

  useEffect(() => {
    const read = () => {
      const next = parseTabFromSearch(window.location.search)
      setTab(next === 'season' ? 'leaderboards' : next)
    }
    read()
    const onTab = (event: Event) => {
      const next = (event as CustomEvent<DestinyTopNestTab>).detail
      if (next && isDestinyTopNestTab(next)) setTab(next === 'season' ? 'leaderboards' : next)
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
  if (tab === 'leaderboards' || tab === 'season') return <HubLeaderboardPreview onLogin={onLogin} />
  if (tab === 'clans') return <HubClans />
  if (tab === 'sherpas') return <HubSherpas />
  if (tab === 'events') return <HubEvents />

  if (tab === 'history') {
    return (
      <SignInGate
        title="Activity history"
        body="Sign in with Bungie to sync every run still stored for your characters. The list, totals, and post-game reports stay on your account."
        onLogin={onLogin}
      />
    )
  }

  const gated =
    tab === 'profile'
      ? {
          title: 'Your Guardian',
          body: 'Passport stamps, loadouts, and your weekly progress open after you sign in with Bungie.',
        }
      : tab === 'loadouts' || tab === 'builds'
        ? {
            title: 'Builds',
            body: 'Saved loadouts and community builds are tied to your linked Guardian.',
          }
        : {
            title: 'Sign in to continue',
            body: 'That part of the hub is available on your account.',
          }

  return <SignInGate title={gated.title} body={gated.body} onLogin={onLogin} />
}
